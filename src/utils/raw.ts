import type { RawBlocks } from '../composables/renderContext.ts'

/**
 * Marker that stands in for a `<Raw>` block's content while
 * the transformers run. The per-render nonce makes it
 * impossible to forge from template data, and it's
 * plain ASCII so no transformer will touch it.
 */
export function rawMarker(nonce: string, index: number): string {
  return `__MZRAW_${nonce}_${index}__`
}

/**
 * Swap `<Raw>` markers back for their original content.
 *
 * Single pass with a replacer function: restored content is never
 * re-scanned, and `$` sequences in it aren't treated as
 * replacement patterns.
 */
export function restoreRaw(html: string, raw?: RawBlocks): string {
  if (!raw?.blocks.length) return html

  return html.replace(
    new RegExp(`__MZRAW_${raw.nonce}_(\\d+)__`, 'g'),
    (match, index) => raw.blocks[Number(index)] ?? match,
  )
}
