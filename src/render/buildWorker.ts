import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname, basename, relative, join } from 'node:path'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createHead } from '@unhead/vue/server'
import { defu as merge } from 'defu'
import defu from 'defu'
import { runTransformers } from '../transformers/index.ts'
import { createPlaintext } from '../plaintext.ts'
import { stripForHtml, stripForPlaintext } from '../utils/output-markers.ts'
import type { MaizzleConfig } from '../types/index.ts'
import type { RenderContext } from '../composables/renderContext.ts'
import type { EventName, EventMap } from '../events/index.ts'

interface WorkerTask {
  bundlePath: string
  templatePath: string
  config: MaizzleConfig
  outputPath: string
  outputExtension: string
  contentBase: string
}

interface WorkerResult {
  outputFile: string
  /** Build-scoped SFC handlers cannot cross threads — count returned for diagnostics. */
  droppedAfterBuildHandlers: number
}

interface BundleModule {
  templates: Record<string, any>
  configKey: symbol
  contextKey: symbol
}

let bundlePromise: Promise<BundleModule> | null = null

async function loadBundle(bundlePath: string): Promise<BundleModule> {
  if (!bundlePromise) bundlePromise = import(bundlePath)
  return bundlePromise
}

async function fireSfcHandlers<K extends EventName>(
  name: K,
  handlers: Array<{ name: EventName; handler: EventMap[EventName] }>,
  initial: Parameters<EventMap[K]>[0],
  hasReturnValue: boolean,
): Promise<any> {
  let value: any = initial
  for (const entry of handlers) {
    if (entry.name !== name) continue
    const result = await (entry.handler as any)(value)
    if (hasReturnValue && typeof result === 'string') {
      value = { ...value, ...(name === 'beforeRender' ? { template: result } : { html: result }) }
    }
  }
  return hasReturnValue ? (name === 'beforeRender' ? value.template : value.html) : undefined
}

function resolveOutputPath(templatePath: string, outputDir: string, extension: string, contentBase: string): string {
  const name = basename(templatePath).replace(/\.(vue|md)$/, '')
  const absTemplate = resolve(templatePath)
  const rel = relative(contentBase, dirname(absTemplate))
  return join(outputDir, rel, `${name}.${extension}`)
}

export default async function task(req: WorkerTask): Promise<WorkerResult> {
  const { bundlePath, templatePath, config, outputPath, outputExtension, contentBase } = req
  const bundle = await loadBundle(bundlePath)

  const component = bundle.templates[templatePath]
  if (!component) {
    throw new Error(`No bundled component for ${templatePath}`)
  }

  const renderContext: RenderContext = {
    doctype: undefined,
    sfcConfig: undefined,
    sfcEventHandlers: [],
  }

  const head = createHead({ disableDefaults: true })
  const app = createSSRApp(component)
  app.use(head)

  if (config.vue) {
    for (const plugin of config.vue.plugins ?? []) {
      app.use(plugin)
    }
    for (const [name, directive] of Object.entries(config.vue.directives ?? {})) {
      app.directive(name, directive)
    }
    Object.assign(app.config.globalProperties, config.vue.globalProperties)
  }

  app.provide(bundle.configKey, config)
  app.provide(bundle.contextKey, renderContext)

  const ssrContext: Record<string, any> = {}
  let html = await renderToString(app, ssrContext)

  const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = head.render()

  if (htmlAttrs) html = html.replace(/<html([^>]*)>/, `<html$1 ${htmlAttrs}>`)
  if (headTags) html = html.replace('</head>', `${headTags}\n</head>`)
  if (bodyAttrs) html = html.replace(/<body([^>]*)>/, `<body$1 ${bodyAttrs}>`)
  if (bodyTagsOpen) html = html.replace(/<body([^>]*)>/, `<body$1>\n${bodyTagsOpen}`)
  if (bodyTags) html = html.replace('</body>', `${bodyTags}\n</body>`)

  const hasTeleports = ssrContext.teleports && Object.keys(ssrContext.teleports).length > 0
  const hasFonts = (renderContext.fonts?.length ?? 0) > 0

  if (hasTeleports || hasFonts) {
    const { parse: parseDom, serialize: serializeDom, walk } = await import('../utils/ast/index.ts')
    let dom = parseDom(html)

    if (hasTeleports) {
      for (const [rawTarget, content] of Object.entries(ssrContext.teleports) as [string, string][]) {
        if (!content) continue

        const prepend = rawTarget.endsWith(':start')
        const target = prepend ? rawTarget.slice(0, -6) : rawTarget
        const targetChildren = parseDom(content)

        walk(dom, (node) => {
          const el = node as import('domhandler').Element
          if (!el.name) return
          const matched
            = target === el.name
            || (target.startsWith('#') && el.attribs?.id === target.slice(1))
            || (target.startsWith('.') && el.attribs?.class?.split(/\s+/).includes(target.slice(1)))
          if (matched) {
            for (const child of targetChildren) {
              child.parent = el as any
            }
            el.children = prepend
              ? [...targetChildren, ...(el.children || [])] as any
              : [...(el.children || []), ...targetChildren] as any
          }
        })
      }
    }

    if (hasFonts) {
      const { injectFonts } = await import('./injectFonts.ts')
      injectFonts(dom, renderContext.fonts!, parseDom, walk)
    }

    html = serializeDom(dom)
  }

  if (renderContext.preheader) {
    const { text, fillerCount, shyCount } = renderContext.preheader
    const filler = ' ͏ '.repeat(fillerCount)
    const shys = '­ '.repeat(shyCount)
    const previewHtml = `<div style="display:none">${text}${filler}${shys} </div>`
    html = html.replace(/<body([^>]*)>/, `<body$1>${previewHtml}`)
  }

  html = html
    .replaceAll('<!--[-->', '')
    .replaceAll('<!--]-->', '')
    .replaceAll('<!--teleport start anchor-->', '')
    .replaceAll('<!--teleport anchor-->', '')
    .replaceAll('<!--teleport start-->', '')
    .replaceAll('<!--teleport end-->', '')

  const templateConfig = renderContext.sfcConfig ? merge(renderContext.sfcConfig, config) : config
  const doctype = renderContext.doctype ?? templateConfig.doctype ?? '<!DOCTYPE html>'

  // Per-template events: only SFC handlers fire in workers (config functions
  // don't cross thread boundaries). Build-scoped (afterBuild) is reported
  // back so main thread can warn if any were dropped.
  let droppedAfterBuildHandlers = 0
  for (const entry of renderContext.sfcEventHandlers) {
    if (entry.name === 'afterBuild') droppedAfterBuildHandlers++
  }

  html = await fireSfcHandlers(
    'afterRender',
    renderContext.sfcEventHandlers,
    { config, template: '', html },
    true,
  ) ?? html

  if (templateConfig.useTransformers !== false) {
    html = await runTransformers(html, templateConfig, templatePath, doctype, renderContext.tailwindBlocks)
  }

  html = await fireSfcHandlers(
    'afterTransform',
    renderContext.sfcEventHandlers,
    { config, template: '', html },
    true,
  ) ?? html

  html = `${doctype}\n${html}`

  const htmlOut = stripForHtml(html)
  const outputFilePath = resolveOutputPath(templatePath, outputPath, outputExtension, contentBase)
  mkdirSync(dirname(outputFilePath), { recursive: true })
  writeFileSync(outputFilePath, htmlOut)

  const globalPlaintext = templateConfig.plaintext
  const sfcPlaintext = renderContext.plaintext

  if (globalPlaintext || sfcPlaintext) {
    const globalCfg = typeof globalPlaintext === 'object' ? globalPlaintext : {}
    const stripOptions = defu(sfcPlaintext?.options, globalCfg.options)
    const plaintext = createPlaintext(stripForPlaintext(html), stripOptions)
    const ptExtension = sfcPlaintext?.extension ?? globalCfg.extension ?? 'txt'

    let ptOutputPath: string
    if (sfcPlaintext?.destination) {
      const name = basename(templatePath).replace(/\.(vue|md)$/, '')
      ptOutputPath = join(resolve(sfcPlaintext.destination), `${name}.${ptExtension}`)
    } else if (globalCfg.destination) {
      ptOutputPath = resolveOutputPath(templatePath, resolve(globalCfg.destination), ptExtension, contentBase)
    } else {
      ptOutputPath = resolveOutputPath(templatePath, outputPath, ptExtension, contentBase)
    }

    mkdirSync(dirname(ptOutputPath), { recursive: true })
    writeFileSync(ptOutputPath, plaintext)
  }

  return { outputFile: outputFilePath, droppedAfterBuildHandlers }
}
