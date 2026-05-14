import { describe, it, expect } from 'vitest'
import { parse, walk, serialize } from '../utils/ast/index.ts'

describe('parse', () => {
  it('parses a simple HTML string into AST nodes', () => {
    const dom = parse('<div>Hello</div>')

    expect(dom).toHaveLength(1)
    expect(dom[0].type).toBe('tag')
  })

  it('parses multiple root elements', () => {
    const dom = parse('<p>One</p><p>Two</p>')

    expect(dom).toHaveLength(2)
  })

  it('parses nested elements', () => {
    const dom = parse('<div><span>Nested</span></div>')
    const div = dom[0] as any

    expect(div.children).toHaveLength(1)
    expect(div.children[0].name).toBe('span')
  })

  it('handles empty input', () => {
    const dom = parse('')

    expect(dom).toHaveLength(0)
  })

  it('preserves attributes', () => {
    const dom = parse('<a href="https://example.com" class="link">Click</a>')
    const a = dom[0] as any

    expect(a.attribs.href).toBe('https://example.com')
    expect(a.attribs.class).toBe('link')
  })

  it('decodes HTML entities', () => {
    const dom = parse('<p>&amp; &lt; &gt;</p>')
    const p = dom[0] as any

    expect(p.children[0].data).toBe('& < >')
  })
})

describe('walk', () => {
  it('visits all nodes in the tree', () => {
    const dom = parse('<div><p>Text</p><span>More</span></div>')
    const visited: string[] = []

    walk(dom, (node) => {
      if (node.type === 'tag') {
        visited.push((node as any).name)
      }
    })

    expect(visited).toEqual(['div', 'p', 'span'])
  })

  it('visits text nodes', () => {
    const dom = parse('<p>Hello</p>')
    const texts: string[] = []

    walk(dom, (node) => {
      if (node.type === 'text') {
        texts.push((node as any).data)
      }
    })

    expect(texts).toEqual(['Hello'])
  })

  it('visits deeply nested nodes', () => {
    const dom = parse('<div><ul><li><a href="#">Link</a></li></ul></div>')
    const tags: string[] = []

    walk(dom, (node) => {
      if (node.type === 'tag') {
        tags.push((node as any).name)
      }
    })

    expect(tags).toEqual(['div', 'ul', 'li', 'a'])
  })

  it('handles empty AST', () => {
    const visited: unknown[] = []

    walk([], (node) => {
      visited.push(node)
    })

    expect(visited).toHaveLength(0)
  })

  it('allows mutation of nodes', () => {
    const dom = parse('<div class="old">Content</div>')

    walk(dom, (node) => {
      if (node.type === 'tag' && (node as any).attribs?.class === 'old') {
        (node as any).attribs.class = 'new'
      }
    })

    expect(serialize(dom)).toBe('<div class="new">Content</div>')
  })
})

describe('serialize', () => {
  it('serializes AST back to HTML', () => {
    const html = '<div><p>Hello</p></div>'
    const dom = parse(html)

    expect(serialize(dom)).toBe(html)
  })

  it('preserves attributes', () => {
    const html = '<a href="https://example.com" class="btn">Click</a>'
    const dom = parse(html)

    expect(serialize(dom)).toBe(html)
  })

  it('preserves self-closing tags', () => {
    const dom = parse('<br><hr><img src="test.png">')

    expect(serialize(dom)).toBe('<br><hr><img src="test.png">')
  })

  it('handles empty AST', () => {
    expect(serialize([])).toBe('')
  })

  it('roundtrips complex HTML', () => {
    const html = '<table><tr><td style="padding: 10px;">Cell</td></tr></table>'
    const dom = parse(html)

    expect(serialize(dom)).toBe(html)
  })

  it('re-encodes < and > in text nodes so escaped markup does not leak as DOM', () => {
    const dom = parse('<div>&lt;p&gt;Hello&lt;/p&gt;</div>')

    expect(serialize(dom)).toBe('<div>&lt;p&gt;Hello&lt;/p&gt;</div>')
  })

  it('leaves & in text nodes untouched (entities transformer relies on it)', () => {
    const dom = parse('<p>foo</p>')
    const p = dom[0] as any
    p.children[0].data = '&nbsp;'

    expect(serialize(dom)).toBe('<p>&nbsp;</p>')
  })

  it('does not re-encode < or > inside <script> or <style>', () => {
    const dom = parse('<style>a > b { color: red; }</style>')

    expect(serialize(dom)).toBe('<style>a > b { color: red; }</style>')
  })
})
