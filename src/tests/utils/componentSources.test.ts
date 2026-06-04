import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import {
  normalizeComponentSources,
  componentNameFromPath,
} from '../../utils/componentSources.ts'

describe('normalizeComponentSources', () => {
  const cwd = '/abs/cwd'

  it('returns [] for undefined', () => {
    expect(normalizeComponentSources(undefined, cwd)).toEqual([])
  })

  it('wraps a single string into a one-element array', () => {
    expect(normalizeComponentSources('shared', cwd)).toEqual([
      { path: resolve(cwd, 'shared'), prefix: undefined, pathPrefix: true },
    ])
  })

  it('resolves array of strings against cwd, defaults pathPrefix true', () => {
    expect(normalizeComponentSources(['a', 'b'], cwd)).toEqual([
      { path: resolve(cwd, 'a'), prefix: undefined, pathPrefix: true },
      { path: resolve(cwd, 'b'), prefix: undefined, pathPrefix: true },
    ])
  })

  it('preserves prefix and pathPrefix on object entries', () => {
    expect(normalizeComponentSources([
      { path: 'widgets', prefix: 'W' },
      { path: 'icons', prefix: 'Icon', pathPrefix: false },
    ], cwd)).toEqual([
      { path: resolve(cwd, 'widgets'), prefix: 'W', pathPrefix: true },
      { path: resolve(cwd, 'icons'), prefix: 'Icon', pathPrefix: false },
    ])
  })

  it('treats empty-string prefix as a real value (not undefined)', () => {
    expect(normalizeComponentSources([{ path: 'flat', prefix: '' }], cwd)).toEqual([
      { path: resolve(cwd, 'flat'), prefix: '', pathPrefix: true },
    ])
  })

  it('mixes string and object entries in one array', () => {
    expect(normalizeComponentSources(['shared', { path: 'widgets', prefix: 'W' }], cwd)).toEqual([
      { path: resolve(cwd, 'shared'), prefix: undefined, pathPrefix: true },
      { path: resolve(cwd, 'widgets'), prefix: 'W', pathPrefix: true },
    ])
  })

  it('passes single object entry through (not array)', () => {
    expect(normalizeComponentSources({ path: 'widgets', prefix: 'W' }, cwd)).toEqual([
      { path: resolve(cwd, 'widgets'), prefix: 'W', pathPrefix: true },
    ])
  })
})

describe('componentNameFromPath', () => {
  const dirRoot = '/abs/components'

  describe('directoryAsNamespace mode (no explicit prefix)', () => {
    it('returns bare PascalCased name for files at the dir root', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/Button.vue',
        dirRoot,
        prefix: undefined,
        pathPrefix: true,
      })).toBe('Button')
    })

    it('prepends the parent folder name as namespace', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/card/Header.vue',
        dirRoot,
        prefix: undefined,
        pathPrefix: true,
      })).toBe('CardHeader')
    })

    it('joins multiple nested folders into the namespace', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/card/items/Button.vue',
        dirRoot,
        prefix: undefined,
        pathPrefix: true,
      })).toBe('CardItemsButton')
    })

    it('collapses repeated prefix when filename already starts with the folder', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/card/CardHeader.vue',
        dirRoot,
        prefix: undefined,
        pathPrefix: true,
      })).toBe('CardHeader')
    })

    it('strips .md extension', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/card/Header.md',
        dirRoot,
        prefix: undefined,
        pathPrefix: true,
      })).toBe('CardHeader')
    })

    it('PascalCases kebab-case filenames', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/card/big-header.vue',
        dirRoot,
        prefix: undefined,
        pathPrefix: true,
      })).toBe('CardBigHeader')
    })

    it('PascalCases snake_case filenames', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/card/big_header.vue',
        dirRoot,
        prefix: undefined,
        pathPrefix: true,
      })).toBe('CardBigHeader')
    })
  })

  describe('explicit prefix mode', () => {
    it('prepends a custom prefix in front of the filename', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/Button.vue',
        dirRoot,
        prefix: 'W',
        pathPrefix: true,
      })).toBe('WButton')
    })

    it('keeps subfolder names with pathPrefix: true', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/social/Twitter.vue',
        dirRoot,
        prefix: 'Icon',
        pathPrefix: true,
      })).toBe('IconSocialTwitter')
    })

    it('drops subfolder names with pathPrefix: false', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/social/Twitter.vue',
        dirRoot,
        prefix: 'Icon',
        pathPrefix: false,
      })).toBe('IconTwitter')
    })

    it('avoids double-prefixing when filename already starts with prefix', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/WButton.vue',
        dirRoot,
        prefix: 'W',
        pathPrefix: true,
      })).toBe('WButton')
    })

    it('treats empty-string prefix as no prefix, keeping the bare filename', () => {
      expect(componentNameFromPath({
        filePath: '/abs/components/social/Twitter.vue',
        dirRoot,
        prefix: '',
        pathPrefix: false,
      })).toBe('Twitter')
    })
  })
})
