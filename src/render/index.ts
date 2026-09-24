import { resolve, extname } from 'pathe'
import { resolveConfigObject } from '../config/index.ts'
import { runTransformers } from '../transformers/index.ts'
import { createPlaintext } from '../plaintext.ts'
import { stripForHtml, stripForPlaintext } from '../utils/output-markers.ts'
import defu from 'defu'
import type { Component } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'
import { createRenderer, type Renderer } from './createRenderer.ts'
import { getActiveRenderer } from './active.ts'
import { normalizeComponentSources } from '../utils/componentSources.ts'

export type { Renderer, RenderedTemplate, CreateRendererOptions } from './createRenderer.ts'
export { createRenderer } from './createRenderer.ts'

export interface RenderResult {
  html: string
  config: MaizzleConfig
  plaintext?: string
}

export interface MaizzleInstance {
  /**
   * Render a template through the full pipeline, reusing this instance's
   * renderer. `config` is merged over the config the instance was created
   * with. Safe to call concurrently.
   */
  render(template: string | Component, config?: Partial<MaizzleConfig>): Promise<RenderResult>
  /** Shut down the underlying Vite SSR server. */
  close(): Promise<void>
}

function rendererOptions(config: MaizzleConfig) {
  return {
    markdown: config.markdown,
    root: config.root,
    componentDirs: normalizeComponentSources(config.components?.source, process.cwd()),
    vite: config.vite,
    customElements: config.vue?.customElements,
  }
}

/**
 * Run a template through a renderer and the post-render pipeline
 * (transformers, doctype, plaintext). Shared by the one-shot render()
 * and instances from createMaizzle().
 */
async function renderWith(
  renderer: Renderer,
  template: string | Component,
  resolvedConfig: MaizzleConfig,
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

  const { props, ...templateConfig } = resolvedConfig

  const isFile = typeof template === 'string'
    && ['.vue', '.md'].includes(extname(template))
    && !template.includes('\n')

  const rendered = await renderer.render(isFile ? resolve(template) : template, templateConfig, { props })
  let html = rendered.html

  const doctype = rendered.doctype ?? rendered.templateConfig.doctype ?? '<!DOCTYPE html>'

  html = await runTransformers(html, rendered.templateConfig, isFile ? resolve(template) : undefined, doctype, rendered.tailwindBlocks)
  if (doctype) html = `${doctype}\n${html}`

  const globalPlaintext = rendered.templateConfig.plaintext
  const sfcPlaintext = rendered.plaintext

  let plaintextResult: string | undefined

  if (globalPlaintext || sfcPlaintext) {
    const globalCfg = typeof globalPlaintext === 'object' ? globalPlaintext : {}
    const stripOptions = defu(sfcPlaintext?.options, globalCfg.options)
    plaintextResult = createPlaintext(stripForPlaintext(html), stripOptions)
  }

  return { html: stripForHtml(html), config: rendered.templateConfig, plaintext: plaintextResult }
}

/**
 * Render a Vue SFC email template to a fully-transformed HTML string.
 * Accepts a file path or a raw SFC source string.
 *
 * Starts and stops a Vite SSR server per call. For repeated renders in a
 * long-running process, use createMaizzle() instead.
 */
export async function render(
  template: string | Component,
  config?: Partial<MaizzleConfig>,
): Promise<RenderResult> {
  const resolvedConfig = resolveConfigObject(config)

  /**
   * Reuse a renderer started by the Vite plugin when one is active.
   * Spinning up a fresh Vite SSR server inside a host Vite dev process
   * (e.g. TanStack Start) collides on env wiring and throws
   * "outsideEmitter undefined".
   */
  const active = getActiveRenderer()
  const renderer = active ?? await createRenderer(rendererOptions(resolvedConfig))

  try {
    return await renderWith(renderer, template, resolvedConfig)
  } finally {
    if (!active) await renderer.close()
  }
}

/**
 * Create a Maizzle instance that keeps one Vite SSR server alive across
 * renders. Use this when rendering emails on demand in a long-running
 * process, where the per-call startup cost of render() adds up.
 */
export async function createMaizzle(config?: Partial<MaizzleConfig>): Promise<MaizzleInstance> {
  const baseConfig = config ?? {}
  const renderer = await createRenderer(rendererOptions(resolveConfigObject(baseConfig)))

  return {
    render(template, renderConfig) {
      return renderWith(renderer, template, resolveConfigObject(defu(renderConfig, baseConfig)))
    },
    close() {
      return renderer.close()
    },
  }
}
