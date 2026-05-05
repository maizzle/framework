import { resolve, extname } from 'node:path'
import { resolveConfig } from '../config/index.ts'
import { runTransformers } from '../transformers/index.ts'
import { createPlaintext } from '../plaintext.ts'
import defu from 'defu'
import type { Component } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'
import { createRenderer } from './createRenderer.ts'
import { getActiveRenderer } from './active.ts'

export type { Renderer, RenderedTemplate, CreateRendererOptions } from './createRenderer.ts'
export { createRenderer } from './createRenderer.ts'

export interface RenderResult {
  html: string
  config: MaizzleConfig
  plaintext?: string
}

/**
 * Render a Vue SFC email template to a fully-transformed HTML string.
 * Accepts a file path or a raw SFC source string.
 */
export async function render(
  template: string | Component,
  config?: Partial<MaizzleConfig>,
): Promise<RenderResult> {
  if (template == null) {
    throw new Error(
      `render() received ${template}. If you used \`import X from './x.vue'\`, Node cannot load .vue files natively — pass the path string instead: render('./x.vue').`,
    )
  }
  if (typeof template !== 'string' && typeof template !== 'object' && typeof template !== 'function') {
    throw new TypeError(
      `render() expected a file path or SFC source string, got ${typeof template}.`,
    )
  }

  const resolvedConfig = await resolveConfig(config)

  // Reuse a renderer started by the Vite plugin when one is active. Spinning
  // up a fresh Vite SSR server inside a host Vite dev process (e.g. TanStack
  // Start) collides on env wiring and throws "outsideEmitter undefined".
  const active = getActiveRenderer()
  const renderer = active ?? await createRenderer({
    markdown: resolvedConfig.markdown,
    root: resolvedConfig.root,
    componentDirs: [resolvedConfig.components?.source ?? []].flat(),
    vite: resolvedConfig.vite,
  })

  try {
    const isFile = typeof template === 'string'
      && ['.vue', '.md'].includes(extname(template))
      && !template.includes('\n')

    const rendered = await renderer.render(isFile ? resolve(template) : template, resolvedConfig)
    let html = rendered.html

    const doctype = rendered.doctype ?? rendered.templateConfig.doctype ?? '<!DOCTYPE html>'

    if (rendered.templateConfig.useTransformers !== false) {
      html = await runTransformers(html, rendered.templateConfig, isFile ? resolve(template) : undefined, doctype, rendered.tailwindBlocks)
    }
    html = `${doctype}\n${html}`

    const globalPlaintext = rendered.templateConfig.plaintext
    const sfcPlaintext = rendered.plaintext

    let plaintextResult: string | undefined

    if (globalPlaintext || sfcPlaintext) {
      const globalCfg = typeof globalPlaintext === 'object' ? globalPlaintext : {}
      const stripOptions = defu(sfcPlaintext?.options, globalCfg.options)
      plaintextResult = createPlaintext(html, stripOptions)
    }

    return { html, config: rendered.templateConfig, plaintext: plaintextResult }
  } finally {
    if (!active) await renderer.close()
  }
}
