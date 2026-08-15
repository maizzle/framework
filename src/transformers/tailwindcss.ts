import { resolve, dirname, relative } from 'pathe'
import type { ChildNode, Element } from 'domhandler'
import { walk } from '../utils/ast/index.ts'
import { decodeStyleEntities } from '../utils/decodeStyleEntities.ts'
import { compileTailwindCss } from '../utils/compileTailwindCss.ts'
import type { GradientCombo } from '../plugins/postcss/flattenGradients.ts'
import type { MaizzleConfig } from '../types/config.ts'

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

const GRADIENT_FN_RE = /^bg-(linear|radial|conic)\b/
const GRADIENT_GENERATED_RE = /^bg-(linear|radial|conic)-gradient-/
const GRADIENT_STOP_RE = /^(from|via|to)-/

/** Rank a stop class so generated names are stable regardless of author order. */
function stopRank(cls: string): number {
  const prefix = cls.startsWith('from-') ? 0 : cls.startsWith('via-') ? 1 : 2
  const isPosition = /^(from|via|to)-\d+%$/.test(cls) ? 1 : 0
  return prefix * 2 + isPosition
}

/** Sanitize a class token into a valid, readable CSS class name fragment. */
function sanitize(token: string): string {
  return token
    .replace(/[[\]#()]/g, '')
    .replace(/[/,.%\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Detect Tailwind gradient class combinations on DOM elements.
 *
 * A gradient only works once its `bg-linear/radial/conic` direction class
 * combines with `from-*`/`via-*`/`to-*` stops on the same element. This
 * collects those per-element combos, rewrites each element to a single
 * readable class (e.g. `bg-linear-gradient-to-bl-from-indigo-50-to-indigo-600`),
 * and returns the combos so the flattenGradients plugin can emit one flat
 * `background-image` rule per unique combo.
 */
function collectGradientCombos(dom: ChildNode[]): GradientCombo[] {
  const bySignature = new Map<string, GradientCombo>()
  const usedNames = new Map<string, string>()

  walk(dom, (node) => {
    const el = node as Element
    const cls = el.attribs?.class
    if (!cls) return

    const tokens = cls.split(/\s+/).filter(Boolean)
    const fnClass = tokens.find(t => GRADIENT_FN_RE.test(t) && !GRADIENT_GENERATED_RE.test(t))
    if (!fnClass) return

    const gradientClasses = tokens.filter(
      t => (GRADIENT_FN_RE.test(t) && !GRADIENT_GENERATED_RE.test(t)) || GRADIENT_STOP_RE.test(t),
    )
    const stops = gradientClasses.filter(t => t !== fnClass).sort((a, b) => stopRank(a) - stopRank(b) || a.localeCompare(b))
    const ordered = [fnClass, ...stops]
    const signature = ordered.join(' ')

    let combo = bySignature.get(signature)
    if (!combo) {
      const fn = fnClass.match(GRADIENT_FN_RE)![1]
      const dirRemainder = fnClass.replace(new RegExp(`^bg-${fn}-?`), '')
      const parts = [dirRemainder, ...stops].filter(Boolean).map(sanitize)
      let name = `bg-${fn}-gradient${parts.length ? `-${parts.join('-')}` : ''}`

      // Guard against sanitize collisions from distinct combos.
      const existing = usedNames.get(name)
      if (existing && existing !== signature) {
        let n = 2
        while (usedNames.has(`${name}-${n}`)) n++
        name = `${name}-${n}`
      }
      usedNames.set(name, signature)

      combo = { className: name, classes: ordered }
      bySignature.set(signature, combo)
    }

    // Replace the gradient utilities with the single generated class.
    const rest = tokens.filter(t => !gradientClasses.includes(t))
    el.attribs.class = [...rest, combo.className].join(' ')
  })

  return [...bySignature.values()]
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

  const fromPath = filePath ?? resolve(process.cwd(), 'template.vue')
  const fromDir = dirname(fromPath)

  // Only compute source directives if at least one style tag uses Tailwind
  const hasTailwindStyles = styleTags.some(({ cssContent }) => usesTailwind(cssContent))
  const sourceDirectives = hasTailwindStyles
    ? buildSourceDirectives(dom, config, fromDir)
    : ''

  /**
   * Collect gradient combos and rewrite elements to single classes.
   * Runs after source directives are built (so the utility classes are
   * still scanned) and only feeds the first Tailwind style tag, whose
   * `:root` holds the theme colors the flat rules reference.
   */
  const gradientCombos = hasTailwindStyles ? collectGradientCombos(dom) : []
  const firstTailwindStyle = styleTags.findIndex(({ cssContent }) => usesTailwind(cssContent))

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

    const combos = i === firstTailwindStyle ? gradientCombos : []

    try {
      const optimized = await compileTailwindCss(fullCss, config, `${fromPath}?style=${i}`, combos)

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
