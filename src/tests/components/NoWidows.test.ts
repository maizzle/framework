import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, Fragment } from 'vue'
import NoWidows from '../../components/NoWidows.vue'

describe('NoWidows', () => {
  describe('basic widow prevention', () => {
    it('replaces space before last word with non-breaking space for text with >= 4 words', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: 'This is a test sentence'
        }
      })
      expect(wrapper.html()).toContain('This is a test&nbsp;sentence')
    })

    it('does not modify text with fewer than minWords words', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: 'Hello world'
        }
      })
      expect(wrapper.html()).toContain('Hello world')
    })

    it('handles text with exactly minWords words', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: 'One two three four'
        }
      })
      expect(wrapper.html()).toContain('One two three&nbsp;four')
    })
  })

  describe('minWords prop', () => {
    it('respects custom minWords value (string)', () => {
      const wrapper = mount(NoWidows, {
        props: {
          minWords: '3'
        },
        slots: {
          default: 'Hello world there'
        }
      })
      expect(wrapper.html()).toContain('Hello world&nbsp;there')
    })

    it('respects custom minWords value (number)', () => {
      const wrapper = mount(NoWidows, {
        props: {
          minWords: 3
        },
        slots: {
          default: 'Hello world there'
        }
      })
      expect(wrapper.html()).toContain('Hello world&nbsp;there')
    })

    it('uses default minWords of 4 when not specified', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: 'One two three'
        }
      })
      expect(wrapper.html()).toContain('One two three')
    })
  })

  describe('template expression handling', () => {
    it('skips known ignored templating delimiters', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: '{% Hello world there test %}'
        }
      })
      expect(wrapper.html()).toContain('{% Hello world there test %}')
    })

    it('processes text inside HTML elements', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: '<p>This is a test paragraph</p>'
        }
      })
      expect(wrapper.html()).toContain('<p>This is a test&nbsp;paragraph</p>')
    })
  })

  describe('nested elements', () => {
    it('processes text in nested elements', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: '<div><span>This is a nested sentence</span></div>'
        }
      })
      expect(wrapper.html()).toContain('<div><span>This is a nested&nbsp;sentence</span></div>')
    })

    it('handles multiple elements', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: '<p>First paragraph text here</p><p>Second paragraph text here</p>'
        }
      })
      const html = wrapper.html()
      expect(html).toContain('<p>First paragraph text&nbsp;here</p>')
      expect(html).toContain('<p>Second paragraph text&nbsp;here</p>')
    })
  })

  describe('edge cases', () => {
    it('handles empty slots', () => {
      const wrapper = mount(NoWidows)
      expect(wrapper.html()).toBe('')
    })

    it('handles text with trailing whitespace', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: 'This is a test sentence   '
        }
      })
      expect(wrapper.html()).toContain('This is a test&nbsp;sentence')
    })

    it('handles multiple spaces between words', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: 'This   is a test  sentence'
        }
      })
      expect(wrapper.html()).toContain('This is a test&nbsp;sentence')
    })

    it('handles single word', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: 'Hello'
        }
      })
      expect(wrapper.html()).toContain('Hello')
    })

    it('handles text with newlines', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: `This is a test\nsentence`
        }
      })
      expect(wrapper.html()).toContain('This is a test&nbsp;sentence')
    })
  })

  describe('fragment children', () => {
    it('processes text inside fragment vnodes', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: () => h(Fragment, [
            'This is a fragment sentence',
          ]),
        },
      })
      expect(wrapper.html()).toContain('This is a fragment&nbsp;sentence')
    })
  })

  describe('raw string children', () => {
    it('processes raw string children in element slots', () => {
      const wrapper = mount(NoWidows, {
        slots: {
          default: () => h('div', ['This is a raw string child']),
        },
      })
      expect(wrapper.html()).toContain('This is a raw string&nbsp;child')
    })
  })

  describe('component preservation', () => {
    it('does not modify component vnodes', () => {
      const TestComponent = {
        name: 'TestComponent',
        template: '<span>Component text here</span>'
      }

      const wrapper = mount(NoWidows, {
        slots: {
          default: () => [h(TestComponent)]
        }
      })

      expect(wrapper.findComponent(TestComponent).exists()).toBe(true)
    })
  })

  describe('vnode edge cases', () => {
    it('processes an element with a single string child', () => {
      const wrapper = mount(NoWidows, {
        slots: { default: () => h('p', null, 'one two three four') }
      })
      expect(wrapper.html()).toContain('one two three&nbsp;four')
    })

    it('skips null and non-string children inside an element', () => {
      const wrapper = mount(NoWidows, {
        slots: { default: () => h('p', null, ['one two three four', null, 99]) }
      })
      const html = wrapper.html()
      expect(html).toContain('one two three&nbsp;four')
      expect(html).toContain('99')
    })

    it('processes the children of a Fragment', () => {
      const wrapper = mount(NoWidows, {
        slots: { default: () => h(Fragment, null, [h('span', null, 'one two three four')]) }
      })
      expect(wrapper.html()).toContain('one two three&nbsp;four')
    })

    it('leaves a void element with no children untouched', () => {
      const wrapper = mount(NoWidows, {
        slots: { default: () => h('br') }
      })
      expect(wrapper.html()).toContain('<br')
    })

    it('renders nothing when no default slot is provided', () => {
      const wrapper = mount(NoWidows)
      expect(wrapper.html()).toBe('')
    })
  })
})
