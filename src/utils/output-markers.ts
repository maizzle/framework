import { renderNonce } from '../composables/renderContext.ts'
import type { RenderContext } from '../composables/renderContext.ts'

/**
 * `PT` marks plaintext-only content (`<Plaintext>`), `HO` marks
 * HTML-only content (`<NotPlaintext>`, preheaders).
 */
export type OutputMarkerKind = 'PT' | 'HO'

/**
 * Start/end tokens that components wrap their content in, so the
 * build can route it to one output and remove it from the other.
 *
 * Plain text tokens rather than wrapper elements: stripping them
 * is a string replace, so the document never goes through a
 * DOM round-trip that would restructure `<Raw>` content
 * or undo formatting applied by the transformers.
 */
export function outputMarkers(ctx: RenderContext, kind: OutputMarkerKind): [start: string, end: string] {
  const nonce = renderNonce(ctx)
  const id = ctx.outputMarkerCount = (ctx.outputMarkerCount ?? 0) + 1

  return [`__MZ${kind}_${nonce}_${id}_S__`, `__MZ${kind}_${nonce}_${id}_E__`]
}

/** Any output or `<Raw>` marker. */
export const ANY_MARKER = /__MZ(?:PT|HO)_[a-f0-9]{32}_\d+_[SE]__|__MZRAW_[a-f0-9]{32}_\d+__/g
const PLACEHOLDER = /([-]+)/g

/**
 * Run a filter without letting it alter output or `<Raw>` markers.
 * They're swapped for placeholders made of private-use characters,
 * which case changes and literal-string filters won't touch,
 * while the filter still sees the content as one string
 * (so `append`, `truncate` etc. keep working).
 */
export function protectMarkers(str: string, fn: (str: string) => string): string {
  if (!str.includes('__MZ')) return fn(str)

  const markers: string[] = []
  const hidden = str.replace(ANY_MARKER, (marker) => {
    const index = (markers.push(marker) - 1).toString(16)
    return `${[...index].map(c => String.fromCharCode(0xE010 + Number.parseInt(c, 16))).join('')}`
  })

  return fn(hidden).replace(PLACEHOLDER, (match, encoded: string) => {
    const index = Number.parseInt([...encoded].map(c => (c.charCodeAt(0) - 0xE010).toString(16)).join(''), 16)
    return markers[index] ?? match
  })
}

/**
 * Matches a whole marked block, from its start token to the end
 * token with the same id. Nested blocks of any kind are
 * dropped along with the block that contains them.
 */
const blockRe = (kind: OutputMarkerKind, nonce: string) =>
  new RegExp(`__MZ${kind}_${nonce}_(\\d+)_S__[\\s\\S]*?__MZ${kind}_${nonce}_\\1_E__`, 'g')

const tokenRe = (kind: OutputMarkerKind, nonce: string) =>
  new RegExp(`__MZ${kind}_${nonce}_\\d+_[SE]__`, 'g')

/**
 * HTML output: drop plaintext-only blocks entirely,
 * keep HTML-only content but remove its tokens.
 */
export function stripForHtml(html: string, nonce?: string): string {
  if (!nonce) return html
  return html.replace(blockRe('PT', nonce), '').replace(tokenRe('HO', nonce), '')
}

/**
 * Plaintext source: drop HTML-only blocks entirely, keep
 * plaintext-only content but remove its tokens. The
 * result is fed to `createPlaintext`.
 */
export function stripForPlaintext(html: string, nonce?: string): string {
  if (!nonce) return html
  return html.replace(blockRe('HO', nonce), '').replace(tokenRe('PT', nonce), '')
}
