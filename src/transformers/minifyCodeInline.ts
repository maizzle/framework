/**
 * Restore HTML inside elements marked `data-minify-inline`, then strip the
 * marker attribute and trim formatter-injected whitespace.
 *
 * Named for its primary client, `<CodeInline theme="…">`. The component
 * replaces shiki's structural `<`/`>` with private markers `§MZLT§` /
 * `§MZGT§` so the format pass (oxfmt with `htmlWhitespaceSensitivity:
 * 'ignore'`) can't see them as real angle brackets and reflow the
 * chain of `<span>` tokens. Source-level entities like `&lt;` (a
 * literal `<` in the user's code) are made of `&`, `l`, `t`, `;` —
 * no real `<` — so they pass through this pipeline untouched and
 * land in the browser as entities, rendering correctly as `<`.
 *
 * Runs unconditionally near the end of the pipeline so:
 *   1. The markers always get decoded back to real `<` / `>`.
 *   2. The `data-minify-inline` attribute never leaks to final HTML
 *      (whether or not the inner content had markers).
 *   3. Whitespace the formatter injected around the inner content
 *      (e.g. between `<code>` and the text node) is trimmed so the
 *      inline element lands flush.
 *
 * The marker attribute is intentionally generic so any component facing
 * the same formatter-vs-inline-structure problem can opt in.
 */
export function minifyCodeInline(html: string): string {
  if (!html.includes('data-minify-inline')) return html

  return html.replace(
    /<([a-zA-Z][\w-]*)([^>]*?)\s+data-minify-inline(?:="[^"]*")?([^>]*)>([\s\S]*?)<\/\1>/g,
    (_full, tag, before, after, contents) => {
      const cleanedAttrs = `${before}${after}`.replace(/\s+/g, ' ').trim()
      const open = cleanedAttrs ? `<${tag} ${cleanedAttrs}>` : `<${tag}>`
      const decoded = contents
        .replace(/§MZLT§/g, '<')
        .replace(/§MZGT§/g, '>')
        .trim()
      return `${open}${decoded}</${tag}>`
    },
  )
}
