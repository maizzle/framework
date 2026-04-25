import { describe, it, expect } from 'vitest'
import { parse, serialize, walk } from '../../utils/ast/index.ts'
import { injectFonts } from '../../render/injectFonts.ts'
import type { FontRegistration } from '../../composables/renderContext.ts'

const ROBOTO: FontRegistration = {
  family: 'Roboto',
  slug: 'roboto',
  declaration: "'Roboto', Verdana, sans-serif",
  url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap',
}

function run(html: string, fonts: FontRegistration[]): string {
  const dom = parse(html)
  injectFonts(dom, fonts, parse, walk)
  return serialize(dom)
}

describe('injectFonts', () => {
  it('appends a <link> tag inside <head>', () => {
    const out = run('<html><head></head><body></body></html>', [ROBOTO])
    expect(out).toContain(`<link href="${ROBOTO.url}" rel="stylesheet" media="screen">`)
    expect(out.indexOf('<link')).toBeLessThan(out.indexOf('</head>'))
  })

  it('merges @theme into the existing Tailwind <style> block', () => {
    const html = `<html><head><style>@import "@maizzle/tailwindcss";\n.foo{color:red}</style></head><body></body></html>`
    const out = run(html, [ROBOTO])
    expect(out).toContain('@import "@maizzle/tailwindcss"')
    expect(out).toContain('@theme {')
    expect(out).toContain("--font-roboto: 'Roboto', Verdana, sans-serif;")
    // theme block lives inside the same <style>
    const styleMatch = out.match(/<style>([\s\S]*?)<\/style>/)
    expect(styleMatch?.[1]).toContain('@import')
    expect(styleMatch?.[1]).toContain('@theme')
  })

  it('also matches plain @import "tailwindcss"', () => {
    const html = `<html><head><style>@import "tailwindcss";</style></head><body></body></html>`
    const out = run(html, [ROBOTO])
    const styleMatch = out.match(/<style>([\s\S]*?)<\/style>/)
    expect(styleMatch?.[1]).toContain('@theme')
  })

  it('matches HTML-entity-encoded quotes (Vue SSR output)', () => {
    const html = `<html><head><style>@import &quot;@maizzle/tailwindcss&quot;;</style></head><body></body></html>`
    const out = run(html, [ROBOTO])
    const styleMatch = out.match(/<style>([\s\S]*?)<\/style>/)
    expect(styleMatch?.[1]).toContain('@theme')
  })

  it('falls back to :root in a new <style> when no Tailwind import exists', () => {
    const out = run('<html><head></head><body></body></html>', [ROBOTO])
    expect(out).toContain(':root {')
    expect(out).toContain("--font-roboto: 'Roboto', Verdana, sans-serif;")
    expect(out).not.toContain('@theme')
  })

  it('emits one @theme block with all registered fonts', () => {
    const html = `<html><head><style>@import "tailwindcss";</style></head><body></body></html>`
    const out = run(html, [
      ROBOTO,
      { family: 'Inter', slug: 'inter', declaration: "'Inter'", url: 'https://example.com/inter.css' },
    ])
    expect(out).toContain('--font-roboto:')
    expect(out).toContain('--font-inter:')
    expect((out.match(/@theme/g) || []).length).toBe(1)
    expect((out.match(/<link /g) || []).length).toBe(2)
  })

  it('is a no-op when fonts is empty', () => {
    const html = '<html><head></head><body></body></html>'
    expect(run(html, [])).toBe(html)
  })

  it('is a no-op when no <head> exists', () => {
    const html = '<div>no head</div>'
    expect(run(html, [ROBOTO])).toBe(html)
  })
})
