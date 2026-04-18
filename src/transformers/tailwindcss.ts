import postcss from 'postcss'
import tailwindcssPostcss from '@tailwindcss/postcss'
import postcssCalc from 'postcss-calc'
import resolveProps from '../plugins/postcss/resolveProps.ts'
import pruneVars from '../plugins/postcss/pruneVars.ts'
import safeParser from 'postcss-safe-parser'
import { transform } from 'lightningcss'
import { resolve, dirname, relative } from 'node:path'
import type { ChildNode, Element } from 'domhandler'
import { walk } from '../utils/ast/index.ts'
import { tailwindCleanup } from '../plugins/postcss/tailwindCleanup.ts'
import { mergeMediaQueries } from '../plugins/postcss/mergeMediaQueries.ts'
import type { MaizzleConfig } from '../types/config.ts'

function createProcessor(config: MaizzleConfig) {
  return postcss([
    tailwindcssPostcss({
      base: config.css?.base,
      transformAssetUrls: false,
      optimize: false, // we run Lightning CSS manually
    }),
    resolveProps(),
    postcssCalc({}),
    pruneVars(),
  ])
}

/**
 * Decode HTML entities that Vue SSR encodes inside <style> tags.
 *
 * Vue's renderToString HTML-encodes quotes and other characters
 * inside <style> tags within templates, breaking CSS like
 * `@import "@maizzle/tailwindcss"` → `@import &quot;...&quot;`
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

/**
 * Check if CSS content uses Tailwind features that require source scanning.
 *
 * Only CSS that imports Tailwind (or @maizzle/tailwindcss) needs @source
 * directives. Plain CSS without Tailwind imports doesn't need scanning
 * and would pass through @source directives unconsumed.
 */
function usesTailwind(css: string): boolean {
  return /(@import\s+["'](tailwindcss|@maizzle\/tailwindcss)|@tailwind\s)/.test(css)
}

/**
 * Lower modern CSS syntax using lightningcss.
 *
 * Targets IE 1 to maximize syntax lowering — converts modern features
 * like nesting, oklch(), color-mix(), @property, etc. into simple CSS
 * that email clients can understand.
 */
function lowerSyntax(css: string): string {
  const result = transform({
    filename: 'email.css',
    code: Buffer.from(css),
    minify: false,
    targets: {
      ie: 4 << 5,
    },
  })

  return result.code.toString()
}

/**
 * Run cleanup and media query merging on the compiled CSS.
 *
 * Removes unwanted selectors (:host, :lang) and at-rules (@layer, @property),
 * then sorts and merges media queries.
 */
async function optimizeCss(css: string, config: MaizzleConfig): Promise<string> {
  const plugins: postcss.Plugin[] = [...tailwindCleanup(config)]

  const mediaPlugin = mergeMediaQueries(config)
  if (mediaPlugin) plugins.push(mediaPlugin)

  const result = await postcss(plugins).process(css, { from: undefined })

  return result.css
}

/**
 * Build @source directives for Tailwind CSS scanning.
 *
 * Configures two types of sources:
 * 1. Exclusions for output dir and user-configured paths
 * 2. Inline source with all class attribute values from the rendered DOM,
 *    capturing classes from all components (built-in + user), dynamic
 *    expressions, and the template itself — Tailwind's scanner handles
 *    the actual class extraction from these raw values
 */
function buildSourceDirectives(dom: ChildNode[], config: MaizzleConfig, fromDir: string): string {
  const directives: string[] = []

  // Exclude output dir and user-configured paths
  const excludePaths = [
    resolve(config.output?.path ?? 'dist'),
    ...(config.css?.exclude ?? []).map(p => resolve(p)),
  ]

  for (const p of excludePaths) {
    directives.push(`@source not "${relative(fromDir, resolve(p))}";`)
  }

  // Inline source: collect all class attribute values from the rendered DOM.
  // After Vue SSR, the DOM contains every class from every component
  // (built-in framework components, user components, dynamic bindings).
  // We pass these raw values to Tailwind's scanner via @source inline().
  const classes: string[] = []
  walk(dom, (n) => {
    const cls = (n as Element).attribs?.class
    if (cls) classes.push(cls)
  })

  if (classes.length) {
    directives.push(`@source inline("${classes.join(' ')}");`)
  }

  return directives.join('\n')
}

/**
 * Tailwind CSS transformer.
 *
 * Compiles CSS inside <style> tags in the DOM using
 * @tailwindcss/postcss, then lowers modern CSS syntax with lightningcss.
 *
 * Configures Tailwind sources to scan:
 * - Rendered class attributes (via `@source inline`) for all classes from all components
 * - User project files (via Tailwind's auto-detection from base/from path)
 *
 * User `@source` and `@source not directives` in style tags are preserved.
 * Source directives are only added to style tags that import Tailwind.
 *
 * Runs as the first transformer in the pipeline so that subsequent
 * transformers (inliner, purge, etc.) work with fully compiled CSS.
 */
export async function tailwindcss(dom: ChildNode[], config: MaizzleConfig, filePath?: string): Promise<ChildNode[]> {
  const styleTags: { node: Element; cssContent: string }[] = []

  walk(dom, (node) => {
    if ((node as Element).name !== 'style') return

    const el = node as Element
    const attrs = el.attribs || {}

    // Skip marked style tags
    // Remove 'raw' marker but preserve 'embed'/'data-embed' for Juice
    if ('raw' in attrs) {
      delete el.attribs.raw
      return
    }

    if ('embed' in attrs || 'data-embed' in attrs) {
      return
    }

    // Get text content from children and decode HTML entities
    const rawContent = el.children
      .filter(child => child.type === 'text')
      .map(child => (child as any).data)
      .join('')

    if (!rawContent.trim()) return

    styleTags.push({ node: el, cssContent: decodeEntities(rawContent) })
  })

  if (!styleTags.length) return dom

  const fromPath = filePath ?? resolve(process.cwd(), 'template.vue')
  const fromDir = dirname(fromPath)

  // Only compute source directives if at least one style tag uses Tailwind
  const hasTailwindStyles = styleTags.some(({ cssContent }) => usesTailwind(cssContent))
  const sourceDirectives = hasTailwindStyles
    ? buildSourceDirectives(dom, config, fromDir)
    : ''

  // Create processor once — reused for all style tags in this template
  const processor = createProcessor(config)

  for (let i = 0; i < styleTags.length; i++) {
    const { node, cssContent } = styleTags[i]

    // Only add source directives to style tags that import Tailwind —
    // plain CSS doesn't need them and @tailwindcss/postcss would leave
    // the directives unconsumed in the output
    const fullCss = usesTailwind(cssContent)
      ? `${cssContent}\n${sourceDirectives}`
      : cssContent

    try {
      const result = await processor.process(
        fullCss,
        {
          from: `${fromPath}?style=${i}`,
          parser: safeParser,
        }
      )

      const lowered = lowerSyntax(result.css)
      const optimized = await optimizeCss(lowered, config)

      // Replace the style tag's children with the compiled CSS
      node.children = [{
        type: 'text',
        data: optimized,
        parent: node,
      } as any]
    } catch {
      // If CSS processing fails, still replace with decoded content
      // so HTML entities don't break the CSS
      node.children = [{
        type: 'text',
        data: cssContent,
        parent: node,
      } as any]
    }
  }

  return dom
}
