import { describe, it, expect } from 'vitest'
import { resolveConfigBrowser } from '../config/browser.ts'
import { defaults } from '../config/defaults.ts'

describe('resolveConfigBrowser', () => {
  it('layers config over framework defaults', () => {
    const merged = resolveConfigBrowser({ css: { inline: true } })
    expect(merged.css?.inline).toBe(true)
    // A key the caller didn't set falls back to defaults.
    expect(merged.build).toEqual(defaults.build)
  })

  it('replaces default arrays instead of concatenating them', () => {
    const merged = resolveConfigBrowser({ content: ['custom/**/*.vue'] })
    expect(merged.content).toEqual(['custom/**/*.vue'])
  })

  it('defaults root to "/" when absent', () => {
    expect(resolveConfigBrowser({}).root).toBe('/')
  })

  it('preserves an explicit root', () => {
    expect(resolveConfigBrowser({ root: '/srv/emails' }).root).toBe('/srv/emails')
  })

  it('returns defaults when called with no argument', () => {
    const merged = resolveConfigBrowser()
    expect(merged.root).toBe('/')
    expect(merged.content).toEqual(defaults.content)
  })

  it('ignores a non-object argument', () => {
    const merged = resolveConfigBrowser('nope' as never)
    expect(merged.root).toBe('/')
    expect(merged.content).toEqual(defaults.content)
  })
})
