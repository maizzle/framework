import { describe, it, expect } from 'vitest'
import { codeBlockExtract } from '../../render/plugins/codeBlockExtract.ts'

const plugin = codeBlockExtract()
const transform = (code: string, id = '/x/a.vue') =>
  (plugin.transform as any)(code, id) as { code: string } | undefined

describe('codeBlockExtract', () => {
  it('moves slot content into an escaped code prop', () => {
    const result = transform('<CodeBlock><div>{{ x }}</div></CodeBlock>')
    expect(result?.code).toContain('code="&lt;div&gt;{{ x }}&lt;/div&gt;"')
  })

  it('dedents indented slot content', () => {
    const result = transform('<CodeBlock>\n    a\n    b\n  </CodeBlock>')
    expect(result?.code).toContain('code="a\nb"')
  })

  it('handles the kebab-case <code-block> tag', () => {
    const result = transform('<code-block>x</code-block>')
    expect(result?.code).toContain('code="x"')
  })

  it('leaves a tag that already has a :code binding untouched', () => {
    expect(transform('<CodeBlock :code="src">ignored</CodeBlock>')).toBeUndefined()
  })

  it('leaves a CodeBlock with empty content untouched', () => {
    expect(transform('<CodeBlock>   \n  </CodeBlock>')).toBeUndefined()
  })

  it('skips files that do not mention CodeBlock', () => {
    expect(transform('<div>nope</div>')).toBeUndefined()
  })

  it('skips non-vue/md files', () => {
    expect(transform('<CodeBlock>x</CodeBlock>', '/x/a.ts')).toBeUndefined()
  })
})
