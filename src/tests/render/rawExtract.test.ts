import { describe, it, expect } from 'vitest'
import { rawExtract } from '../../render/plugins/rawExtract.ts'

const plugin = rawExtract()
const transform = (code: string, id = '/x/a.vue') =>
  (plugin.transform as any)(code, id) as { code: string } | undefined

describe('rawExtract', () => {
  it('moves slot content into an escaped content prop', () => {
    const result = transform('<Raw>{{ firstName }}</Raw>')
    expect(result?.code).toContain('content="{{ firstName }}"')
  })

  it('escapes HTML in the slot content', () => {
    const result = transform('<Raw><b>{{ x }}</b></Raw>')
    expect(result?.code).toContain('&lt;b&gt;{{ x }}&lt;/b&gt;')
  })

  it('dedents indented slot content', () => {
    const result = transform('<Raw>\n    line one\n    line two\n  </Raw>')
    expect(result?.code).toContain('content="line one\nline two"')
  })

  it('leaves a tag that already has a :content binding untouched', () => {
    const code = '<Raw :content="foo">ignored</Raw>'
    expect(transform(code)).toBeUndefined()
  })

  it('leaves a Raw tag with empty content untouched', () => {
    const code = '<Raw>   \n  </Raw>'
    expect(transform(code)).toBeUndefined()
  })

  it('skips files that do not mention Raw', () => {
    expect(transform('<div>nope</div>')).toBeUndefined()
  })

  it('skips non-vue/md files', () => {
    expect(transform('<Raw>x</Raw>', '/x/a.ts')).toBeUndefined()
  })
})
