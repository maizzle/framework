import { describe, it, expect } from 'vitest'
import Layout from '../../components/Layout.vue'

describe('Layout', () => {
  it('has lang prop defaulting to en', () => {
    const lang = Layout.props.lang
    expect(lang.type).toBe(String)
    expect(lang.default).toBe('en')
  })

  it('has dir prop defaulting to ltr', () => {
    const dir = Layout.props.dir
    expect(dir.default).toBe('ltr')
  })

  it('has ariaLabel prop defaulting to undefined', () => {
    const ariaLabel = Layout.props.ariaLabel
    expect(ariaLabel.type).toBe(String)
    expect(ariaLabel.default).toBeUndefined()
  })

  it('has bodyClass prop defaulting to empty string', () => {
    const bodyClass = Layout.props.bodyClass
    expect(bodyClass.type).toBe(String)
    expect(bodyClass.default).toBe('')
  })

  it('disables attribute inheritance', () => {
    expect(Layout.__inheritAttrs).toBe(false)
  })
})
