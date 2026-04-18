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
      expect(wrapper.find('div').attributes('style')).toContain('display: inline-block')
    })

    it('resets font-size to 16px', () => {
      const wrapper = mount(Column)
      expect(wrapper.find('div').attributes('style')).toContain('font-size: 16px')
    })

    it('renders slot content', () => {
      const wrapper = mount(Column, { slots: { default: () => 'Content' } })
      expect(wrapper.text()).toBe('Content')
    })

    it('auto-computes min-width from Row injection', () => {
      const wrapper = mountLayout({ width: '600px' })
      const columns = wrapper.findAllComponents(Column)
      // 600px / 2 = 300px
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 300px')
    })

    it('auto-computes min-width for 3 columns', () => {
      const wrapper = mountLayout({ width: '600px' }, {}, {}, 3)
      const columns = wrapper.findAllComponents(Column)
      // 600px / 3 = 200px
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 200px')
    })

    it('does not set min-width when Container has no width prop', () => {
      const wrapper = mountLayout()
      const columns = wrapper.findAllComponents(Column)
      expect(columns[0].find('div').attributes('style')).not.toContain('min-width')
    })

    it('does not set min-width when used standalone without width prop', () => {
      const wrapper = mount(Column)
      expect(wrapper.find('div').attributes('style')).not.toContain('min-width')
    })
  })

  describe('explicit width override', () => {
    it('uses explicit width prop as min-width', () => {
      const wrapper = mountLayout({}, {}, { width: '400px' })
      const columns = wrapper.findAllComponents(Column)
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 400px')
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

    it('sets MSO td width from row injection', () => {
      const wrapper = mountLayout({}, {}, {}, 2)
      const html = wrapper.html()
      expect(html).toContain('width="50%"')
    })

    it('computes MSO td width for 3 columns', () => {
      const wrapper = mountLayout({}, {}, {}, 3)
      const html = wrapper.html()
      expect(html).toContain('width="33%"')
    })

    it('defaults MSO td width to 50% without row', () => {
      const html = mount(Column).html()
      expect(html).toContain('width="50%"')
    })

    it('sets vertical-align: top on MSO td', () => {
      const html = mount(Column).html()
      expect(html).toContain('vertical-align: top')
    })

    it('nested row inherits column width, not container width', () => {
      // Container 400px → 2 cols = 200px each → nested row should use 200px → 2 nested cols = 100px
      const wrapper = mount(
        defineComponent({
          render() {
            return h(Container, { width: '400px' }, () =>
              h(Row, {}, () => [
                h(Column, {}, () =>
                  h(Row, {}, () => [
                    h(Column, {}, () => 'Nested 1'),
                    h(Column, {}, () => 'Nested 2'),
                  ])
                ),
                h(Column, {}, () => 'Col 2'),
              ])
            )
          }
        })
      )
      const columns = wrapper.findAllComponents(Column)
      // First level: 400px / 2 = 200px
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 200px')
      // Nested: 200px / 2 = 100px
      expect(columns[1].find('div').attributes('style')).toContain('min-width: 100px')
    })

    it('applies mso-style only to MSO td', () => {
      const html = mount(Column, { props: { msoStyle: 'padding: 10px' } }).html()
      expect(html).toContain('vertical-align: top; padding: 10px')
      const wrapper = mount(Column, { props: { msoStyle: 'padding: 10px' } })
      expect(wrapper.find('div').attributes('style')).not.toContain('padding: 10px')
    })
  })
})
