export function normalizeToPixels(value: string | number): string {
  if (typeof value === 'number' || Number.isFinite(Number(value))) {
    return `${value}px`
  }
  return value
}

const counters: Record<string, number> = {}

/**
 * Module-scoped sequential ID generator. Used by components to mint
 * unique marker ids (e.g. `c1`, `c2`) for the post-render transformer.
 *
 * Must live here (not inside `<script setup>`) because Vue compiles
 * `<script setup>` into the component's `setup()` function — any
 * `let counter = 0` there resets per instance, causing id collisions.
 */
export function nextId(prefix: string): string {
  counters[prefix] = (counters[prefix] ?? 0) + 1
  return `${prefix}${counters[prefix]}`
}

export function hasWidthUtility(classStr: string): boolean {
  return classStr.split(/\s+/).some((c) => {
    const utility = c.split(':').pop() ?? ''
    const clean = utility.replace(/^!/, '')
    return /^(w-|max-w-|min-w-)/.test(clean)
  })
}

export function hasWidthInStyle(styleStr: string): boolean {
  return /(?:^|;\s*)(?:max-width|width)\s*:/i.test(styleStr)
}

export function hasHeightUtility(classStr: string): boolean {
  return classStr.split(/\s+/).some((c) => {
    const utility = c.split(':').pop() ?? ''
    const clean = utility.replace(/^!/, '')
    return /^(h-|max-h-|min-h-)/.test(clean)
  })
}

export function hasHeightInStyle(styleStr: string): boolean {
  return /(?:^|;\s*)(?:max-height|height)\s*:/i.test(styleStr)
}

/**
 * Shared prop for components that emit MSO/VML fallback markup. The
 * `null` default acts as the "unset" sentinel — `useOutlookFallback`
 * treats `null` as inherit-from-ancestor (root default `true`),
 * letting users override per-component without losing inheritance.
 */
export const outlookFallbackProp = {
  type: Boolean,
  default: null,
} as const

/**
 * Default utility classes for a code-block `<pre>`. `whitespace-pre!` is
 * forced important so Gmail's stylesheet can't reset it to `normal`, and
 * `m-0` strips the browser's default `<pre>` margins so it isn't spaced
 * away from its wrapper.
 */
export function codeBlockPreClass(bg: string): string {
  return `font-mono bg-[${bg}] p-4 m-0 overflow-auto whitespace-pre! [word-wrap:normal] [word-break:normal] [word-spacing:normal]`
}

/**
 * Build the email-safe table wrapper around highlighted code. Shared by the
 * `<CodeBlock>` component and the Markdown fenced/indented code-block
 * rules so both render identical markup: a full-width table whose
 * cell carries the theme background, wrapping a `<pre>` styled
 * with utility classes (not Shiki's raw inline styles).
 */
export function buildCodeBlock(
  codeContent: string,
  bg: string,
  options: { preClass?: string; tdClass?: string; styleAttr?: string } = {},
): string {
  const preClass = options.preClass ?? codeBlockPreClass(bg)
  const tdClass = options.tdClass ?? `bg-[${bg}] max-w-0 mso-padding-alt-4`
  const styleAttr = options.styleAttr ?? ''

  // `data-juice-important` tells the CSS inliner to keep `!important` on this
  // element's inlined declarations (e.g. `white-space: pre !important`), which
  // it strips by default. Juice removes the attribute from the output.
  return `<table class="w-full"><tr><td class="${tdClass}"><pre class="${preClass}"${styleAttr} data-juice-important><code>${codeContent}</code></pre></td></tr></table>`
}

/**
 * Re-wrap a Shiki (or plain markdown-it) `<pre><code>` block as a CodeBlock,
 * pulling the inner code and the theme background out of the highlighted
 * HTML. Falls back to a white background for unhighlighted blocks.
 */
export function shikiToCodeBlock(highlighted: string): string {
  const trimmed = highlighted.trim()
  // Read the background only from the opening <pre> tag's style, never from
  // the code body — otherwise a `background-color:` inside the snippet (e.g. a
  // CSS example, or any unhighlighted block) would hijack the wrapper color.
  const preTag = trimmed.match(/^<pre[^>]*>/)?.[0] ?? ''
  const bg = preTag.match(/background-color:\s*(#[0-9a-fA-F]+)/)?.[1] ?? '#fff'
  const codeContent = trimmed
    .replace(/^<pre[^>]*><code[^>]*>/, '')
    .replace(/<\/code><\/pre>$/, '')

  return buildCodeBlock(codeContent, bg)
}

