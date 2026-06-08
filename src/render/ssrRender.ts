import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createHead } from '@unhead/vue/server'
import { defu as merge } from 'defu'
import type { Component, InjectionKey } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'
import type { RenderContext } from '../composables/renderContext.ts'

export interface RenderedTemplate {
  html: string
  doctype?: string
  templateConfig: MaizzleConfig
  sfcEventHandlers: RenderContext['sfcEventHandlers']
  plaintext?: RenderContext['plaintext']
  outputPath?: RenderContext['outputPath']
  tailwindBlocks?: RenderContext['tailwindBlocks']
}

/**
 * Isomorphic Vue SSR render: take a resolved component + config and produce
 * the rendered HTML plus the render-context side-channel. Shared by the
 * Node renderer (SFCs compiled via Vite) and the browser/edge renderer
 * (SFCs compiled in-process). No Node APIs — depends only on Vue's SSR
 * runtime and the in-memory DOM utils.
 *
 * `keys` are the `provide`/`inject` keys for config + render context. They
 * MUST be the same Symbol instances the rendered component's composables
 * inject, so the caller passes whichever module instance compiled the SFC.
 */
export async function ssrRender(
  component: Component,
  config: MaizzleConfig,
  keys: {
    configKey: InjectionKey<MaizzleConfig>
    contextKey: InjectionKey<RenderContext>
    /**
     * Components to register globally before render, keyed by tag name.
     * Used by the browser renderer to make built-in + user components
     * resolvable by name (the Node renderer relies on Vite/unplugin instead).
     */
    globalComponents?: Record<string, Component>
  },
): Promise<RenderedTemplate> {
  const renderContext: RenderContext = {
    doctype: undefined,
    sfcConfig: undefined,
    sfcEventHandlers: [],
  }

  const head = createHead({ disableDefaults: true })
  const app = createSSRApp(component)
  app.use(head)

  if (keys.globalComponents) {
    for (const [name, comp] of Object.entries(keys.globalComponents)) {
      app.component(name, comp)
    }
  }

  // Register user Vue plugins, directives, and global properties
  if (config.vue) {
    const plugins = typeof config.vue.plugins === 'function'
      ? config.vue.plugins()
      : config.vue.plugins ?? []
    for (const plugin of plugins) {
      app.use(plugin)
    }
    for (const [name, directive] of Object.entries(config.vue.directives ?? {})) {
      app.directive(name, directive)
    }
    Object.assign(app.config.globalProperties, config.vue.globalProperties)
  }

  app.provide(keys.configKey, config)
  app.provide(keys.contextKey, renderContext)

  const ssrContext: Record<string, any> = {}
  let html: string = await renderToString(app, ssrContext)

  const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = head.render()

  // Inject head entries into the rendered HTML
  if (htmlAttrs) {
    html = html.replace(/<html([^>]*)>/, `<html$1 ${htmlAttrs}>`)
  }
  if (headTags) {
    html = html.replace('</head>', `${headTags}\n</head>`)
  }
  if (bodyAttrs) {
    html = html.replace(/<body([^>]*)>/, `<body$1 ${bodyAttrs}>`)
  }
  if (bodyTagsOpen) {
    html = html.replace(/<body([^>]*)>/, `<body$1>\n${bodyTagsOpen}`)
  }
  if (bodyTags) {
    html = html.replace('</body>', `${bodyTags}\n</body>`)
  }

  // Inject SSR teleport content into their target elements
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

  // Inject preheader text from usePreheader() composable
  if (renderContext.preheader) {
    const { text, fillerCount } = renderContext.preheader
    // U+2007 figure space, U+FEFF BOM, U+034F combining grapheme joiner, space
    const filler = String.fromCharCode(0x2007, 0xFEFF, 0x034F, 0x20).repeat(fillerCount)
    const nbsp = String.fromCharCode(0xA0)
    const previewHtml = `<div style="display:none">${text}${filler}${nbsp}</div>`
    html = html.replace(/<body([^>]*)>/, `<body$1>${previewHtml}`)
  }

  /**
   * Strip Vue SSR fragment markers + teleport anchor comments. These
   * are rendering hygiene, not transformer concerns — must run
   * regardless of `useTransformers` state. Fragment markers contain
   * `-->`, which would prematurely terminate MSO conditional
   * comments downstream.
   */
  html = html
    .replaceAll('<!--[-->', '')
    .replaceAll('<!--]-->', '')
    .replaceAll('<!--teleport start anchor-->', '')
    .replaceAll('<!--teleport anchor-->', '')
    .replaceAll('<!--teleport start-->', '')
    .replaceAll('<!--teleport end-->', '')

  return {
    html,
    doctype: renderContext.doctype,
    /**
     * Layer sfcConfig over config — sfcConfig is a partial override
     * emitted by composables (defineConfig, useTransformers, etc.).
     * A naive replacement (`sfcConfig ?? config`) drops defaults
     * from the resolved config when the SFC only sets a single
     * key, since the composables' inject() of globalConfig can
     * return `{}` in dev when ssrLoadModule and the SFC's
     * auto-imported module resolve to different module
     * instances (different Symbols).
     */
    templateConfig: renderContext.sfcConfig ? merge(renderContext.sfcConfig, config) : config,
    sfcEventHandlers: renderContext.sfcEventHandlers,
    plaintext: renderContext.plaintext,
    outputPath: renderContext.outputPath,
    tailwindBlocks: renderContext.tailwindBlocks,
  }
}
