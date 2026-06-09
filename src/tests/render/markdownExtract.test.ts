import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { markdownExtract } from '../../render/plugins/markdownExtract.ts'

const plugin = markdownExtract()
const transform = (code: string, id: string) =>
  (plugin.transform as any)(code, id) as { code: string } | undefined

describe('markdownExtract', () => {
  it('moves slot content into a content prop', () => {
    const result = transform('<Markdown>**hi**</Markdown>', '/x/a.vue')
    expect(result?.code).toContain('content="**hi**"')
  })

  it('leaves a tag that already has a :content binding untouched', () => {
    expect(transform('<Markdown :content="md">ignored</Markdown>', '/x/a.vue')).toBeUndefined()
  })

  it('leaves a Markdown tag with empty content untouched', () => {
    expect(transform('<Markdown>   \n  </Markdown>', '/x/a.vue')).toBeUndefined()
  })

  it('skips files that mention neither Markdown nor markdown', () => {
    expect(transform('<div>nope</div>', '/x/a.vue')).toBeUndefined()
  })

  it('skips non-vue/md files', () => {
    expect(transform('<Markdown>hi</Markdown>', '/x/a.ts')).toBeUndefined()
  })

  it('inlines file content for <Markdown src="..." />', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mdx-'))
    try {
      writeFileSync(join(dir, 'note.md'), '# Title')
      const result = transform('<Markdown src="./note.md" />', join(dir, 'page.vue'))
      expect(result?.code).toContain('content="# Title"')
      expect(result?.code).not.toContain('src=')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('leaves a tag that already has a plain content attribute untouched', () => {
    expect(transform('<Markdown content="x">ignored</Markdown>', '/x/a.vue')).toBeUndefined()
  })

  it('does not emit duplicate content when src and slot are both present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mdx-'))
    try {
      writeFileSync(join(dir, 'note.md'), '# File')
      const result = transform('<Markdown src="./note.md">slot</Markdown>', join(dir, 'page.vue'))
      expect(result?.code).toContain('content="# File"')
      expect(result?.code).not.toContain('src=')
      expect((result?.code.match(/content=/g) ?? []).length).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('leaves the tag untouched when the src file cannot be read', () => {
    const code = '<Markdown src="./missing.md" />'
    expect(transform(code, '/x/page.vue')).toBeUndefined()
  })
})
