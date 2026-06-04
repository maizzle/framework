import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolve } from 'node:path'
import { inlineLink, inlineLinkDom } from '../../transformers/inlineLink.ts'
import { parse, serialize } from '../../utils/ast/index.ts'

function run(html: string, filePath?: string): Promise<string> {
  return inlineLink(html, filePath)
}

const fixturesDir = resolve(import.meta.dirname, 'fixtures')
const fakeFilePath = resolve(fixturesDir, 'template.html')

describe('inlineLink', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('local files', () => {
    it('inlines a local stylesheet', async () => {
      const html = '<link rel="stylesheet" href="test.css">'
      const result = await run(html, fakeFilePath)
      expect(result).toContain('<style>')
      expect(result).toContain('.test')
      expect(result).toContain('color: red')
      expect(result).not.toContain('<link')
    })

    it('resolves path relative to filePath', async () => {
      const html = '<link rel="stylesheet" href="./test.css">'
      const result = await run(html, fakeFilePath)
      expect(result).toContain('.test')
      expect(result).toContain('color: red')
    })

    it('leaves link unchanged if file does not exist', async () => {
      const html = '<link rel="stylesheet" href="missing.css">'
      const result = await run(html, fakeFilePath)
      expect(result).toContain('<link')
      expect(result).toContain('href="missing.css"')
    })

    it('inlines a top-level link whose parent is null (detached node)', async () => {
      const dom = parse('<link rel="stylesheet" href="test.css">')
      ;(dom[0] as any).parent = null
      const result = serialize(await inlineLinkDom(dom, fakeFilePath))
      expect(result).toContain('<style>')
      expect(result).toContain('.test')
      expect(result).not.toContain('<link')
    })

    it('skips local files when filePath is not provided', async () => {
      const html = '<link rel="stylesheet" href="test.css">'
      const result = await run(html)
      expect(result).toContain('<link')
      expect(result).toContain('href="test.css"')
    })
  })

  describe('remote URLs', () => {
    it('skips remote URLs without inline attribute', async () => {
      const html = '<link rel="stylesheet" href="https://example.com/styles.css">'
      const result = await run(html)
      expect(result).toContain('<link')
      expect(result).toContain('href="https://example.com/styles.css"')
    })

    it('inlines remote URL with inline attribute', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        text: () => Promise.resolve('body { margin: 0; }'),
      }))

      const html = '<link rel="stylesheet" href="https://example.com/styles.css" inline>'
      const result = await run(html)
      expect(result).toContain('<style>')
      expect(result).toContain('body { margin: 0; }')
      expect(result).not.toContain('<link')
    })

    it('handles http:// URLs with inline attribute', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        text: () => Promise.resolve('p { color: blue; }'),
      }))

      const html = '<link rel="stylesheet" href="http://example.com/styles.css" inline>'
      const result = await run(html)
      expect(result).toContain('<style>')
      expect(result).toContain('p { color: blue; }')
    })

    it('leaves link unchanged if fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

      const html = '<link rel="stylesheet" href="https://example.com/styles.css" inline>'
      const result = await run(html)
      expect(result).toContain('<link')
    })
  })

  describe('filtering', () => {
    it('ignores links without rel="stylesheet"', async () => {
      const html = '<link rel="icon" href="favicon.ico">'
      const result = await run(html, fakeFilePath)
      expect(result).toContain('<link')
      expect(result).toContain('rel="icon"')
    })

    it('ignores links without href', async () => {
      const html = '<link rel="stylesheet">'
      const result = await run(html, fakeFilePath)
      expect(result).toContain('<link')
    })
  })

  describe('edge cases', () => {
    it('handles multiple link tags', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        text: () => Promise.resolve('h1 { font-size: 24px; }'),
      }))

      const html = '<link rel="stylesheet" href="test.css"><link rel="stylesheet" href="https://example.com/remote.css" inline>'
      const result = await run(html, fakeFilePath)
      expect(result).toContain('color: red')
      expect(result).toContain('h1 { font-size: 24px; }')
      expect(result).not.toContain('<link')
    })

    it('returns unchanged DOM when no links present', async () => {
      const html = '<div>Hello</div>'
      const result = await run(html)
      expect(result).toBe('<div>Hello</div>')
    })

    it('handles link nested in head', async () => {
      const html = '<head><link rel="stylesheet" href="test.css"></head>'
      const result = await run(html, fakeFilePath)
      expect(result).toContain('<head><style>')
      expect(result).toContain('color: red')
      expect(result).toContain('</style></head>')
    })

    it('works without filePath - remote with inline still works', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        text: () => Promise.resolve('a { color: green; }'),
      }))

      const html = '<link rel="stylesheet" href="https://example.com/styles.css" inline>'
      const result = await run(html)
      expect(result).toContain('<style>')
      expect(result).toContain('a { color: green; }')
    })
  })
})
