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
