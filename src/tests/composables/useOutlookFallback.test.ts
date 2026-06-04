import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Html from '../../components/Html.vue'
import Body from '../../components/Body.vue'
import Container from '../../components/Container.vue'
import Section from '../../components/Section.vue'
import Row from '../../components/Row.vue'
import Column from '../../components/Column.vue'
import { useOutlookFallback } from '../../composables/useOutlookFallback.ts'

async function ssrRender(component: ReturnType<typeof defineComponent>) {
  return renderToString(createSSRApp({ render: () => h(component) }))
}

describe('useOutlookFallback', () => {
  it('returns true at the root by default', () => {
    let resolved: boolean | undefined
    const Probe = defineComponent({
      setup() {
        resolved = useOutlookFallback()
        return () => h('div')
      },
    })
    mount(Probe)
    expect(resolved).toBe(true)
  })

  it('returns the explicit value when called with one', () => {
    let resolved: boolean | undefined
    const Probe = defineComponent({
      setup() {
        resolved = useOutlookFallback(false)
        return () => h('div')
      },
    })
    mount(Probe)
    expect(resolved).toBe(false)
  })

  it('inherits from an ancestor that called the composable', () => {
    let childResolved: boolean | undefined
    const Child = defineComponent({
      setup() {
        childResolved = useOutlookFallback()
        return () => h('div')
      },
    })
    const Parent = defineComponent({
      setup() {
        useOutlookFallback(false)
        return () => h(Child)
      },
    })
    mount(Parent)
    expect(childResolved).toBe(false)
  })

  it('child can re-enable by passing an explicit value', () => {
    let childResolved: boolean | undefined
    const Child = defineComponent({
      setup() {
        childResolved = useOutlookFallback(true)
        return () => h('div')
      },
    })
    const Parent = defineComponent({
      setup() {
        useOutlookFallback(false)
        return () => h(Child)
      },
    })
    mount(Parent)
    expect(childResolved).toBe(true)
  })
})

describe('outlookFallback inheritance through MSO components', () => {
  it('Html(false) → Container/Section/Row/Column all skip MSO', async () => {
    const App = defineComponent({
      render: () => h(Html, { outlookFallback: false }, () =>
        h(Body, () => h(Container, () =>
          h(Section, () => h(Row, () => h(Column, () => 'x'))),
        )),
      ),
    })
    const html = await ssrRender(App)
    expect(html).not.toContain('<!--[if mso]>')
    expect(html).not.toContain('xmlns:v')
    expect(html).not.toContain('xmlns:o')
    expect(html).not.toContain('__MAIZZLE_MSOW_')
  })

  it('child prop overrides inherited false', async () => {
    const App = defineComponent({
      render: () => h(Html, { outlookFallback: false }, () =>
        h(Body, () => h(Container, { outlookFallback: true }, () => 'x')),
      ),
    })
    const html = await ssrRender(App)
    // Container re-enabled — its MSO ghost table reappears.
    expect(html).toContain('<!--[if mso]><table')
    // Html still has fallback off — no xmlns.
    expect(html).not.toContain('xmlns:v')
  })

  it('default tree (no outlookFallback set) emits MSO as before', async () => {
    const App = defineComponent({
      render: () => h(Html, () =>
        h(Body, () => h(Container, () => 'x')),
      ),
    })
    const html = await ssrRender(App)
    expect(html).toContain('<!--[if mso]>')
    expect(html).toContain('xmlns:v')
  })
})
