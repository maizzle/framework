import { describe, it, expect } from 'vitest'
import { rawMarker, restoreRaw } from '../../utils/raw.ts'

const raw = { nonce: 'abc123', blocks: ['{{ $a->b }}', '<a href="x">'] }

describe('restoreRaw', () => {
  it('restores every marker', () => {
    const html = `<p>${rawMarker('abc123', 0)}</p>${rawMarker('abc123', 1)}`
    expect(restoreRaw(html, raw)).toBe('<p>{{ $a->b }}</p><a href="x">')
  })

  it('returns input unchanged without raw blocks', () => {
    expect(restoreRaw('<p>hi</p>')).toBe('<p>hi</p>')
    expect(restoreRaw('<p>hi</p>', { nonce: 'x', blocks: [] })).toBe('<p>hi</p>')
  })

  it('ignores markers with a different nonce', () => {
    const forged = rawMarker('other', 0)
    expect(restoreRaw(forged, raw)).toBe(forged)
  })

  it('leaves out-of-range markers alone', () => {
    const marker = rawMarker('abc123', 5)
    expect(restoreRaw(marker, raw)).toBe(marker)
  })

  it('does not re-scan restored content', () => {
    const nested = { nonce: 'n', blocks: [rawMarker('n', 1), 'leaked'] }
    expect(restoreRaw(rawMarker('n', 0), nested)).toBe(rawMarker('n', 1))
  })
})
