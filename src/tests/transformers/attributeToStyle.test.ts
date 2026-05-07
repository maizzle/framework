import { describe, it, expect } from 'vitest'
import { attributeToStyle } from '../../transformers/attributeToStyle.ts'

function run(html: string, attributes?: boolean | string[]): string {
  return attributeToStyle(html, attributes)
}

describe('attributeToStyle', () => {
  describe('argument', () => {
    it('returns unchanged when attributes is false', () => {
      const html = '<table width="100%"></table>'
      expect(run(html, false)).toBe(html)
    })

    it('returns unchanged when attributes is an empty array', () => {
      const html = '<table width="100%"></table>'
      expect(run(html, [])).toBe(html)
    })

    it('processes all defaults when attributes is true', () => {
      const html = '<table width="100%" height="200" bgcolor="#fff" background="image.jpg" align="center" valign="top"></table>'
      const result = run(html, true)
      expect(result).toContain('style="width: 100%; height: 200px; background-color: #fff; background-image: url(\'image.jpg\'); margin-left: auto; margin-right: auto; vertical-align: top"')
    })

    it('processes all defaults when attributes is omitted', () => {
      const html = '<table bgcolor="#fff"></table>'
      expect(attributeToStyle(html)).toContain('style="background-color: #fff"')
    })
  })

  describe('width attribute', () => {
    it('converts width attribute to style with percentage value', () => {
      const html = '<table width="100%"></table>'
      const result = run(html, ['width'])
      expect(result).toBe('<table width="100%" style="width: 100%"></table>')
    })

    it('converts width attribute to style with px value', () => {
      const html = '<table width="600"></table>'
      const result = run(html, ['width'])
      expect(result).toBe('<table width="600" style="width: 600px"></table>')
    })

    it('preserves existing px unit', () => {
      const html = '<table width="600px"></table>'
      const result = run(html, ['width'])
      expect(result).toBe('<table width="600px" style="width: 600px"></table>')
    })
  })

  describe('height attribute', () => {
    it('converts height attribute to style with percentage value', () => {
      const html = '<table height="50%"></table>'
      const result = run(html, ['height'])
      expect(result).toBe('<table height="50%" style="height: 50%"></table>')
    })

    it('converts height attribute to style with px value', () => {
      const html = '<table height="200"></table>'
      const result = run(html, ['height'])
      expect(result).toBe('<table height="200" style="height: 200px"></table>')
    })
  })

  describe('bgcolor attribute', () => {
    it('converts bgcolor to background-color', () => {
      const html = '<table bgcolor="#ffffff"></table>'
      const result = run(html, ['bgcolor'])
      expect(result).toBe('<table bgcolor="#ffffff" style="background-color: #ffffff"></table>')
    })

    it('converts bgcolor with named color', () => {
      const html = '<td bgcolor="red"></td>'
      const result = run(html, ['bgcolor'])
      expect(result).toBe('<td bgcolor="red" style="background-color: red"></td>')
    })
  })

  describe('background attribute', () => {
    it('converts background to background-image', () => {
      const html = '<td background="image.jpg"></td>'
      const result = run(html, ['background'])
      expect(result).toBe(`<td background="image.jpg" style="background-image: url('image.jpg')"></td>`)
    })
  })

  describe('align attribute', () => {
    it('converts align to text-align on non-table elements', () => {
      const html = '<p align="center"></p>'
      const result = run(html, ['align'])
      expect(result).toBe('<p align="center" style="text-align: center"></p>')
    })

    it('converts align="left" to float on table elements', () => {
      const html = '<table align="left"></table>'
      const result = run(html, ['align'])
      expect(result).toBe('<table align="left" style="float: left"></table>')
    })

    it('converts align="right" to float on table elements', () => {
      const html = '<table align="right"></table>'
      const result = run(html, ['align'])
      expect(result).toBe('<table align="right" style="float: right"></table>')
    })

    it('converts align="center" to margin auto on table elements', () => {
      const html = '<table align="center"></table>'
      const result = run(html, ['align'])
      expect(result).toBe('<table align="center" style="margin-left: auto; margin-right: auto"></table>')
    })
  })

  describe('valign attribute', () => {
    it('converts valign to vertical-align', () => {
      const html = '<td valign="top"></td>'
      const result = run(html, ['valign'])
      expect(result).toBe('<td valign="top" style="vertical-align: top"></td>')
    })

    it('converts valign="middle"', () => {
      const html = '<td valign="middle"></td>'
      const result = run(html, ['valign'])
      expect(result).toBe('<td valign="middle" style="vertical-align: middle"></td>')
    })
  })

  describe('multiple attributes', () => {
    it('handles multiple attributes on the same element', () => {
      const html = '<table width="600" height="200" bgcolor="#fff"></table>'
      const result = run(html, ['width', 'height', 'bgcolor'])
      expect(result).toBe('<table width="600" height="200" bgcolor="#fff" style="width: 600px; height: 200px; background-color: #fff"></table>')
    })

    it('appends to existing style attribute', () => {
      const html = '<table width="600" style="border: 1px solid black"></table>'
      const result = run(html, ['width'])
      expect(result).toBe('<table width="600" style="border: 1px solid black; width: 600px"></table>')
    })

    it('handles existing style without trailing semicolon', () => {
      const html = '<table width="600" style="border: 1px solid black;"></table>'
      const result = run(html, ['width'])
      expect(result).toBe('<table width="600" style="border: 1px solid black;; width: 600px"></table>')
    })
  })

  describe('nested elements', () => {
    it('processes attributes on nested elements', () => {
      const html = '<table width="100%"><tr><td height="50">Content</td></tr></table>'
      const result = run(html, ['width', 'height'])
      expect(result).toContain('<table width="100%" style="width: 100%">')
      expect(result).toContain('<td height="50" style="height: 50px">')
    })
  })

  describe('short-circuit behavior', () => {
    it('returns original string when no matching attributes found', () => {
      const html = '<table><tr><td>Content</td></tr></table>'
      const result = run(html, ['width'])
      expect(result).toBe(html)
    })

    it('returns original string when configured attributes are not present', () => {
      const html = '<table height="200"></table>'
      const result = run(html, ['width'])
      expect(result).toBe(html)
    })
  })
})
