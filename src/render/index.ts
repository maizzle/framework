import { resolve, extname } from 'node:path'
import { resolveConfig } from '../config/index.ts'
import { runTransformers } from '../transformers/index.ts'
import { createPlaintext } from '../plaintext.ts'
import type { Component } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'
import { createRenderer, type Renderer } from './createRenderer.ts'

export type { Renderer, RenderedTemplate, CreateRendererOptions } from './createRenderer.ts'
export { createRenderer } from './createRenderer.ts'

export interface RenderOptions {
  /** Already-resolved or partial config. If not provided, resolves from disk + defaults. */
  config?: Partial<MaizzleConfig>
  /** Reuse an existing renderer (used internally by build/serve to avoid creating one per template) */
  _renderer?: Renderer
}

export interface RenderResult {
  html: string
  config: MaizzleConfig
  plaintext?: string
}

/**
 * Render a Vue SFC email template to a fully-transformed HTML string.
 *
 * Accepts a file path, a raw SFC source string, or an imported Vue component.
 * Runs the full pipeline: SSR render → transformers → doctype.
 */
export async function render(
  template: string | Component,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const config = await resolveConfig(options.config)

  // Reuse provided renderer or create a temporary one
  const renderer = options._renderer ?? await createRenderer({ markdown: config.markdown, root: config.root, componentDirs: [config.components?.source ?? []].flat() })
  const ownsRenderer = !options._renderer

  try {
    const isFile = typeof template === 'string'
      && ['.vue', '.md'].includes(extname(template))
      && !template.includes('\n')

    const rendered = await renderer.render(isFile ? resolve(template) : template, config)
    let html = rendered.html

    // Run transformers
    if (rendered.templateConfig.useTransformers !== false) {
      html = await runTransformers(html, rendered.templateConfig, isFile ? resolve(template) : undefined)
    }

    // Prepend doctype
    const doctype = rendered.doctype ?? rendered.templateConfig.doctype ?? '<!DOCTYPE html>'
    html = `${doctype}\n${html}`

    const globalPlaintext = rendered.templateConfig.plaintext
    const sfcPlaintext = rendered.plaintext

    let plaintextResult: string | undefined

    if (globalPlaintext || sfcPlaintext) {
      const stripOptions = typeof globalPlaintext === 'object' ? globalPlaintext : {}
      plaintextResult = createPlaintext(html, stripOptions)
    }

    return { html, config: rendered.templateConfig, plaintext: plaintextResult }
  } finally {
    if (ownsRenderer) {
      await renderer.close()
    }
  }
}
