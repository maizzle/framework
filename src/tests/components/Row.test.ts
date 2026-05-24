import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { Fragment, defineComponent, h } from 'vue'
import Row from '../../components/Row.vue'
import Column from '../../components/Column.vue'

describe('Row', () => {
  it('renders a div with text-0 (font-size: 0) class to kill inline-block whitespace', () => {
    const wrapper = mount(Row)
    expect(wrapper.find('div').classes()).toContain('text-0')
  })

  it('renders slot content', () => {
    const wrapper = mount(Row, {
      attrs: { 'data-maizzle-loc': '/test-renders-slot.vue:1' },
      slots: { default: () => 'Columns here' },
    })
    expect(wrapper.text()).toBe('Columns here')
  })

  describe('MSO conditional comments', () => {
    it('wraps div with MSO table and tr', () => {
      const html = mount(Row).html()
      expect(html).toContain('<!--[if mso]><table role="none" cellpadding="0" cellspacing="0" style="width: 100%"><tr><![endif]-->')
    })

    it('renders MSO closing tags', () => {
      const html = mount(Row).html()
      expect(html).toContain('<!--[if mso]></tr></table><![endif]-->')
    })
  })

  describe('data-maizzle-loc', () => {
    it('does not appear on the rendered div', () => {
      const wrapper = mount(Row, {
        attrs: { 'data-maizzle-loc': '/foo.vue:42' },
        slots: { default: () => h(Column, () => 'x') },
      })
      const div = wrapper.find('div')
      expect(div.attributes('data-maizzle-loc')).toBeUndefined()
    })

    it('still forwards other attrs to the div', () => {
      const wrapper = mount(Row, {
        attrs: { 'data-maizzle-loc': '/foo.vue:1', 'data-keep': 'yes' },
        slots: { default: () => h(Column, () => 'x') },
      })
      const div = wrapper.find('div')
      expect(div.attributes('data-keep')).toBe('yes')
    })
  })

  describe('missing-Column warning', () => {
    let warn: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      warn.mockRestore()
    })

    function warnings() {
      return warn.mock.calls.map(c => String(c[0]))
    }

    it('warns when slot has an element child but no Column', () => {
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/loc1.vue:1' },
        slots: { default: () => h('p', 'oops') },
      })
      expect(warnings().some(s => /\[maizzle\] <Row> in loc1\.vue:1/.test(s))).toBe(true)
    })

    it('warns when slot has only text content', () => {
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/loc2.vue:1' },
        slots: { default: () => 'just-text' },
      })
      expect(warnings().some(s => /\[maizzle\] <Row> in loc2\.vue:1/.test(s))).toBe(true)
    })

    it('does not warn when slot has a Column child', () => {
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/loc3.vue:1' },
        slots: { default: () => h(Column, () => 'ok') },
      })
      expect(warnings().some(s => /\[maizzle\] <Row>/.test(s))).toBe(false)
    })

    it('does not warn for an empty Row', () => {
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/loc4.vue:1' },
      })
      expect(warnings().some(s => /\[maizzle\] <Row>/.test(s))).toBe(false)
    })

    it('does not warn when slot is whitespace-only', () => {
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/loc5.vue:1' },
        slots: { default: () => '   \n\t  ' },
      })
      expect(warnings().some(s => /\[maizzle\] <Row>/.test(s))).toBe(false)
    })

    it('shows just the filename, not the full path', () => {
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/very/deep/path/to/welcome.vue:7' },
        slots: { default: () => h('p', 'oops') },
      })
      const calls = warnings()
      expect(calls.some(s => s.includes('welcome.vue:7'))).toBe(true)
      expect(calls.some(s => s.includes('/very/deep/path/'))).toBe(false)
    })

    it('falls back to <unknown location> when no loc attr is present', () => {
      mount(Row, {
        slots: { default: () => h('p', 'oops') },
      })
      expect(warnings().some(s => s.includes('<unknown location>'))).toBe(true)
    })

    it('dedupes by location: same loc warns only once', () => {
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/dedup.vue:1' },
        slots: { default: () => h('p', 'oops') },
      })
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/dedup.vue:1' },
        slots: { default: () => h('p', 'oops again') },
      })
      const matches = warnings().filter(s => /dedup\.vue:1/.test(s))
      expect(matches.length).toBe(1)
    })

    it('different locations warn independently', () => {
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/multi-a.vue:1' },
        slots: { default: () => h('p', 'a') },
      })
      mount(Row, {
        attrs: { 'data-maizzle-loc': '/multi-b.vue:2' },
        slots: { default: () => h('p', 'b') },
      })
      const calls = warnings()
      expect(calls.some(s => /multi-a\.vue:1/.test(s))).toBe(true)
      expect(calls.some(s => /multi-b\.vue:2/.test(s))).toBe(true)
    })

    it('does not warn when slot contains only an empty Fragment', () => {
      /**
       * Empty Fragment (e.g. `<template v-if="false">`) — recursion
       * finds nothing meaningful, loop continues past the Fragment.
       */
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        mount(Row, {
          attrs: { 'data-maizzle-loc': '/empty-frag.vue:1' },
          slots: { default: () => h(Fragment, null, []) },
        })
        const calls = warnSpy.mock.calls.map(c => String(c[0]))
        expect(calls.some(s => /\[maizzle\] <Row>/.test(s))).toBe(false)
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('descends into Fragment children when checking for elements', () => {
      /**
       * v-for / template fragments produce Fragment vnodes. The Row's
       * child walker must recurse into them. Here a Fragment wraps
       * a non-Column element, which should still trigger the warn.
       */
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        mount(Row, {
          attrs: { 'data-maizzle-loc': '/frag-elem.vue:1' },
          slots: { default: () => h(Fragment, null, [h('p', 'inside fragment')]) },
        })
        const calls = warnSpy.mock.calls.map(c => String(c[0]))
        expect(calls.some(s => /\[maizzle\] <Row> in frag-elem\.vue:1/.test(s))).toBe(true)
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('finds a <Column> nested inside a Fragment and does not warn', () => {
      // Fragment wraps a real Column (e.g. from `<Column v-for=...>`).
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        mount(Row, {
          attrs: { 'data-maizzle-loc': '/frag-column.vue:1' },
          slots: {
            default: () => h(Fragment, null, [h(Column, () => 'x')]),
          },
        })
        const calls = warnSpy.mock.calls.map(c => String(c[0]))
        expect(calls.some(s => /\[maizzle\] <Row>/.test(s))).toBe(false)
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('recognizes a Column-shaped component by __name even if not the imported Column', () => {
      /**
       * A different module instance / re-export of Column.vue could fail
       * the identity check (vnode.type === Column) but still match by
       * __name — the same field the Vue SFC compiler injects from
       * the filename.
       */
      const FakeColumn = defineComponent({
        setup: () => () => h('div', 'fake-column'),
      })
      ;(FakeColumn as unknown as { __name: string }).__name = 'Column'

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        mount(Row, {
          attrs: { 'data-maizzle-loc': '/fake-column.vue:1' },
          slots: { default: () => h(FakeColumn) },
        })
        const calls = warnSpy.mock.calls.map(c => String(c[0]))
        expect(calls.some(s => /\[maizzle\] <Row>/.test(s))).toBe(false)
      } finally {
        warnSpy.mockRestore()
      }
    })
  })

  describe('userStyle', () => {
    it('serializes object-form style attr to kebab-case CSS', () => {
      const wrapper = mount(Row, {
        attrs: {
          'data-maizzle-loc': '/style-obj.vue:1',
          style: { backgroundColor: 'red', fontSize: '16px' },
        },
        slots: { default: () => h(Column, () => 'x') },
      })
      const style = wrapper.find('div').attributes('style')
      expect(style).toContain('background-color: red')
      expect(style).toContain('font-size: 16px')
    })

    it('passes string-form style attr through unchanged', () => {
      const wrapper = mount(Row, {
        attrs: {
          'data-maizzle-loc': '/style-str.vue:1',
          style: 'color: blue',
        },
        slots: { default: () => h(Column, () => 'x') },
      })
      const style = wrapper.find('div').attributes('style')
      expect(style).toContain('color: blue')
    })
  })

  describe('outlookFallback=false', () => {
    it('skips MSO comments', () => {
      const html = mount(Row, {
        props: { outlookFallback: false },
        slots: { default: () => h(Column, () => 'x') },
      }).html()
      expect(html).not.toContain('<!--[if mso]>')
    })

    it('warns about missing Column without the Outlook suffix', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mount(Row, {
        props: { outlookFallback: false },
        attrs: { 'data-maizzle-loc': '/modern.vue:1' },
        slots: { default: () => 'no column inside' },
      })
      const maizzleWarns = warn.mock.calls.map(c => String(c[0])).filter(s => s.includes('[maizzle]'))
      expect(maizzleWarns).toHaveLength(1)
      expect(maizzleWarns[0]).toContain('has no <Column> inside it.')
      expect(maizzleWarns[0]).not.toContain('Outlook')
      warn.mockRestore()
    })
  })
})
