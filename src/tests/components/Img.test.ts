import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Img from '../../components/Img.vue'

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

    it('sets max-width and vertical-align styles', () => {
      const wrapper = mount(Img, { props: { src: 'img.png', width: 100 } })
      const style = wrapper.find('img').attributes('style')
      expect(style).toContain('max-width: 100%')
      expect(style).toContain('vertical-align: middle')
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
})
