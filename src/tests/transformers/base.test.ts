import { describe, it, expect } from 'vitest'
import { base, type BaseUrlOptions } from '../../transformers/base.ts'
import type { UrlConfig } from '../../types/config.ts'

function run(html: string, config: { url?: UrlConfig } = {}): string {
  const baseOption = config.url?.base
  if (!baseOption) return html
  return base(html, baseOption as string | BaseUrlOptions)
}

describe('base URL', () => {
  describe('default behavior', () => {
    it('does nothing when url.base is not set', () => {
      const html = '<img src="image.jpg">'
      expect(run(html)).toBe(html)
    })

    it('does nothing when url.base is false', () => {
      const html = '<img src="image.jpg">'
      expect(run(html, { url: { base: false as unknown as undefined } })).toBe(html)
    })

    it('does nothing when url.base is empty string', () => {
      const html = '<img src="image.jpg">'
      expect(run(html, { url: { base: '' } })).toBe(html)
    })
  })

  describe('string url.base', () => {
    it('prepends base URL to img src', () => {
      const result = run('<img src="image.jpg">', { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<img src="https://cdn.example.com/image.jpg">')
    })

    it('prepends base URL to anchor href', () => {
      const result = run('<a href="page.html">Link</a>', { url: { base: 'https://example.com/' } })
      expect(result).toBe('<a href="https://example.com/page.html">Link</a>')
    })

    it('prepends base URL to multiple img src', () => {
      const html = '<img src="a.jpg"><img src="b.jpg">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://cdn.example.com/a.jpg"')
      expect(result).toContain('src="https://cdn.example.com/b.jpg"')
    })

    it('does not modify absolute URLs', () => {
      const html = '<img src="https://other.com/image.jpg">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe(html)
    })

    it('does not modify data URIs', () => {
      const html = '<img src="data:image/png;base64,abc123">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe(html)
    })

    it('handles mailto: URLs', () => {
      const html = '<a href="mailto:test@example.com">Email</a>'
      const result = run(html, { url: { base: 'https://example.com/' } })
      expect(result).toBe(html)
    })

    it('handles tel: URLs', () => {
      const html = '<a href="tel:+1234567890">Call</a>'
      const result = run(html, { url: { base: 'https://example.com/' } })
      expect(result).toBe(html)
    })

    it('does not modify protocol-relative URLs', () => {
      const html = '<img src="//cdn.example.com/image.jpg">'
      const result = run(html, { url: { base: 'https://example.com/' } })
      expect(result).toBe(html)
    })

    it('does not modify fragment-only URLs', () => {
      const html = '<a href="#section">Jump</a>'
      const result = run(html, { url: { base: 'https://example.com/' } })
      expect(result).toBe(html)
    })

    it('does not modify query-only URLs', () => {
      const html = '<a href="?param=value">Link</a>'
      const result = run(html, { url: { base: 'https://example.com/' } })
      expect(result).toBe(html)
    })
  })

  describe('srcset attribute', () => {
    it('prepends base URL to srcset URLs', () => {
      const html = '<img srcset="image.jpg 1x, image@2x.jpg 2x">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<img srcset="https://cdn.example.com/image.jpg 1x, https://cdn.example.com/image@2x.jpg 2x">')
    })

    it('preserves width descriptors in srcset', () => {
      const html = '<img srcset="small.jpg 320w, large.jpg 1024w">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<img srcset="https://cdn.example.com/small.jpg 320w, https://cdn.example.com/large.jpg 1024w">')
    })

    it('does not modify absolute URLs in srcset', () => {
      const html = '<img srcset="https://other.com/image.jpg 1x">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe(html)
    })
  })

  describe('video elements', () => {
    it('prepends base URL to video src', () => {
      const html = '<video src="video.mp4"></video>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<video src="https://cdn.example.com/video.mp4"></video>')
    })

    it('prepends base URL to video poster', () => {
      const html = '<video poster="poster.jpg"></video>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<video poster="https://cdn.example.com/poster.jpg"></video>')
    })
  })

  describe('source elements', () => {
    it('prepends base URL to source src', () => {
      const html = '<source src="video.mp4">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<source src="https://cdn.example.com/video.mp4">')
    })

    it('prepends base URL to source srcset', () => {
      const html = '<source srcset="video.mp4">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<source srcset="https://cdn.example.com/video.mp4">')
    })
  })

  describe('link elements', () => {
    it('prepends base URL to link href', () => {
      const html = '<link rel="stylesheet" href="styles.css">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<link rel="stylesheet" href="https://cdn.example.com/styles.css">')
    })
  })

  describe('script elements', () => {
    it('prepends base URL to script src', () => {
      const html = '<script src="app.js"></script>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<script src="https://cdn.example.com/app.js"></script>')
    })
  })

  describe('object and embed elements', () => {
    it('prepends base URL to object data', () => {
      const html = '<object data="file.swf"></object>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<object data="https://cdn.example.com/file.swf"></object>')
    })

    it('prepends base URL to embed src', () => {
      const html = '<embed src="file.swf">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<embed src="https://cdn.example.com/file.swf">')
    })
  })

  describe('iframe elements', () => {
    it('prepends base URL to iframe src', () => {
      const html = '<iframe src="page.html"></iframe>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<iframe src="https://cdn.example.com/page.html"></iframe>')
    })
  })

  describe('CSS in style attribute', () => {
    it('prepends base URL to url() in style attribute', () => {
      const html = '<div style="background-image: url(bg.jpg)"></div>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('url(https://cdn.example.com/bg.jpg)')
    })

    it('prepends base URL to background in style attribute', () => {
      const html = '<div style="background: url(bg.jpg)"></div>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('url(https://cdn.example.com/bg.jpg)')
    })

    it('does not process style without url()', () => {
      const html = '<div style="color: red; font-size: 16px"></div>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe(html)
    })

    it('handles quoted url() in style attribute', () => {
      const html = '<div style="background: url(\'bg.jpg\')"></div>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('https://cdn.example.com/bg.jpg')
    })

    it('does not modify absolute url() in style attribute', () => {
      const html = '<div style="background: url(https://other.com/bg.jpg)"></div>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('url(https://other.com/bg.jpg)')
    })
  })

  describe('CSS in style tags', () => {
    it('prepends base URL to url() in style tags', () => {
      const html = '<style>.bg { background-image: url(bg.jpg) }</style>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('url(https://cdn.example.com/bg.jpg)')
    })

    it('handles @font-face url() in style tags', () => {
      const html = '<style>@font-face { src: url(font.woff2); }</style>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('url(https://cdn.example.com/font.woff2)')
    })

    it('handles multiple url() in a single declaration', () => {
      const html = '<style>.bg { background: url(a.jpg), url(b.jpg) }</style>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('url(https://cdn.example.com/a.jpg)')
      expect(result).toContain('url(https://cdn.example.com/b.jpg)')
    })

    it('does not modify absolute url() in style tags', () => {
      const html = '<style>.bg { background: url(https://other.com/bg.jpg) }</style>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('url(https://other.com/bg.jpg)')
    })

    it('handles multiple style tags', () => {
      const html = '<style>.a { background: url(a.jpg) }</style><style>.b { background: url(b.jpg) }</style>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('url(https://cdn.example.com/a.jpg)')
      expect(result).toContain('url(https://cdn.example.com/b.jpg)')
    })

    it('does not modify style tag without url()', () => {
      const html = '<style>.text { color: red }</style>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe(html)
    })
  })

  describe('inlineCss option', () => {
    it('disables CSS processing in style attribute when inlineCss is false', () => {
      const html = '<div style="background-image: url(bg.jpg)"></div>'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/', inlineCss: false } } })
      expect(result).toContain('url(bg.jpg)')
      expect(result).not.toContain('url(https://cdn.example.com/bg.jpg)')
    })

    it('still processes style tags when only inlineCss is false', () => {
      const html = '<style>.bg { background: url(bg.jpg) }</style><div style="background: url(bg.jpg)"></div>'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/', inlineCss: false } } })
      expect(result).toContain('<style>.bg { background: url(https://cdn.example.com/bg.jpg) }</style>')
      expect(result).toContain('style="background: url(bg.jpg)"')
    })
  })

  describe('styleTag option', () => {
    it('disables CSS processing in style tags when styleTag is false', () => {
      const html = '<style>.bg { background-image: url(bg.jpg) }</style>'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/', styleTag: false } } })
      expect(result).toContain('url(bg.jpg)')
      expect(result).not.toContain('url(https://cdn.example.com/bg.jpg)')
    })

    it('still processes inline styles when only styleTag is false', () => {
      const html = '<style>.bg { background: url(bg.jpg) }</style><div style="background: url(inline.jpg)"></div>'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/', styleTag: false } } })
      expect(result).toContain('url(bg.jpg)')
      expect(result).toContain('url(https://cdn.example.com/inline.jpg)')
    })
  })

  describe('tags option', () => {
    it('applies base URL only to specified tags (array)', () => {
      const html = '<img src="a.jpg"><a href="b.html">Link</a>'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/', tags: ['img'] } } })
      expect(result).toContain('src="https://cdn.example.com/a.jpg"')
      expect(result).toContain('href="b.html"')
    })

    it('accepts array of multiple tags', () => {
      const html = '<img src="a.jpg"><script src="b.js"></script>'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/', tags: ['img', 'script'] } } })
      expect(result).toContain('src="https://cdn.example.com/a.jpg"')
      expect(result).toContain('src="https://cdn.example.com/b.js"')
    })

    it('accepts object-format tags with per-attribute config', () => {
      const html = '<img src="a.jpg" srcset="b.jpg 1x"><a href="page.html">Link</a>'
      const result = run(html, {
        url: {
          base: {
            url: 'https://cdn.example.com/',
            tags: {
              img: { src: true, srcset: true },
            },
          },
        },
      })
      expect(result).toContain('src="https://cdn.example.com/a.jpg"')
      expect(result).toContain('srcset="https://cdn.example.com/b.jpg 1x"')
      // <a> not in the tags config, should be untouched
      expect(result).toContain('href="page.html"')
    })

    it('supports per-attribute custom base URL in object-format tags', () => {
      const html = '<img src="photo.jpg">'
      const result = run(html, {
        url: {
          base: {
            url: 'https://cdn.example.com/',
            tags: {
              img: { src: 'https://images.example.com/' },
            },
          },
        },
      })
      expect(result).toContain('src="https://images.example.com/photo.jpg"')
    })

    it('uses custom per-attribute URL for srcset', () => {
      const html = '<img srcset="small.jpg 320w, large.jpg 1024w">'
      const result = run(html, {
        url: {
          base: {
            url: 'https://cdn.example.com/',
            tags: {
              img: { srcset: 'https://images.example.com/' },
            },
          },
        },
      })
      expect(result).toContain('https://images.example.com/small.jpg 320w')
      expect(result).toContain('https://images.example.com/large.jpg 1024w')
    })

    it('skips attributes not listed in object-format tag config', () => {
      const html = '<img src="photo.jpg" srcset="photo.jpg 1x">'
      const result = run(html, {
        url: {
          base: {
            url: 'https://cdn.example.com/',
            tags: {
              img: { src: true },
            },
          },
        },
      })
      expect(result).toContain('src="https://cdn.example.com/photo.jpg"')
      expect(result).toContain('srcset="photo.jpg 1x"')
    })
  })

  describe('custom attributes', () => {
    it('prepends base URL to custom attributes', () => {
      const html = '<div data-url="file.txt"></div>'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/', attributes: { 'data-url': 'https://cdn.example.com/' } } } })
      expect(result).toContain('data-url="https://cdn.example.com/file.txt"')
    })

    it('does not modify absolute custom attributes', () => {
      const html = '<div data-url="https://other.com/file.txt"></div>'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/', attributes: { 'data-url': 'https://cdn.example.com/' } } } })
      expect(result).toContain('data-url="https://other.com/file.txt"')
    })

    it('custom attributes work regardless of tags filter', () => {
      const html = '<div data-bg="bg.jpg"></div>'
      const result = run(html, {
        url: {
          base: {
            url: 'https://cdn.example.com/',
            tags: ['img'],
            attributes: { 'data-bg': 'https://assets.example.com/' },
          },
        },
      })
      expect(result).toContain('data-bg="https://assets.example.com/bg.jpg"')
    })
  })

  describe('VML elements', () => {
    it('handles v:image elements', () => {
      const html = '<v:image src="image.png"/>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://cdn.example.com/image.png"')
    })

    it('handles v:fill elements', () => {
      const html = '<v:fill src="bg.png"/>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://cdn.example.com/bg.png"')
    })

    it('handles v:image inside MSO comments', () => {
      const html = '<!--[if gte vml 1]><v:image src="image.png"/><![endif]-->'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://cdn.example.com/image.png"')
    })

    it('handles v:fill inside MSO comments', () => {
      const html = '<!--[if gte vml 1]><v:fill src="bg.png"/><![endif]-->'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://cdn.example.com/bg.png"')
    })

    it('does not modify absolute v:image URLs', () => {
      const html = '<v:image src="https://other.com/image.png"/>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://other.com/image.png"')
    })

    it('does not modify absolute v:fill URLs', () => {
      const html = '<v:fill src="https://other.com/bg.png"/>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://other.com/bg.png"')
    })
  })

  describe('MSO comments', () => {
    it('handles URLs inside MSO conditional comments', () => {
      const html = '<!--[if mso]><img src="a.jpg"><![endif]-->'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://cdn.example.com/a.jpg"')
    })

    it('does not modify absolute URLs in MSO comments', () => {
      const html = '<!--[if mso]><img src="https://other.com/a.jpg"><![endif]-->'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://other.com/a.jpg"')
    })

    it('rewrites srcset inside MSO comments', () => {
      const html = '<!--[if mso]><img srcset="small.jpg 1x, large.jpg 2x"><![endif]-->'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('https://cdn.example.com/small.jpg 1x')
      expect(result).toContain('https://cdn.example.com/large.jpg 2x')
    })

    it('rewrites style url() inside MSO comments', () => {
      const html = '<!--[if mso]><div style="background: url(bg.jpg)"></div><![endif]-->'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('url(https://cdn.example.com/bg.jpg)')
    })

    it('does not modify style without url() inside MSO comments', () => {
      const html = '<!--[if mso]><div style="color: red"></div><![endif]-->'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('style="color: red"')
    })

    it('rewrites multiple attributes inside MSO comments', () => {
      const html = '<!--[if mso]><a href="page.html"><img src="a.jpg"></a><![endif]-->'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('href="https://cdn.example.com/page.html"')
      expect(result).toContain('src="https://cdn.example.com/a.jpg"')
    })
  })

  describe('trailing slash handling', () => {
    it('handles base URL without trailing slash', () => {
      const html = '<img src="folder/image.jpg">'
      const result = run(html, { url: { base: 'https://cdn.example.com' } })
      expect(result).toBe('<img src="https://cdn.example.comfolder/image.jpg">')
    })

    it('handles absolute URLs correctly', () => {
      const html = '<img src="/folder/image.jpg">'
      const result = run(html, { url: { base: 'https://cdn.example.com/img/' } })
      expect(result).toBe('<img src="https://cdn.example.com/img//folder/image.jpg">')
    })
  })

  describe('object-format base config', () => {
    it('works with url property', () => {
      const html = '<img src="a.jpg">'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/' } } })
      expect(result).toContain('src="https://cdn.example.com/a.jpg"')
    })

    it('short-circuits when url is empty string', () => {
      const html = '<img src="a.jpg">'
      const result = run(html, { url: { base: { url: '' } } })
      expect(result).toBe(html)
    })

    it('short-circuits when object has no url property', () => {
      const html = '<img src="a.jpg">'
      const result = run(html, { url: { base: { tags: ['img'] } as any } })
      expect(result).toBe(html)
    })

    it('defaults styleTag and inlineCss to true', () => {
      const html = '<style>.bg { background: url(a.jpg) }</style><div style="background: url(b.jpg)"></div>'
      const result = run(html, { url: { base: { url: 'https://cdn.example.com/' } } })
      expect(result).toContain('url(https://cdn.example.com/a.jpg)')
      expect(result).toContain('url(https://cdn.example.com/b.jpg)')
    })
  })

  describe('edge cases', () => {
    it('handles empty HTML', () => {
      expect(run('', { url: { base: 'https://cdn.example.com/' } })).toBe('')
    })

    it('handles HTML with no matching elements', () => {
      const html = '<div>Content</div>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe(html)
    })

    it('handles elements without attributes', () => {
      const html = '<div><span>Text</span></div>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe(html)
    })

    it('preserves existing attributes', () => {
      const html = '<img src="a.jpg" alt="Photo" class="img">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('alt="Photo"')
      expect(result).toContain('class="img"')
    })

    it('skips empty attribute values', () => {
      const html = '<img src="">'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toBe('<img src>')
    })

    it('handles mixed absolute and relative URLs in the same document', () => {
      const html = '<img src="local.jpg"><img src="https://other.com/remote.jpg"><a href="page.html">Link</a><a href="mailto:test@test.com">Email</a>'
      const result = run(html, { url: { base: 'https://cdn.example.com/' } })
      expect(result).toContain('src="https://cdn.example.com/local.jpg"')
      expect(result).toContain('src="https://other.com/remote.jpg"')
      expect(result).toContain('href="https://cdn.example.com/page.html"')
      expect(result).toContain('href="mailto:test@test.com"')
    })
  })
})
