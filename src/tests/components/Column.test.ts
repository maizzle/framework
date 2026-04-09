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
  })

  describe('auto-computed min-width', () => {
    it('computes min-width from container width / cols', () => {
      const wrapper = mountLayout()
      const columns = wrapper.findAllComponents(Column)
      // 37.5em / 2 cols = 18.75em
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 18.75em')
    })

    it('auto-detects 3 columns', () => {
      const wrapper = mountLayout({}, {}, {}, 3)
      const columns = wrapper.findAllComponents(Column)
      // 37.5em / 3 = 12.5em
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 12.5em')
    })

    it('allows cols prop override', () => {
      const wrapper = mountLayout({}, { cols: 4 }, {}, 2)
      const columns = wrapper.findAllComponents(Column)
      // 37.5em / 4 = 9.375em (cols overrides actual child count)
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 9.375em')
    })

    it('computes min-width from px container width', () => {
      const wrapper = mountLayout({ width: '600px' })
      const columns = wrapper.findAllComponents(Column)
      // 600px / 2 = 300px
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 300px')
    })

    it('computes min-width from numeric container width', () => {
      const wrapper = mountLayout({ width: 600 })
      const columns = wrapper.findAllComponents(Column)
      // 600 / 2 = 300px
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 300px')
    })

    it('uses row width override over container width', () => {
      const wrapper = mountLayout({ width: '600px' }, { width: '400px' })
      const columns = wrapper.findAllComponents(Column)
      // 400px / 2 = 200px
      expect(columns[0].find('div').attributes('style')).toContain('min-width: 200px')
    })

    it('falls back to 18.75em without container or row', () => {
      const wrapper = mount(Column)
      expect(wrapper.find('div').attributes('style')).toContain('min-width: 18.75em')
    })

    it('uses container width / 2 when used without row', () => {
      const wrapper = mount(
        defineComponent({
          render() {
            return h(Container, { width: '600px' }, () =>
              h(Column, {}, () => 'No row')
            )
          }
        })
      )
      const col = wrapper.findComponent(Column)
      expect(col.find('div').attributes('style')).toContain('min-width: 300px')
    })
  })

  describe('explicit width override', () => {
    it('uses explicit width prop over auto-computed', () => {
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

    it('sets vertical-align:top on MSO td', () => {
      const html = mount(Column).html()
      expect(html).toContain('vertical-align:top')
    })
  })
})
