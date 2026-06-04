import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Img from '../../components/Img.vue'
import { useOutlookFallback } from '../../composables/useOutlookFallback'

function renderSsr(props: Record<string, unknown>) {
  const app = createSSRApp({
    render: () => h(Img, props as any),
  })
  return renderToString(app)
}

/** SSR HTML-escapes apostrophes inside attribute values. */
const decodeApos = (html: string) => html.replace(/&#39;/g, "'")

describe('Img', () => {
  describe('basic rendering', () => {
    it('renders an img element', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100 } })
      expect(wrapper.find('img').exists()).toBe(true)
    })

    it('sets the src attribute', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100 } })
      expect(wrapper.find('img').attributes('src')).toBe('img.png')
    })

    it('sets alt text', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100, alt: 'Alt Text!' } })
      expect(wrapper.find('img').attributes('alt')).toBe('Alt Text!')
    })

    it('defaults alt to empty string', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100 } })
      expect(wrapper.find('img').attributes('alt')).toBe('')
    })

    it('applies max-w-full and align-middle utilities', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100 } })
      const cls = wrapper.find('img').classes()
      expect(cls).toContain('max-w-full')
      expect(cls).toContain('align-middle')
    })

    it('does not wrap in picture element without darkSrc or motionSrc', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100 } })
      expect(wrapper.find('picture').exists()).toBe(false)
    })

    it('passes extra attributes to img', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100 }, attrs: { height: '50', loading: 'lazy' } })
      const img = wrapper.find('img')
      expect(img.attributes('height')).toBe('50')
      expect(img.attributes('loading')).toBe('lazy')
    })

    it('passes extra attributes to img inside picture', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.png', width: 100, darkSrc: 'dark.png' },
        attrs: { height: '50', loading: 'lazy' }
      })
      const img = wrapper.find('picture img')
      expect(img.attributes('height')).toBe('50')
      expect(img.attributes('loading')).toBe('lazy')
    })

    it('does not pass extra attributes to picture element', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.png', width: 100, darkSrc: 'dark.png' },
        attrs: { loading: 'lazy' }
      })
      expect(wrapper.find('picture').attributes('loading')).toBeUndefined()
    })
  })

  describe('width prop', () => {
    it('renders width as number without units', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 200 } })
      expect(wrapper.find('img').attributes('width')).toBe('200')
    })

    it('strips px suffix from string value', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: '200px' } })
      expect(wrapper.find('img').attributes('width')).toBe('200')
    })

    it('accepts string number without units', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: '300' } })
      expect(wrapper.find('img').attributes('width')).toBe('300')
    })

    it('renders width on img inside picture element', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 250, darkSrc: 'dark.png' } })
      expect(wrapper.find('picture img').attributes('width')).toBe('250')
    })

    it('does not emit the auto-width marker when a width is set', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 200 } })
      expect(wrapper.find('img').attributes('data-maizzle-img-width')).toBeUndefined()
    })
  })

  describe('auto width (no width prop)', () => {
    it('omits the width attribute and emits the auto-width marker', () => {
      const wrapper = mount(Img, { props: { src: 'img.png' } })
      const img = wrapper.find('img')
      expect(img.attributes('width')).toBeUndefined()
      expect(img.attributes('data-maizzle-img-width')).toBe('')
    })

    it('marks the img inside a picture element', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', darkSrc: 'dark.png' } })
      const img = wrapper.find('picture img')
      expect(img.attributes('width')).toBeUndefined()
      expect(img.attributes('data-maizzle-img-width')).toBe('')
    })

    it('does not leak NaN into cropped mode when aspect is set without width', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', aspect: '16:9' } })
      const html = wrapper.html()
      expect(html).not.toContain('NaN')
      expect(wrapper.find('div[role="img"]').exists()).toBe(true)
    })
  })

  describe('darkSrc prop', () => {
    it('wraps in picture element', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100, darkSrc: 'dark-img.png' } })
      expect(wrapper.find('picture').exists()).toBe(true)
    })

    it('adds source with dark mode media query', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100, darkSrc: 'dark-img.png' } })
      const source = wrapper.find('source')
      expect(source.attributes('srcset')).toBe('dark-img.png')
      expect(source.attributes('media')).toBe('(prefers-color-scheme: dark)')
    })

    it('keeps img as fallback inside picture', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100, darkSrc: 'dark-img.png' } })
      expect(wrapper.find('picture img').attributes('src')).toBe('img.png')
    })
  })

  describe('motionSrc prop', () => {
    it('wraps in picture element', () => {
      const wrapper = mount(Img, { props: { src: 'static.png', width: 100, motionSrc: 'animation.webp' } })
      expect(wrapper.find('picture').exists()).toBe(true)
    })

    it('adds source with no-preference media query', () => {
      const wrapper = mount(Img, { props: { src: 'static.png', width: 100, motionSrc: 'animation.webp' } })
      const source = wrapper.find('source')
      expect(source.attributes('srcset')).toBe('animation.webp')
      expect(source.attributes('media')).toBe('(prefers-reduced-motion: no-preference)')
    })

    it('uses src as the img fallback', () => {
      const wrapper = mount(Img, { props: { src: 'static.png', width: 100, motionSrc: 'animation.webp' } })
      expect(wrapper.find('picture img').attributes('src')).toBe('static.png')
    })

    it('derives type for webp', () => {
      const wrapper = mount(Img, { props: { src: 'static.png', width: 100, motionSrc: 'animation.webp' } })
      expect(wrapper.find('source').attributes('type')).toBe('image/webp')
    })

    it('derives type for gif', () => {
      const wrapper = mount(Img, { props: { src: 'static.png', width: 100, motionSrc: 'animation.gif' } })
      expect(wrapper.find('source').attributes('type')).toBe('image/gif')
    })

    it('derives type for apng', () => {
      const wrapper = mount(Img, { props: { src: 'static.png', width: 100, motionSrc: 'animation.apng' } })
      expect(wrapper.find('source').attributes('type')).toBe('image/apng')
    })

    it('derives type for avif', () => {
      const wrapper = mount(Img, { props: { src: 'static.png', width: 100, motionSrc: 'animation.avif' } })
      expect(wrapper.find('source').attributes('type')).toBe('image/avif')
    })

    it('omits type for unknown extensions', () => {
      const wrapper = mount(Img, { props: { src: 'static.png', width: 100, motionSrc: 'animation.xyz' } })
      expect(wrapper.find('source').attributes('type')).toBeUndefined()
    })
  })

  describe('combined darkSrc and motionSrc', () => {
    it('renders both source elements', () => {
      const wrapper = mount(Img, {
        props: { src: 'static.png', width: 100, darkSrc: 'dark.png', motionSrc: 'animation.webp' }
      })
      const sources = wrapper.findAll('source')
      expect(sources).toHaveLength(2)
    })

    it('dark source comes first', () => {
      const wrapper = mount(Img, {
        props: { src: 'static.png', width: 100, darkSrc: 'dark.png', motionSrc: 'animation.webp' }
      })
      const sources = wrapper.findAll('source')
      expect(sources[0].attributes('media')).toBe('(prefers-color-scheme: dark)')
      expect(sources[1].attributes('media')).toBe('(prefers-reduced-motion: no-preference)')
    })
  })

  describe('branch combinations', () => {
    it('first aspect keyword wins when several are present', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 200 },
        attrs: { class: 'aspect-square aspect-video' },
      })
      // aspect-square (1/1) wins -> 100%
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 100%')
    })

    it('first arbitrary aspect token wins when several are present', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 200 },
        attrs: { class: 'aspect-[16/9] aspect-[4/3]' },
      })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 56.25%')
    })

    it('cropped + href keeps a fixed width on the wrapper', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 200, aspect: '16:9', href: '#x' } })
      expect(wrapper.find('a[href="#x"] div[role="img"]').classes()).toContain('w-[200px]')
    })

    it('cropped + href without width omits the fixed width and emits no NaN', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', aspect: '16:9', href: '#x' } })
      const html = wrapper.html()
      expect(html).not.toContain('NaN')
      expect(wrapper.find('a[href="#x"] div[role="img"]').exists()).toBe(true)
    })

    it('cropped + darkSrc emits the dark background class', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 200, aspect: '16:9', darkSrc: 'dark.jpg' } })
      expect(wrapper.html()).toContain('dark:bg-[url(')
    })

    it('cropped + motionSrc emits the motion background class', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 200, aspect: '16:9', motionSrc: 'anim.webp' } })
      expect(wrapper.html()).toContain('motion-safe:bg-[url(')
    })

    it('href + picture with only darkSrc renders a single dark source', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 200, href: '#x', darkSrc: 'dark.jpg' } })
      const sources = wrapper.findAll('a[href="#x"] picture source')
      expect(sources).toHaveLength(1)
      expect(sources[0].attributes('media')).toBe('(prefers-color-scheme: dark)')
    })

    it('href + picture with only motionSrc renders a single motion source', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 200, href: '#x', motionSrc: 'anim.webp' } })
      const sources = wrapper.findAll('a[href="#x"] picture source')
      expect(sources).toHaveLength(1)
      expect(sources[0].attributes('media')).toBe('(prefers-reduced-motion: no-preference)')
    })

    it('cropped + href + darkSrc emits the dark background class', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 200, aspect: '16:9', href: '#x', darkSrc: 'dark.jpg' } })
      expect(wrapper.find('a[href="#x"]').html()).toContain('dark:bg-[url(')
    })

    it('cropped + href + motionSrc emits the motion background class', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 200, aspect: '16:9', href: '#x', motionSrc: 'anim.webp' } })
      expect(wrapper.find('a[href="#x"]').html()).toContain('motion-safe:bg-[url(')
    })

    it('href + picture + motionSrc with an unknown extension omits the type', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 200, href: '#x', motionSrc: 'anim.xyz' } })
      expect(wrapper.find('a[href="#x"] picture source').attributes('type')).toBeUndefined()
    })

    it('href + picture without width marks the img for auto-width', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', href: '#x', darkSrc: 'dark.jpg' } })
      const img = wrapper.find('a[href="#x"] picture img')
      expect(img.attributes('width')).toBeUndefined()
      expect(img.attributes('data-maizzle-img-width')).toBe('')
    })

    it('href-only (no picture/crop) with width renders a linked img', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 200, href: '#x' } })
      const img = wrapper.find('a[href="#x"] > img')
      expect(img.attributes('width')).toBe('200')
      expect(img.attributes('data-maizzle-img-width')).toBeUndefined()
    })

    it('href-only (no picture/crop) without width marks the img for auto-width', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', href: '#x' } })
      const img = wrapper.find('a[href="#x"] > img')
      expect(img.attributes('width')).toBeUndefined()
      expect(img.attributes('data-maizzle-img-width')).toBe('')
    })
  })

  describe('aspect prop', () => {
    it('renders the cropped wrapper structure', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '16:9' } })
      const outer = wrapper.find('div[role="img"]')
      expect(outer.exists()).toBe(true)
      expect(outer.classes()).toContain('overflow-hidden')
      expect(outer.classes()).toContain('table')
      expect(outer.find('div').exists()).toBe(true)
    })

    it('skips <picture> and bare <img> in cropped mode', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '16:9' } })
      expect(wrapper.find('picture').exists()).toBe(false)
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('accepts colon-separated ratio: 16:9 → 56.25%', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '16:9' } })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 56.25%')
    })

    it('accepts slash-separated ratio: 16/9 → 56.25%', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '16/9' } })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 56.25%')
    })

    it('4:3 → 75%', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '4:3' } })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 75%')
    })

    it('1:1 → 100%', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '1:1' } })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 100%')
    })

    it('21:9 → 42.8571% (4-decimal precision)', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '21:9' } })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 42.8571%')
    })

    it('sets wrapper width from the width prop', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '16:9' } })
      expect(wrapper.find('div[role="img"]').attributes('style')).toContain('width: 600px')
    })

    it('uses alt as aria-label on the wrapper', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '16:9', alt: 'Hero banner' } })
      expect(wrapper.find('div[role="img"]').attributes('aria-label')).toBe('Hero banner')
    })

    it('omits aria-label when no alt text is provided', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '16:9' } })
      expect(wrapper.find('div[role="img"]').attributes('aria-label')).toBeUndefined()
    })

    it('emits background-image as an inline style for the src', async () => {
      // SSR (not mount) — JSDOM normalizes `url(...)` quoting and trips matching.
      const html = decodeApos(await renderSsr({ src: 'https://cdn.example.com/img.jpg', width: 600, aspect: '16:9' }))
      expect(html).toContain("background-image:url('https://cdn.example.com/img.jpg')")
    })

    it('does not emit a Tailwind bg-[url()] class for the base src', () => {
      const wrapper = mount(Img, { props: { src: 'https://cdn.example.com/img.jpg', width: 600, aspect: '16:9' } })
      const inner = wrapper.find('div[role="img"] > div')
      expect(inner.classes().some(c => c.startsWith('bg-[url('))).toBe(false)
    })

    it('emits background-size and background-position inline', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9', size: 'contain', position: 'top' })
      expect(html).toMatch(/background-size:\s*contain/)
      expect(html).toMatch(/background-position:\s*top/)
    })

    it('skips cropped mode for invalid ratios (zero or NaN)', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '0/9' } })
      // Falls back to bare <img>
      expect(wrapper.find('img').exists()).toBe(true)
      expect(wrapper.find('div[role="img"]').exists()).toBe(false)
    })
  })

  describe('aspect class detection', () => {
    it('aspect-square enables cropped mode at 100%', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 200 },
        attrs: { class: 'aspect-square' }
      })
      expect(wrapper.find('div[role="img"]').exists()).toBe(true)
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 100%')
    })

    it('aspect-video enables cropped mode at 56.25%', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600 },
        attrs: { class: 'aspect-video' }
      })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 56.25%')
    })

    it('aspect-[16/9] arbitrary value works', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600 },
        attrs: { class: 'aspect-[16/9]' }
      })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 56.25%')
    })

    it('aspect-[16:9] colon form works', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600 },
        attrs: { class: 'aspect-[16:9]' }
      })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 56.25%')
    })

    it('bare aspect-3/2 form works', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600 },
        attrs: { class: 'aspect-3/2' }
      })
      // 2/3 * 100 = 66.6667%
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 66.6667%')
    })

    it('strips the aspect token from the forwarded class', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600 },
        attrs: { class: 'aspect-video rounded-lg shadow' }
      })
      const outer = wrapper.find('div[role="img"]')
      const cls = outer.classes()
      expect(cls).toContain('rounded-lg')
      expect(cls).toContain('shadow')
      expect(cls).not.toContain('aspect-video')
    })

    it('accepts class as an array', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, class: ['aspect-video', 'rounded-lg'] })
      expect(html).toContain('padding-bottom:56.25%')
      expect(html).toContain('rounded-lg')
    })

    it('accepts class as an object, keeping only truthy keys', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 200, class: { 'aspect-square': true, 'rounded-lg': true, 'sr-only': false } })
      expect(html).toContain('padding-bottom:100%')
      expect(html).toContain('rounded-lg')
      expect(html).not.toContain('sr-only')
    })

    it('aspect-auto does NOT enable cropped mode', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600 },
        attrs: { class: 'aspect-auto' }
      })
      expect(wrapper.find('img').exists()).toBe(true)
      expect(wrapper.find('div[role="img"]').exists()).toBe(false)
    })

    it('prop wins when both prop and class are set', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '4:3' },
        attrs: { class: 'aspect-video' }
      })
      expect(wrapper.find('div[role="img"] > div').attributes('style')).toContain('padding-bottom: 75%')
    })
  })

  describe('cropped mode: dark and motion variants', () => {
    it('darkSrc adds dark: variant class with important', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9', darkSrc: 'dark.jpg' }
      })
      const cls = wrapper.find('div[role="img"] > div').classes()
      expect(cls.some(c => c === "dark:bg-[url('dark.jpg')]!")).toBe(true)
    })

    it('motionSrc adds motion-safe: variant class with important', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9', motionSrc: 'anim.gif' }
      })
      const cls = wrapper.find('div[role="img"] > div').classes()
      expect(cls.some(c => c === "motion-safe:bg-[url('anim.gif')]!")).toBe(true)
    })

    it('omits dark variant class when darkSrc is not set', () => {
      const wrapper = mount(Img, { props: { src: 'img.jpg', width: 600, aspect: '16:9' } })
      const cls = wrapper.find('div[role="img"] > div').classes()
      expect(cls.some(c => c.startsWith('dark:'))).toBe(false)
    })

    it('does NOT wrap in <picture> when in cropped mode with dark/motion', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9', darkSrc: 'dark.jpg', motionSrc: 'anim.gif' }
      })
      expect(wrapper.find('picture').exists()).toBe(false)
    })
  })

  describe('cropped mode: URL handling in inline style and variant classes', () => {
    it('preserves absolute URLs verbatim in the inline background-image', async () => {
      // `&` in the URL is HTML-escaped to `&amp;` in the attribute value.
      const expectedUrl = 'https://images.unsplash.com/photo-1?q=80&amp;w=774&amp;fit=crop'
      const html = decodeApos(await renderSsr({ src: 'https://images.unsplash.com/photo-1?q=80&w=774&fit=crop', width: 600, aspect: '16:9' }))
      expect(html).toContain(`background-image:url('${expectedUrl}')`)
      // Confirm no whitespace got inserted after the scheme separator.
      expect(html).not.toMatch(/url\('https:\s+\/\//)
    })

    it('escapes a single quote in the src for the inline url() string', async () => {
      const html = decodeApos(await renderSsr({ src: "img'1.jpg", width: 600, aspect: '16:9' }))
      // The `'` inside the URL is CSS-escaped to `\'` so it doesn't terminate the url() string.
      expect(html).toContain("background-image:url('img\\'1.jpg')")
    })

    it('escapes a single quote in the darkSrc Tailwind variant class', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9', darkSrc: "dark'1.jpg" }
      })
      const cls = wrapper.find('div[role="img"] > div').classes()
      expect(cls.some(c => c.includes('%27'))).toBe(true)
      expect(cls.some(c => c.includes("dark'1.jpg"))).toBe(false)
    })

    it('escapes parentheses in the darkSrc variant class', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9', darkSrc: 'dark(1).jpg' }
      })
      const cls = wrapper.find('div[role="img"] > div').classes()
      expect(cls.some(c => c.includes('%28') && c.includes('%29'))).toBe(true)
    })

    it('does not double-encode already-encoded URLs in variant classes', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9', darkSrc: 'https://cdn.example.com/path%20with%20space.jpg' }
      })
      const cls = wrapper.find('div[role="img"] > div').classes()
      expect(cls.some(c => c.includes('%2520'))).toBe(false)
      expect(cls.some(c => c.includes('%20'))).toBe(true)
    })
  })

  describe('cropped mode: Outlook VML fallback', () => {
    it('emits a <v:rect> with computed pixel dimensions', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9' })
      expect(html).toContain('<!--[if mso]>')
      expect(html).toContain('<v:rect')
      expect(html).toContain('width:600px')
      // 600 * 9/16 = 337.5 → rounded to 338
      expect(html).toContain('height:338px')
    })

    it('emits the v:fill with type="frame" and src', async () => {
      const html = await renderSsr({ src: 'https://cdn.example.com/img.jpg', width: 600, aspect: '16:9' })
      expect(html).toContain('<v:fill type="frame" src="https://cdn.example.com/img.jpg"')
    })

    it('maps size="cover" to v:fill aspect="atleast"', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9' })
      expect(html).toContain('aspect="atleast"')
    })

    it('maps size="contain" to v:fill aspect="atmost"', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9', size: 'contain' })
      expect(html).toContain('aspect="atmost"')
    })

    it('omits aspect attribute for other size values', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9', size: 'auto' })
      expect(html).not.toContain('aspect="atleast"')
      expect(html).not.toContain('aspect="atmost"')
    })

    it('sets the VML rect alt attribute from the alt prop', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9', alt: 'Hero banner' })
      expect(html).toMatch(/<v:rect[^>]*alt="Hero banner"/)
    })

    it('HTML-escapes the VML alt attribute', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9', alt: '"Sale" & deal' })
      expect(html).toContain('alt="&quot;Sale&quot; &amp; deal"')
    })

    it('omits the VML alt attribute when alt is empty', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9' })
      expect(html).not.toMatch(/<v:rect[^>]*\salt=/)
    })

    it('wraps the modern markup in <!--[if !mso]> conditional comments', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9' })
      expect(html).toContain('<!--[if !mso]><!-->')
      expect(html).toContain('<!--<![endif]-->')
    })

    it('escapes HTML-special characters in the VML src attribute', async () => {
      const html = await renderSsr({ src: 'img.jpg?a=1&b=2', width: 600, aspect: '16:9' })
      expect(html).toContain('src="img.jpg?a=1&amp;b=2"')
    })

    it('skips VML when outlookFallback prop is false', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9', outlookFallback: false })
      expect(html).not.toContain('<!--[if mso]>')
      expect(html).not.toContain('<v:rect')
      expect(html).not.toContain('<!--[if !mso]>')
    })

    it('still renders the modern wrapper when outlookFallback is false', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9', outlookFallback: false }
      })
      expect(wrapper.find('div[role="img"]').exists()).toBe(true)
    })

    it('inherits outlookFallback=false from a parent — skips VML', async () => {
      const Parent = defineComponent({
        setup(_, { slots }) {
          useOutlookFallback(false)
          return () => slots.default?.()
        },
      })
      const app = createSSRApp({
        render: () => h(Parent, null, { default: () => h(Img, { src: 'img.jpg', width: 600, aspect: '16:9' }) }),
      })
      const html = await renderToString(app)
      expect(html).not.toContain('<v:rect')
      expect(html).not.toContain('<!--[if mso]>')
      expect(html).toContain('role="img"')
    })

    it('explicit prop overrides inherited value (parent false, prop true)', async () => {
      const Parent = defineComponent({
        setup(_, { slots }) {
          useOutlookFallback(false)
          return () => slots.default?.()
        },
      })
      const app = createSSRApp({
        render: () => h(Parent, null, {
          default: () => h(Img, { src: 'img.jpg', width: 600, aspect: '16:9', outlookFallback: true })
        }),
      })
      const html = await renderToString(app)
      expect(html).toContain('<v:rect')
    })
  })

  describe('href prop', () => {
    it('wraps a bare img in an anchor', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100, href: 'https://example.com' } })
      const a = wrapper.find('a')
      expect(a.exists()).toBe(true)
      expect(a.attributes('href')).toBe('https://example.com')
      expect(a.find('img').attributes('src')).toBe('img.png')
    })

    it('does not wrap when href is empty', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100 } })
      expect(wrapper.find('a').exists()).toBe(false)
    })

    it('wraps a picture in an anchor when darkSrc is set', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.png', width: 100, darkSrc: 'dark.png', href: 'https://example.com' }
      })
      const a = wrapper.find('a')
      expect(a.exists()).toBe(true)
      expect(a.attributes('href')).toBe('https://example.com')
      expect(a.find('picture').exists()).toBe(true)
      expect(a.find('picture > img').exists()).toBe(true)
    })

    it('wraps the cropped modern markup in an anchor', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9', href: 'https://example.com' }
      })
      const a = wrapper.find('a')
      expect(a.exists()).toBe(true)
      expect(a.attributes('href')).toBe('https://example.com')
      expect(a.find('div[role="img"]').exists()).toBe(true)
    })

    it('gives the cropped anchor block + no-underline utilities so the whole area is clickable', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9', href: 'https://example.com' }
      })
      const cls = wrapper.find('a').classes()
      expect(cls).toContain('block')
      expect(cls).toContain('no-underline')
    })

    it('emits href on the VML v:rect', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9', href: 'https://example.com' })
      expect(html).toMatch(/<v:rect[^>]*href="https:\/\/example\.com"/)
    })

    it('HTML-escapes the VML href attribute', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9', href: 'https://example.com/?a=1&b=2' })
      expect(html).toContain('href="https://example.com/?a=1&amp;b=2"')
    })

    it('omits the VML href attribute when href is empty', async () => {
      const html = await renderSsr({ src: 'img.jpg', width: 600, aspect: '16:9' })
      expect(html).not.toMatch(/<v:rect[^>]*\shref=/)
    })
  })

  describe('cropped mode: attribute forwarding', () => {
    it('forwards loading and other extra attrs to the wrapper', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9' },
        attrs: { loading: 'lazy', 'data-test': 'foo' }
      })
      const outer = wrapper.find('div[role="img"]')
      expect(outer.attributes('loading')).toBe('lazy')
      expect(outer.attributes('data-test')).toBe('foo')
    })

    it('does not duplicate the user class on the wrapper', () => {
      const wrapper = mount(Img, {
        props: { src: 'img.jpg', width: 600, aspect: '16:9' },
        attrs: { class: 'rounded-lg' }
      })
      const outerClass = wrapper.find('div[role="img"]').attributes('class') ?? ''
      const matches = outerClass.match(/rounded-lg/g) ?? []
      expect(matches).toHaveLength(1)
    })
  })
})
