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

  it('re-encodes & in text so entity-like caller text stays literal', () => {
    const html = '<p>&amp;nbsp; &amp;lt;b&amp;gt;</p>'

    expect(serialize(parse(html))).toBe(html)
    expect(serialize(parse(serialize(parse(html))))).toBe(html)
  })

  it('re-encodes & in attributes so URLs cannot change meaning', () => {
    const html = '<a href="javascript&amp;colon;alert(1)" title="&amp;copy;">x</a>'

    expect(serialize(parse(html))).toBe(html)
    expect(serialize(parse(serialize(parse(html))))).toBe(html)
  })

  it('writes the given entities in text nodes only', () => {
    const dom = parse('<p title="\u00A0">a\u00A0&amp;nbsp;</p><style>\u00A0</style><!--\u00A0-->')

    expect(serialize(dom, { entities: { '\u00A0': '&nbsp;' } }))
      .toBe('<p title="\u00A0">a&nbsp;&amp;nbsp;</p><style>\u00A0</style><!--\u00A0-->')
  })

  it('does not mutate the DOM', () => {
    const dom = parse('<p title="&amp;">&amp;</p>') as any
    serialize(dom)

    expect(dom[0].attribs.title).toBe('&')
    expect(dom[0].children[0].data).toBe('&')
  })

  it('keeps raw text unescaped when serializing raw-text element children', () => {
    const dom = parse('<style>a > b { content: "&" }</style>') as any

    expect(serialize(dom[0].children)).toBe('a > b { content: "&" }')
  })

  it('escapes <noscript> and <title> text, which the parser decodes', () => {
    const html = '<noscript>&lt;/noscript&gt;&lt;img src=x&gt;</noscript><title>&lt;/title&gt;&amp;</title>'

    expect(serialize(parse(html))).toBe(html)
  })

  it('escapes raw-text elements inside SVG and MathML, which the parser decodes', () => {
    const html = '<svg><style>&lt;/style&gt;</style><iframe>&lt;/iframe&gt;</iframe></svg><math><xmp>&lt;/xmp&gt;</xmp></math>'

    expect(serialize(parse(html))).toBe(html)
    expect(serialize((parse(html)[0] as any).children)).toBe('<style>&lt;/style&gt;</style><iframe>&lt;/iframe&gt;</iframe>')
  })

  it('keeps raw text inside HTML integration points in SVG', () => {
    const html = '<svg><foreignObject><style>a > b { content: "&" }</style></foreignObject></svg>'

    expect(serialize(parse(html))).toBe(html)
  })

  it('writes CDATA content unescaped', () => {
    const html = '<r><![CDATA[A & B]]></r>'

    expect(serialize(parse(html, { xmlMode: true } as any), { xmlMode: true })).toBe(html)
  })

  it('does not re-encode < or > inside <script> or <style>', () => {
    const dom = parse('<style>a > b { color: red; }</style>')

    expect(serialize(dom)).toBe('<style>a > b { color: red; }</style>')
  })

  it('encodes double quotes in attribute values by default', () => {
    const dom = parse(`<a href='{{ url "vip" }}'>VIP</a>`)

    expect(serialize(dom)).toBe('<a href="{{ url &quot;vip&quot; }}">VIP</a>')
  })

  it('single-quotes attribute values that contain double quotes', () => {
    const dom = parse(`<a title="x" href='{{ url "vip" }}'>VIP</a>`)

    expect(serialize(dom, { singleQuoteAttributes: true })).toBe(`<a title="x" href='{{ url "vip" }}'>VIP</a>`)
  })

  it('keeps encoded double quotes when the value also has single quotes', () => {
    const dom = parse(`<a title="it's &quot;x&quot;">X</a>`)

    expect(serialize(dom, { singleQuoteAttributes: true })).toBe(`<a title="it's &quot;x&quot;">X</a>`)
  })

  it('leaves private-use characters in other attributes alone', () => {
    const dom = parse(`<i data-icon="\uE000" title="it's"></i><a href='{{ url "vip" }}'>VIP</a>`)

    expect(serialize(dom, { singleQuoteAttributes: true })).toBe(`<i data-icon="\uE000" title="it's"></i><a href='{{ url "vip" }}'>VIP</a>`)
  })

  it('single-quotes attribute values when encoding entities', () => {
    const dom = parse(`<a href='{{ url "vip" }}'>VIP</a>`)

    expect(serialize(dom, { singleQuoteAttributes: true, encodeEntities: true })).toBe(`<a href='{{ url "vip" }}'>VIP</a>`)
  })

  it('leaves attribute values in the AST unchanged', () => {
    const dom = parse(`<a href='{{ url "vip" }}'>VIP</a>`)
    serialize(dom, { singleQuoteAttributes: true })

    expect((dom[0] as any).attribs.href).toBe('{{ url "vip" }}')
  })
})
