import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Container from '../../components/Container.vue'
import Row from '../../components/Row.vue'
import Column from '../../components/Column.vue'

function mountLayout(containerProps = {}, rowProps = {}, columnProps = {}, columnCount = 2) {
  return mount(
    defineComponent({
      render() {
        return h(Container, containerProps, () =>
          h(Row, rowProps, () =>
            Array.from({ length: columnCount }, (_, i) =>
              h(Column, columnProps, () => `Col ${i + 1}`)
            )
          )
        )
      }
    })
  )
}

describe('Column', () => {
  describe('styles', () => {
    it('renders as inline-block', () => {
      const wrapper = mount(Column)
      // Display lives in the class so users can twMerge-override it.
      expect(wrapper.find('div').classes()).toContain('inline-block')
    })

    it('resets font-size to base', () => {
      const wrapper = mount(Column)
      expect(wrapper.find('div').classes()).toContain('text-base')
    })

    it('renders slot content', () => {
      const wrapper = mount(Column, { slots: { default: () => 'Content' } })
      expect(wrapper.text()).toBe('Content')
    })

    it('emits a min-width placeholder and column count when no width prop is set', () => {
      const wrapper = mountLayout({ width: '600px' })
      const div = wrapper.findAllComponents(Column)[0].find('div')
      expect(div.attributes('style')).toMatch(/min-width: __MAIZZLE_COLW_co\d+__/)
      expect(div.attributes('data-maizzle-cw-id')).toMatch(/^co\d+$/)
      expect(div.attributes('data-maizzle-cw-count')).toBe('2')
    })

    it('emits column count from Row even when nested deep', () => {
      const wrapper = mountLayout({}, {}, {}, 3)
      const div = wrapper.findAllComponents(Column)[0].find('div')
      expect(div.attributes('data-maizzle-cw-count')).toBe('3')
    })

    it('emits a placeholder even when no width source ancestor exists', () => {
      const wrapper = mount(Column)
      const div = wrapper.find('div')
      expect(div.attributes('style')).toMatch(/min-width: __MAIZZLE_COLW_co\d+__/)
      expect(div.attributes('data-maizzle-cw-id')).toMatch(/^co\d+$/)
    })

    it('defaults column count to 2 when no Row is present', () => {
      const wrapper = mount(Column)
      expect(wrapper.find('div').attributes('data-maizzle-cw-count')).toBe('2')
    })
  })

  describe('explicit width override', () => {
    it('uses explicit width prop as literal min-width without a placeholder', () => {
      const wrapper = mountLayout({}, {}, { width: '400px' })
      const div = wrapper.findAllComponents(Column)[0].find('div')
      expect(div.attributes('style')).toContain('min-width: 400px')
      expect(div.attributes('style')).not.toContain('__MAIZZLE_COLW_')
      expect(div.attributes('data-maizzle-cw-id')).toBeUndefined()
      expect(div.attributes('data-maizzle-cw-count')).toBeUndefined()
    })

    it('adds px to numeric width', () => {
      const wrapper = mount(Column, { props: { width: 250 } })
      expect(wrapper.find('div').attributes('style')).toContain('min-width: 250px')
    })
  })

  describe('MSO conditional comments', () => {
    it('wraps div with MSO td', () => {
      const html = mount(Column).html()
      expect(html).toContain('<!--[if mso]><td')
      expect(html).toContain('<!--[if mso]></td><![endif]-->')
    })

    it('emits a width placeholder on the MSO td when no width prop is set', () => {
      const html = mountLayout({}, {}, {}, 2).html()
      expect(html).toMatch(/<td style="width: __MAIZZLE_COLW_co\d+__/)
    })

    it('uses the same placeholder id on min-width and MSO td width', () => {
      const wrapper = mountLayout({}, {}, {}, 2)
      const div = wrapper.findAllComponents(Column)[0].find('div')
      const id = div.attributes('data-maizzle-cw-id')
      const html = wrapper.html()
      expect(html).toContain(`min-width: __MAIZZLE_COLW_${id}__`)
      expect(html).toContain(`<td style="width: __MAIZZLE_COLW_${id}__`)
    })

    it('uses literal MSO td width when explicit width prop is set', () => {
      const html = mount(Column, { props: { width: '300px' } }).html()
      expect(html).toContain('<td style="width: 300px')
      expect(html).not.toContain('__MAIZZLE_COLW_')
    })

    it('sets vertical-align: top on MSO td', () => {
      const html = mount(Column).html()
      expect(html).toContain('vertical-align: top')
    })

    it('applies mso-style only to MSO td', () => {
      const html = mount(Column, { props: { msoStyle: 'padding: 10px' } }).html()
      expect(html).toContain('vertical-align: top; padding: 10px')
      const wrapper = mount(Column, { props: { msoStyle: 'padding: 10px' } })
      expect(wrapper.find('div').attributes('style')).not.toContain('padding: 10px')
    })
  })
})
