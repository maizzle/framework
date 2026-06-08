import defu from 'defu'
import type { Component } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'
import { resolveConfigBrowser } from '../config/browser.ts'
import { compileSfcToComponent } from './compileSfc.ts'
import { getBuiltinComponents } from './builtinComponents.ts'
import { ssrRender, type RenderedTemplate } from './ssrRender.ts'
import { runTransformers } from '../transformers/index.ts'
import { compileTailwindCssBrowser } from '../utils/compileTailwindCss.browser.ts'
import { createPlaintext } from '../plaintext.ts'
import { stripForHtml, stripForPlaintext } from '../utils/output-markers.ts'
import { MaizzleConfigKey } from '../composables/useConfig.ts'
import { RenderContextKey } from '../composables/renderContext.ts'

export interface RenderResult {
  html: string
  config: MaizzleConfig
  plaintext?: string
}

/** Components an SFC may reference, by tag name: raw SFC source or a component. */
export type ComponentMap = Record<string, string | Component>

export type BrowserRenderConfig =
  Omit<Partial<MaizzleConfig>, 'components'> & { components?: ComponentMap }

const transformOpts = {
  compileTailwind: compileTailwindCssBrowser,
  format: null, // oxfmt is native — prettify unavailable in the browser
  readLinkFile: null, // no local filesystem
}

/**
 * Render a Vue SFC email template to fully-transformed HTML — in the browser
 * or an eval-permitting edge/JS runtime (Node, Bun, Deno). Mirrors the Node
 * {@link render} but compiles the SFC in-process (no Vite), takes config from
 * the argument (no `maizzle.config` on disk), and compiles Tailwind via WASM.
 *
 * `template` is an SFC **source string** (file paths require a filesystem) or
 * a precompiled component. Components the SFC references are supplied via
 * `config.components` ({ TagName: sfcSource | component }); built-ins are
 * always available.
 *
 * Not usable in V8-isolate edge runtimes that forbid code evaluation
 * (Cloudflare Workers, Vercel Edge) when given a source string — pass a
 * precompiled component there instead.
 */
export async function render(template: string | Component, config?: BrowserRenderConfig): Promise<RenderResult> {
  if (template == null) {
    throw new Error(`render() received ${template}. Pass an SFC source string or a precompiled component.`)
  }

  const { components: userComponentSources, ...rest } = config ?? {}
  const resolvedConfig = resolveConfigBrowser(rest as Partial<MaizzleConfig>)

  /**
   * Pure HTML (a string with no `<template>`/`<script>`) needs no Vue compile
   * at all — the transformer pipeline (Tailwind, inline, …) handles it. This
   * path is fully eval-free, so it runs on every runtime including strict
   * V8-isolate edges.
   */
  const isSource = typeof template === 'string'
  const looksLikeSfc = !isSource || template.includes('<template') || template.includes('<script')

  let rendered: RenderedTemplate
  if (isSource && !looksLikeSfc) {
    rendered = { html: template, templateConfig: resolvedConfig, sfcEventHandlers: [] }
  }
  else {
    // Compile user-supplied components (source strings) once.
    const userComponents: Record<string, Component> = {}
    for (const [name, value] of Object.entries(userComponentSources ?? {})) {
      userComponents[name] = typeof value === 'string'
        ? await compileSfcToComponent(value, { filename: `${name}.vue` })
        : value
    }

    const builtins = await getBuiltinComponents()
    const globalComponents = { ...builtins, ...userComponents }

    const component = isSource ? await compileSfcToComponent(template) : template

    rendered = await ssrRender(component, resolvedConfig, {
      configKey: MaizzleConfigKey,
      contextKey: RenderContextKey,
      globalComponents,
    })
  }

  let html = rendered.html
  const doctype = rendered.doctype ?? rendered.templateConfig.doctype ?? '<!DOCTYPE html>'

  if (rendered.templateConfig.useTransformers !== false) {
    html = await runTransformers(html, rendered.templateConfig, undefined, doctype, rendered.tailwindBlocks, transformOpts)
  }
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

export { compileSfcToComponent } from './compileSfc.ts'
export { resolveConfigBrowser } from '../config/browser.ts'
export { defineConfig } from '../composables/defineConfig.ts'
export type { RenderedTemplate } from './ssrRender.ts'

/**
 * Raw SFC source of every built-in component, keyed by tag name. Exposed so
 * tooling (e.g. an in-browser editor) can derive component-name/prop/JSDoc
 * autocompletion client-side without a filesystem scan.
 */
export { builtinComponentSources } from '../components/builtinSources.generated.ts'
