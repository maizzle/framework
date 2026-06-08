import { resolve, dirname, relative } from 'node:path'
import type { ChildNode, Element } from 'domhandler'
import { walk } from '../utils/ast/index.ts'
import { cwd } from '../utils/cwd.ts'
import { decodeStyleEntities } from '../utils/decodeStyleEntities.ts'
import type { MaizzleConfig } from '../types/config.ts'
import type { CompileTailwind } from './env.ts'

/**
 * Check if CSS content uses Tailwind features that require source scanning.
 *
 * Only CSS that imports Tailwind (or @maizzle/tailwindcss) needs @source
 * directives. Plain CSS without Tailwind imports doesn't need scanning
 * and would pass through @source directives unconsumed.
 */
function usesTailwind(css: string): boolean {
  return /((@import|@reference)\s+["'](tailwindcss|@maizzle\/tailwindcss)|@tailwind\s)/.test(css)
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

  /**
   * Inline source: collect all class attribute values from the rendered DOM.
   * After Vue SSR, the DOM contains every class from every component
   * (built-in framework components, user components, dynamic
   * bindings). We pass these raw values to Tailwind's
   * scanner via @source inline().
   */
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
export async function tailwindcss(dom: ChildNode[], config: MaizzleConfig, filePath?: string, compile?: CompileTailwind): Promise<ChildNode[]> {
  const compileCss = compile ?? (await import('../utils/compileTailwindCss.ts')).compileTailwindCss
  const styleTags: { node: Element; cssContent: string }[] = []

  walk(dom, (node) => {
    if ((node as Element).name !== 'style') return

    const el = node as Element
    const attrs = el.attribs

    /**
     * `raw` opts out of compilation entirely (marker is consumed here).
     * `embed`/`data-embed` only signal "preserve tag after inlining"
     * — they still need to go through compile so Tailwind/@apply
     * resolves.
     */
    if ('raw' in attrs) {
      delete el.attribs.raw
      return
    }

    // Get text content from children and decode HTML entities
    const rawContent = el.children
      .filter(child => child.type === 'text')
      .map(child => (child as any).data)
      .join('')

    if (!rawContent.trim()) return

    styleTags.push({ node: el, cssContent: decodeStyleEntities(rawContent) })
  })

  if (!styleTags.length) return dom

  const fromPath = filePath ?? resolve(cwd(), 'template.vue')
  const fromDir = dirname(fromPath)

  // Only compute source directives if at least one style tag uses Tailwind
  const hasTailwindStyles = styleTags.some(({ cssContent }) => usesTailwind(cssContent))
  const sourceDirectives = hasTailwindStyles
    ? buildSourceDirectives(dom, config, fromDir)
    : ''

  for (let i = 0; i < styleTags.length; i++) {
    const { node, cssContent } = styleTags[i]

    /**
     * Only add source directives to style tags that import Tailwind —
     * plain CSS doesn't need them and @tailwindcss/postcss would
     * leave the directives unconsumed in the output.
     */
    const fullCss = usesTailwind(cssContent)
      ? `${cssContent}\n${sourceDirectives}`
      : cssContent

    try {
      const optimized = await compileCss(fullCss, config, `${fromPath}?style=${i}`)

      // Replace the style tag's children with the compiled CSS
      node.children = [{
        type: 'text',
        data: optimized,
        parent: node,
      } as any]
    } catch {
      /**
       * If CSS processing fails, still replace with decoded content
       * so HTML entities don't break the CSS.
       */
      node.children = [{
        type: 'text',
        data: cssContent,
        parent: node,
      } as any]
    }
  }

  return dom
}
