import { describe, it, expect } from 'vitest'
import { urlQuery } from '../../transformers/urlQuery.ts'
import type { UrlQueryOptions } from '../../types/config.ts'

function run(
  html: string,
  params: Record<string, unknown> = { utm_source: 'maizzle' },
  options?: UrlQueryOptions,
): string {
  return urlQuery(html, params, options)
}

// ─── Core behaviour ─────────────────────────────────────────────────────────

describe('urlQuery — core behaviour', () => {
  it('appends a single parameter to an href', () => {
    expect(run('<a href="https://example.com">x</a>'))
      .toBe('<a href="https://example.com?utm_source=maizzle">x</a>')
  })

  it('appends multiple parameters', () => {
    const result = run('<a href="https://example.com">x</a>', {
      utm_source: 'maizzle',
      utm_campaign: 'launch',
    })
    expect(result).toBe('<a href="https://example.com?utm_campaign=launch&utm_source=maizzle">x</a>')
  })

  it('merges with pre-existing query parameters', () => {
    expect(run('<a href="https://example.com?foo=bar">x</a>'))
      .toBe('<a href="https://example.com?foo=bar&utm_source=maizzle">x</a>')
  })

  it('does not encode special chars by default', () => {
    const result = run('<a href="https://example.com">x</a>', { foo: '@Bar@' })
    expect(result).toBe('<a href="https://example.com?foo=@Bar@">x</a>')
  })
})

// ─── Strict mode ────────────────────────────────────────────────────────────

describe('urlQuery — strict mode', () => {
  it('skips non-absolute URLs in strict mode (default)', () => {
    const html = '<a href="example.com">x</a>'
    expect(run(html)).toBe(html)
  })

  it('processes any string when strict is false', () => {
    expect(run('<a href="example.com">x</a>', { foo: 'bar' }, { strict: false }))
      .toBe('<a href="example.com?foo=bar">x</a>')
  })

  it('still processes absolute URLs when strict is false', () => {
    expect(run('<a href="https://example.com">x</a>', { foo: 'bar' }, { strict: false }))
      .toBe('<a href="https://example.com?foo=bar">x</a>')
  })
})

// ─── Tags option ─────────────────────────────────────────────────────────────

describe('urlQuery — _options.tags', () => {
  it('only processes <a> tags by default', () => {
    const html = '<a href="https://example.com">x</a><img src="https://example.com/img.jpg">'
    const result = run(html)
    expect(result).toBe('<a href="https://example.com?utm_source=maizzle">x</a><img src="https://example.com/img.jpg">')
  })

  it('processes multiple tag types when specified', () => {
    const html = '<a href="https://example.com">x</a><img src="https://example.com/img.jpg">'
    const result = run(html, { foo: 'bar' }, { tags: ['a', 'img'] })
    expect(result).toBe(
      '<a href="https://example.com?foo=bar">x</a>' +
      '<img src="https://example.com/img.jpg?foo=bar">',
    )
  })

  it('supports CSS attribute selector — *= (contains)', () => {
    const html = '<a href="https://example.com/path">yes</a><a href="https://other.com">no</a>'
    const result = run(html, { foo: 'bar' }, { tags: ['a[href*="example.com"]'] })
    expect(result).toBe(
      '<a href="https://example.com/path?foo=bar">yes</a>' +
      '<a href="https://other.com">no</a>',
    )
  })

  it('supports CSS attribute selector — ^= (starts with)', () => {
    const html = '<a href="https://example.com">yes</a><a href="http://other.com">no</a>'
    const result = run(html, { foo: 'bar' }, { tags: ['a[href^="https://example"]'] })
    expect(result).toBe(
      '<a href="https://example.com?foo=bar">yes</a>' +
      '<a href="http://other.com">no</a>',
    )
  })

  it('supports CSS attribute selector — $= (ends with)', () => {
    const html = '<a href="https://example.com/page.html">yes</a><a href="https://example.com/page.php">no</a>'
    const result = run(html, { foo: 'bar' }, { tags: ['a[href$=".html"]'] })
    expect(result).toBe(
      '<a href="https://example.com/page.html?foo=bar">yes</a>' +
      '<a href="https://example.com/page.php">no</a>',
    )
  })

  it('supports CSS attribute selector — = (exact match)', () => {
    const html = '<a href="https://example.com">yes</a><a href="https://example.com/page">no</a>'
    const result = run(html, { foo: 'bar' }, { tags: ['a[href="https://example.com"]'] })
    expect(result).toBe(
      '<a href="https://example.com?foo=bar">yes</a>' +
      '<a href="https://example.com/page">no</a>',
    )
  })
})

// ─── Attributes option ───────────────────────────────────────────────────────

describe('urlQuery — _options.attributes', () => {
  it('uses default attributes when not specified', () => {
    // href is in defaults, data-url is not
    const html = '<a href="https://example.com" data-url="https://example.com">x</a>'
    const result = run(html, { foo: 'bar' })
    expect(result).toBe('<a href="https://example.com?foo=bar" data-url="https://example.com">x</a>')
  })

  it('processes src attribute on img when both tags and attributes are configured', () => {
    const html = '<a href="https://foo.bar" data-href="https://example.com">x</a><img src="https://example.com">'
    const result = run(html, { foo: 'bar' }, {
      tags: ['a', 'img'],
      attributes: ['data-href', 'src'],
    })
    expect(result).toBe(
      '<a href="https://foo.bar" data-href="https://example.com?foo=bar">x</a>' +
      '<img src="https://example.com?foo=bar">',
    )
  })
})

// ─── qs option ────────────────────────────────────────────────────────────────

describe('urlQuery — _options.qs', () => {
  it('encodes special chars', () => {
    const result = run(
      '<a href="https://example.com">x</a>',
      { foo: '@Bar@' },
      { qs: { encode: true } },
    )
    expect(result).toBe('<a href="https://example.com?foo=%40Bar%40">x</a>')
  })
})

// ─── Config: enabled / disabled ──────────────────────────────────────────────

describe('urlQuery — empty params', () => {
  it('returns html unchanged when params arg is omitted', () => {
    const html = '<a href="https://example.com">x</a>'
    expect(urlQuery(html)).toBe(html)
  })

  it('returns html unchanged when params is an empty object', () => {
    const html = '<a href="https://example.com">x</a>'
    expect(urlQuery(html, {})).toBe(html)
  })

  it('returns html unchanged when params is empty even with options set', () => {
    const html = '<a href="https://example.com">x</a>'
    expect(urlQuery(html, {}, { tags: ['a'] })).toBe(html)
  })
})

// ─── Short-circuit ────────────────────────────────────────────────────────────

describe('urlQuery — short-circuit', () => {
  it('returns the original string when no attributes are modified', () => {
    // No <a> tags at all
    const html = '<div><p>Hello</p></div>'
    const result = run(html)
    expect(result).toBe(html)
  })

  it('returns the original string when hrefs are all non-absolute (strict mode)', () => {
    const html = '<a href="page.html">x</a>'
    const result = run(html)
    expect(result).toBe(html)
  })

  it('returns the original string when the tag is not in the tags list', () => {
    const html = '<img src="https://example.com/img.jpg">'
    const result = run(html)
    expect(result).toBe(html)
  })
})
