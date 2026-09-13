/**
 * Resolve the placeholder comments emitted by `<Outlook>` into real MSO
 * conditional comments.
 *
 * `<Outlook>` can't render `<!--[if mso]>…<![endif]-->` directly: the
 * whole block would parse as a single comment node and every DOM
 * transformer (inliner, safe selectors, purge, attributes…) would
 * be blind to the markup inside it. Instead it wraps its slot in
 * two self-contained conditional comments carrying a marker, so
 * the content stays real DOM through the pipeline. Shaping the
 * markers as conditionals means juice and email-comb leave
 * them alone. This runs on the serialized string, after
 * every DOM transformer, and turns the pair back into a
 * single hidden conditional block.
 */
const RE_OPEN = /<!--\[if ([^\]]+)\]>__MAIZZLE_MSO_OPEN__<!\[endif\]-->/g
const RE_CLOSE = /<!--\[if mso\]>__MAIZZLE_MSO_CLOSE__<!\[endif\]-->/g

export function msoConditionals(html: string): string {
  return html
    .replace(RE_OPEN, '<!--[if $1]>')
    .replace(RE_CLOSE, '<![endif]-->')
}
