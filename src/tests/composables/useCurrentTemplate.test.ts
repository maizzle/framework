import { parse as parsePath } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { _setCurrentTemplate, useCurrentTemplate } from '../../composables/useCurrentTemplate.ts'

describe('useCurrentTemplate', () => {
  afterEach(() => {
    _setCurrentTemplate(undefined)
  })

  it('returns undefined outside a per-template scope', () => {
    expect(useCurrentTemplate()).toBeUndefined()
  })

  it('returns the parsed path set by _setCurrentTemplate', () => {
    const parsed = parsePath('/emails/welcome.vue')

    _setCurrentTemplate(parsed)

    const result = useCurrentTemplate()
    expect(result).toBe(parsed)
    expect(result?.name).toBe('welcome')
    expect(result?.ext).toBe('.vue')
  })

  it('clears the current template when set to undefined', () => {
    _setCurrentTemplate(parsePath('/emails/welcome.vue'))
    expect(useCurrentTemplate()).toBeDefined()

    _setCurrentTemplate(undefined)
    expect(useCurrentTemplate()).toBeUndefined()
  })

  it('overwrites the previous value on subsequent sets', () => {
    const first = parsePath('/emails/welcome.vue')
    const second = parsePath('/emails/promo.vue')

    _setCurrentTemplate(first)
    expect(useCurrentTemplate()).toBe(first)

    _setCurrentTemplate(second)
    expect(useCurrentTemplate()).toBe(second)
    expect(useCurrentTemplate()?.name).toBe('promo')
  })
})
