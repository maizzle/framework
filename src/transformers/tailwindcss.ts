import postcss from 'postcss'
import tailwindcssPostcss from '@tailwindcss/postcss'
import customProperties from 'postcss-custom-properties'
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
    customProperties({
      preserve: false,
    }),
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
 * Tailwind CSS transformer.
 *
 * Compiles CSS inside <style> tags in the DOM using
 * @tailwindcss/postcss, then lowers modern CSS syntax with lightningcss.
 *
 * Uses the AST walker to find <style> tags and decodes HTML entities
 * that Vue SSR encodes (e.g. &quot;) before CSS processing.
 *
 * Runs as the first transformer in the pipeline so that subsequent
 * transformers (inliner, purge, etc.) work with fully compiled CSS.
 */
export async function tailwindcss(dom: ChildNode[], config: MaizzleConfig, filePath?: string): Promise<ChildNode[]> {
  const sourceNotPaths = [
    resolve(config.output?.path ?? 'dist'),
    ...(config.css?.exclude ?? []).map(p => resolve(p)),
  ]

  const styleTags: { node: Element; cssContent: string }[] = []

  walk(dom, (node) => {
    if ((node as Element).name !== 'style') return

    const el = node as Element
    const attrs = el.attribs || {}

    // Skip marked style tags, but remove the marker attribute first
    const markerAttr = ['raw', 'embed', 'data-embed'].find(attr => attr in attrs)
    if (markerAttr) {
      delete el.attribs[markerAttr]
      return
    }

    // Get text content from children and decode HTML entities
    const rawContent = el.children
      .filter(child => child.type === 'text')
      .map(child => (child as any).data)
      .join('')

    if (!rawContent.trim()) return

    let cssContent = decodeEntities(rawContent)

    if (filePath) {
      if (sourceNotPaths.length) {
        const fileDir = dirname(filePath)
        const exclusions = sourceNotPaths
          .map(p => `@source not "${relative(fileDir, resolve(p))}";`)
          .join('\n')

        cssContent = `${cssContent}\n${exclusions}`
      }
    } else {
      // No file path (e.g. component input) — extract classes from the DOM
      // and tell Tailwind to scan them via @source inline()
      const classes: string[] = []
      walk(dom, (n) => {
        const cls = (n as Element).attribs?.class
        if (cls) classes.push(cls)
      })

      if (classes.length) {
        cssContent = `${cssContent}\n@source inline("${classes.join(' ')}");`
      }
    }

    styleTags.push({ node: el, cssContent })
  })

  for (let i = 0; i < styleTags.length; i++) {
    const { node, cssContent } = styleTags[i]
    try {
      const processor = createProcessor(config)
      const result = await processor.process(
        cssContent,
        {
          from: `${filePath ?? resolve(process.cwd(), 'template.vue')}?style=${i}`,
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
