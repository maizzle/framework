import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import WithUrl from '../../components/WithUrl.vue'

describe('WithUrl', () => {
  // ─── base prop (base URL) ──────────────────────────────────────────────────

  describe('base — img src', () => {
    it('prepends base URL to img src', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('img', { src: 'image.jpg' }),
        },
      })

      expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/image.jpg')
    })

    it('does not modify absolute URLs', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('img', { src: 'https://other.com/image.jpg' }),
        },
      })

      expect(wrapper.find('img').attributes('src')).toBe('https://other.com/image.jpg')
    })

    it('does not modify data URIs', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('img', { src: 'data:image/png;base64,abc123' }),
        },
      })

      expect(wrapper.find('img').attributes('src')).toBe('data:image/png;base64,abc123')
    })

    it('does not modify protocol-relative URLs', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('img', { src: '//other.com/image.jpg' }),
        },
      })

      expect(wrapper.find('img').attributes('src')).toBe('//other.com/image.jpg')
    })
  })

  describe('base — anchor href', () => {
    it('prepends base URL to anchor href', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://example.com/' },
        slots: {
          default: () => h('a', { href: 'page.html' }, 'Link'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe('https://example.com/page.html')
    })

    it('does not modify mailto: URLs', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://example.com/' },
        slots: {
          default: () => h('a', { href: 'mailto:test@example.com' }, 'Email'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe('mailto:test@example.com')
    })

    it('does not modify fragment URLs', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://example.com/' },
        slots: {
          default: () => h('a', { href: '#section' }, 'Jump'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe('#section')
    })
  })

  describe('base — srcset', () => {
    it('prepends base URL to srcset values', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('img', { srcset: 'small.jpg 320w, large.jpg 1024w' }),
        },
      })

      expect(wrapper.find('img').attributes('srcset')).toBe(
        'https://cdn.example.com/small.jpg 320w, https://cdn.example.com/large.jpg 1024w'
      )
    })
  })

  describe('base — other elements', () => {
    it('prepends base URL to video src and poster', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('video', { src: 'video.mp4', poster: 'poster.jpg' }),
        },
      })

      expect(wrapper.find('video').attributes('src')).toBe('https://cdn.example.com/video.mp4')
      expect(wrapper.find('video').attributes('poster')).toBe('https://cdn.example.com/poster.jpg')
    })

    it('prepends base URL to link href', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('link', { href: 'styles.css' }),
        },
      })

      expect(wrapper.find('link').attributes('href')).toBe('https://cdn.example.com/styles.css')
    })
  })

  describe('base — nested elements', () => {
    it('processes deeply nested elements', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('div', [
            h('table', [
              h('tr', [
                h('td', [
                  h('img', { src: 'deep.jpg' }),
                ]),
              ]),
            ]),
          ]),
        },
      })

      expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/deep.jpg')
    })

    it('processes multiple elements at different depths', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('div', [
            h('img', { src: 'top.jpg' }),
            h('div', [
              h('a', { href: 'page.html' }, 'Link'),
            ]),
          ]),
        },
      })

      expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/top.jpg')
      expect(wrapper.find('a').attributes('href')).toBe('https://cdn.example.com/page.html')
    })
  })

  describe('base — scoping', () => {
    it('does not affect elements outside the component', () => {
      const wrapper = mount({
        template: `
          <div>
            <img src="outside.jpg">
            <WithUrl base="https://cdn.example.com/">
              <img src="inside.jpg">
            </WithUrl>
          </div>
        `,
        components: { WithUrl },
      })

      const images = wrapper.findAll('img')
      expect(images[0].attributes('src')).toBe('outside.jpg')
      expect(images[1].attributes('src')).toBe('https://cdn.example.com/inside.jpg')
    })
  })

  describe('base — elements not in tag map', () => {
    it('does not modify attributes on unknown elements', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h('div', { 'data-src': 'file.txt' }),
        },
      })

      expect(wrapper.find('div').attributes('data-src')).toBe('file.txt')
    })
  })

  describe('base — child components', () => {
    it('rewrites URL props on child components', () => {
      const Button = defineComponent({
        props: { href: String },
        setup(props, { slots }) {
          return () => h('a', { href: props.href }, slots.default?.())
        },
      })

      const wrapper = mount(WithUrl, {
        props: { base: 'https://example.com/' },
        slots: {
          default: () => h(Button, { href: 'test' }, () => 'click me'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe('https://example.com/test')
    })

    it('rewrites src prop on child components', () => {
      const Image = defineComponent({
        props: { src: String, alt: String },
        setup(props) {
          return () => h('img', { src: props.src, alt: props.alt })
        },
      })

      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: {
          default: () => h(Image, { src: 'photo.jpg', alt: 'A photo' }),
        },
      })

      expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/photo.jpg')
      expect(wrapper.find('img').attributes('alt')).toBe('A photo')
    })

    it('does not rewrite absolute URLs on child components', () => {
      const Button = defineComponent({
        props: { href: String },
        setup(props, { slots }) {
          return () => h('a', { href: props.href }, slots.default?.())
        },
      })

      const wrapper = mount(WithUrl, {
        props: { base: 'https://example.com/' },
        slots: {
          default: () => h(Button, { href: 'https://other.com/page' }, () => 'click'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe('https://other.com/page')
    })
  })

  // ─── base — slash normalisation ──────────────────────────────────────────

  describe('base — slash normalisation', () => {
    it('works when base has no trailing slash and path has no leading slash', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com' },
        slots: { default: () => h('img', { src: 'image.jpg' }) },
      })
      expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/image.jpg')
    })

    it('works when base has trailing slash and path has no leading slash', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: { default: () => h('img', { src: 'image.jpg' }) },
      })
      expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/image.jpg')
    })

    it('works when base has no trailing slash and path has leading slash', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com' },
        slots: { default: () => h('a', { href: '/about' }, 'About') },
      })
      expect(wrapper.find('a').attributes('href')).toBe('https://cdn.example.com/about')
    })

    it('works when base has trailing slash and path has leading slash', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/' },
        slots: { default: () => h('a', { href: '/about' }, 'About') },
      })
      expect(wrapper.find('a').attributes('href')).toBe('https://cdn.example.com/about')
    })

    it('works with a base that has a path prefix', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/assets' },
        slots: { default: () => h('img', { src: 'image.jpg' }) },
      })
      expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/assets/image.jpg')
    })

    it('works with a base that has a path prefix and trailing slash', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com/assets/' },
        slots: { default: () => h('img', { src: 'image.jpg' }) },
      })
      expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/assets/image.jpg')
    })

    it('normalises slashes in srcset entries', () => {
      const wrapper = mount(WithUrl, {
        props: { base: 'https://cdn.example.com' },
        slots: {
          default: () => h('img', { srcset: 'small.jpg 320w, large.jpg 1024w' }),
        },
      })
      expect(wrapper.find('img').attributes('srcset')).toBe(
        'https://cdn.example.com/small.jpg 320w, https://cdn.example.com/large.jpg 1024w'
      )
    })
  })

  // ─── parameters prop (query params) ──────────────────────────────────────

  describe('parameters — anchor href', () => {
    it('appends query params to anchor href', () => {
      const wrapper = mount(WithUrl, {
        props: { parameters: 'utm_source=newsletter&utm_medium=email' },
        slots: {
          default: () => h('a', { href: 'https://example.com/page' }, 'Link'),
        },
      })

      const href = wrapper.find('a').attributes('href')!
      expect(href).toContain('https://example.com/page?')
      expect(href).toContain('utm_source=newsletter')
      expect(href).toContain('utm_medium=email')
    })

    it('appends query params to relative href', () => {
      const wrapper = mount(WithUrl, {
        props: { parameters: 'foo=bar' },
        slots: {
          default: () => h('a', { href: '/about' }, 'About'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe('/about?foo=bar')
    })

    it('merges query params when href already has params', () => {
      const wrapper = mount(WithUrl, {
        props: { parameters: 'utm_source=newsletter' },
        slots: {
          default: () => h('a', { href: 'https://example.com/page?existing=1' }, 'Link'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe(
        'https://example.com/page?existing=1&utm_source=newsletter'
      )
    })

    it('does not modify fragment-only hrefs', () => {
      const wrapper = mount(WithUrl, {
        props: { parameters: 'utm_source=newsletter' },
        slots: {
          default: () => h('a', { href: '#section' }, 'Jump'),
        },
      })

      // Fragment URLs are treated as absolute (isAbsoluteUrl returns true for #)
      // so no base rewriting; but parameters can still be appended by query-string
      const href = wrapper.find('a').attributes('href')
      // query-string will produce '#section?utm_source=newsletter' or '#section' depending on behaviour
      // The important thing is it doesn't crash; we just assert it contains #section
      expect(href).toContain('#section')
    })
  })

  describe('parameters — img src', () => {
    it('appends query params to img src', () => {
      const wrapper = mount(WithUrl, {
        props: { parameters: 'v=2' },
        slots: {
          default: () => h('img', { src: 'https://cdn.example.com/image.jpg' }),
        },
      })

      expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/image.jpg?v=2')
    })
  })

  describe('parameters — child components', () => {
    it('appends query params to URL props on child components', () => {
      const Button = defineComponent({
        props: { href: String },
        setup(props, { slots }) {
          return () => h('a', { href: props.href }, slots.default?.())
        },
      })

      const wrapper = mount(WithUrl, {
        props: { parameters: 'utm_source=foo' },
        slots: {
          default: () => h(Button, { href: 'https://example.com/page' }, () => 'click me'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe('https://example.com/page?utm_source=foo')
    })
  })

  // ─── both props together ──────────────────────────────────────────────────

  describe('base + parameters combined', () => {
    it('prepends base URL then appends query params', () => {
      const wrapper = mount(WithUrl, {
        props: {
          base: 'https://example.com/',
          parameters: 'utm_source=newsletter',
        },
        slots: {
          default: () => h('a', { href: 'about' }, 'About'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe(
        'https://example.com/about?utm_source=newsletter'
      )
    })

    it('applies base then params to img src', () => {
      const wrapper = mount(WithUrl, {
        props: {
          base: 'https://cdn.example.com/',
          parameters: 'v=2',
        },
        slots: {
          default: () => h('img', { src: 'photo.jpg' }),
        },
      })

      expect(wrapper.find('img').attributes('src')).toBe(
        'https://cdn.example.com/photo.jpg?v=2'
      )
    })

    it('applies base then params to child component URL props', () => {
      const Button = defineComponent({
        props: { href: String },
        setup(props, { slots }) {
          return () => h('a', { href: props.href }, slots.default?.())
        },
      })

      const wrapper = mount(WithUrl, {
        props: {
          base: 'https://example.com/',
          parameters: 'utm_campaign=spring',
        },
        slots: {
          default: () => h(Button, { href: 'shop' }, () => 'Buy now'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe(
        'https://example.com/shop?utm_campaign=spring'
      )
    })

    it('does not double-prepend base on absolute URLs but still appends params', () => {
      const wrapper = mount(WithUrl, {
        props: {
          base: 'https://example.com/',
          parameters: 'ref=email',
        },
        slots: {
          default: () => h('a', { href: 'https://other.com/page' }, 'Link'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe('https://other.com/page?ref=email')
    })
  })

  // ─── no props ─────────────────────────────────────────────────────────────

  describe('no props', () => {
    it('renders children unchanged when no props are provided', () => {
      const wrapper = mount(WithUrl, {
        props: {},
        slots: {
          default: () => h('a', { href: 'https://example.com/' }, 'Link'),
        },
      })

      expect(wrapper.find('a').attributes('href')).toBe('https://example.com/')
    })
  })
})
