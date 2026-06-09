import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename, relative, join, sep, parse as parsePath } from 'node:path'
import defu from 'defu'
import { runTransformers } from '../transformers/index.ts'
import { createPlaintext } from '../plaintext.ts'
import { stripForHtml, stripForPlaintext } from '../utils/output-markers.ts'
import { _setCurrentTemplate } from '../composables/useCurrentTemplate.ts'
import { cloneConfig } from '../utils/cloneConfig.ts'
import type { EventManager } from '../events/index.ts'
import type { Renderer } from './createRenderer.ts'
import type { MaizzleConfig } from '../types/index.ts'

export interface BuildTemplateContext {
  config: MaizzleConfig
  renderer: Renderer
  events: EventManager
  outputPath: string
  outputExtension: string
  contentBase: string
}

export interface BuildTemplateResult {
  /** Output files written for this template (html + optional plaintext). */
  files: string[]
  /**
   * Number of SFC-registered `afterBuild` handlers seen while rendering. They
   * only fire once at end of build on the main thread, so a worker can't run
   * them — the count lets the orchestrator warn instead of silently dropping.
   */
  sfcAfterBuildCount: number
}

/**
 * Render a single template through the full pipeline and write its output.
 *
 * Shared by the sequential build loop and the parallel build worker so both
 * paths produce byte-identical output. `events` is the manager the per-template
 * events fire on (config handlers registered via `registerConfig`, SFC handlers
 * registered here from the render). The caller owns build-scoped events
 * (`beforeCreate`/`afterBuild`).
 */
export async function buildTemplate(
  templatePath: string,
  ctx: BuildTemplateContext,
): Promise<BuildTemplateResult> {
  const { config, renderer, events, outputPath, outputExtension, contentBase } = ctx
  const absolutePath = resolve(templatePath)
  const parsedPath = parsePath(absolutePath)
  const template = { source: readFileSync(absolutePath, 'utf-8'), path: parsedPath }
  const files: string[] = []
  let sfcAfterBuildCount = 0

  _setCurrentTemplate(parsedPath)

  try {
    /**
     * Clone config per template so beforeRender mutations (setting a
     * preheader, injecting fetched data, etc.) stay scoped to this template
     * instead of leaking into later ones through the shared config object.
     */
    const renderConfig = cloneConfig(config)
    const originalSource = template.source

    await events.fireBeforeRender({ config: renderConfig, template })

    const rendered = await renderer.render(
      absolutePath,
      renderConfig,
      template.source !== originalSource ? { source: template.source } : undefined,
    )

    /**
     * Register SFC event handlers collected during render so they take part in
     * the post-render events. Cleared at the end of this call so they don't
     * leak into the next template (afterBuild is the exception — it's never
     * cleared by clearSfcHandlers; see the count above).
     */
    for (const { name, handler } of rendered.sfcEventHandlers) {
      if (name === 'afterBuild') sfcAfterBuildCount++
      events.on(name, handler)
    }

    const templateConfig = rendered.templateConfig

    let html = await events.fireAfterRender({ config: templateConfig, template, html: rendered.html })

    const doctype = rendered.doctype ?? templateConfig.doctype ?? '<!DOCTYPE html>'

    if (templateConfig.useTransformers !== false) {
      html = await runTransformers(html, templateConfig, absolutePath, doctype, rendered.tailwindBlocks)
    }

    html = await events.fireAfterTransform({ config: templateConfig, template, html })
    if (doctype) html = `${doctype}\n${html}`

    const htmlOut = stripForHtml(html)
    const sfcOutputPath = rendered.outputPath
    let outputFilePath: string

    if (sfcOutputPath) {
      const parsed = parsePath(resolve(sfcOutputPath))
      const ext = parsed.ext ? parsed.ext.slice(1) : outputExtension
      outputFilePath = join(parsed.dir, `${parsed.name}.${ext}`)
    } else {
      outputFilePath = resolveOutputPath(templatePath, outputPath, outputExtension, contentBase)
    }

    mkdirSync(dirname(outputFilePath), { recursive: true })
    writeFileSync(outputFilePath, htmlOut)
    files.push(outputFilePath)

    // Generate plaintext version if configured
    const globalPlaintext = templateConfig.plaintext
    const sfcPlaintext = rendered.plaintext

    if (globalPlaintext || sfcPlaintext) {
      const globalCfg = typeof globalPlaintext === 'object' ? globalPlaintext : {}
      const stripOptions = defu(sfcPlaintext?.options, globalCfg.options)
      const plaintext = createPlaintext(stripForPlaintext(html), stripOptions)
      const ptExtension = sfcPlaintext?.extension ?? globalCfg.extension ?? 'txt'

      let ptOutputPath: string

      if (sfcPlaintext?.destination) {
        ptOutputPath = resolveOutputPath(templatePath, resolve(sfcPlaintext.destination), ptExtension, contentBase)
      } else if (sfcOutputPath) {
        const parsed = parsePath(outputFilePath)
        ptOutputPath = join(parsed.dir, `${parsed.name}.${ptExtension}`)
      } else if (globalCfg.destination) {
        ptOutputPath = resolveOutputPath(templatePath, resolve(globalCfg.destination), ptExtension, contentBase)
      } else {
        ptOutputPath = resolveOutputPath(templatePath, outputPath, ptExtension, contentBase)
      }

      mkdirSync(dirname(ptOutputPath), { recursive: true })
      writeFileSync(ptOutputPath, plaintext)
      files.push(ptOutputPath)
    }
  } finally {
    _setCurrentTemplate(undefined)
    events.clearSfcHandlers()
  }

  return { files, sfcAfterBuildCount }
}

/**
 * Extract the static (non-glob) prefix from content patterns.
 *
 * For example, `['/abs/path/emails/**\/*.vue']` → `'/abs/path/emails'`
 *
 * Used to strip the content base from template paths so the output preserves
 * only the subdirectory structure.
 *
 * With multiple positive patterns (multi-root setups), returns their common
 * ancestor directory so templates from every root keep a clean relative path.
 */
export function computeContentBase(patterns: string[]): string {
  const positives = patterns.filter(p => !p.startsWith('!'))
  const sources = positives.length > 0 ? positives : patterns

  const bases = sources.map((pattern) => {
    // Split on first glob character (* { ? [) and take the directory part
    const staticPart = pattern.split(/[*{?[]/)[0]
    // Ensure we have a clean directory path (not a partial segment)
    return resolve(staticPart.endsWith('/') ? staticPart : dirname(staticPart))
  })

  return bases.reduce(commonPath)
}

/** Longest common directory path shared by two absolute paths. */
function commonPath(a: string, b: string): string {
  const aSegments = a.split(sep)
  const bSegments = b.split(sep)
  const shared: string[] = []

  for (let i = 0; i < Math.min(aSegments.length, bSegments.length); i++) {
    if (aSegments[i] !== bSegments[i]) break
    shared.push(aSegments[i])
  }

  return shared.join(sep) || sep
}

export function resolveOutputPath(templatePath: string, outputDir: string, extension: string, contentBase: string): string {
  const name = basename(templatePath).replace(/\.(vue|md)$/, '')
  const absTemplate = resolve(templatePath)
  const rel = relative(contentBase, dirname(absTemplate))

  return join(outputDir, rel, `${name}.${extension}`)
}
