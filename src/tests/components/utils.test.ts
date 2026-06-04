import { describe, it, expect } from 'vitest'
import {
  normalizeToPixels,
  nextId,
  hasWidthUtility,
  hasWidthInStyle,
  hasHeightUtility,
  hasHeightInStyle,
} from '../../components/utils.ts'

describe('normalizeToPixels', () => {
  it('appends px to a number', () => {
    expect(normalizeToPixels(16)).toBe('16px')
  })

  it('appends px to a numeric string', () => {
    expect(normalizeToPixels('16')).toBe('16px')
  })

  it('leaves non-numeric values untouched', () => {
    expect(normalizeToPixels('100%')).toBe('100%')
    expect(normalizeToPixels('auto')).toBe('auto')
  })
})

describe('nextId', () => {
  it('mints sequential ids per prefix', () => {
    const prefix = 'utiltest'
    expect(nextId(prefix)).toBe('utiltest1')
    expect(nextId(prefix)).toBe('utiltest2')
  })

  it('counts each prefix independently', () => {
    expect(nextId('alpha')).toBe('alpha1')
    expect(nextId('beta')).toBe('beta1')
    expect(nextId('alpha')).toBe('alpha2')
  })
})

describe('hasWidthUtility', () => {
  it('detects w-, max-w-, min-w-', () => {
    expect(hasWidthUtility('w-4')).toBe(true)
    expect(hasWidthUtility('max-w-full')).toBe(true)
    expect(hasWidthUtility('p-2 min-w-0')).toBe(true)
  })

  it('strips variant prefixes and ! before matching', () => {
    expect(hasWidthUtility('md:w-4')).toBe(true)
    expect(hasWidthUtility('!w-4')).toBe(true)
    expect(hasWidthUtility('md:!max-w-sm')).toBe(true)
  })

  it('returns false when no width utility is present', () => {
    expect(hasWidthUtility('p-2 text-sm')).toBe(false)
    expect(hasWidthUtility('')).toBe(false)
  })
})

describe('hasWidthInStyle', () => {
  it('detects width and max-width declarations', () => {
    expect(hasWidthInStyle('width: 100px')).toBe(true)
    expect(hasWidthInStyle('color: red; max-width: 50%')).toBe(true)
    expect(hasWidthInStyle('WIDTH:100px')).toBe(true)
  })

  it('returns false when no width declaration is present', () => {
    expect(hasWidthInStyle('color: red; height: 10px')).toBe(false)
    expect(hasWidthInStyle('')).toBe(false)
  })
})

describe('hasHeightUtility', () => {
  it('detects h-, max-h-, min-h-', () => {
    expect(hasHeightUtility('h-4')).toBe(true)
    expect(hasHeightUtility('max-h-full')).toBe(true)
    expect(hasHeightUtility('p-2 min-h-0')).toBe(true)
  })

  it('strips variant prefixes and ! before matching', () => {
    expect(hasHeightUtility('md:h-4')).toBe(true)
    expect(hasHeightUtility('!h-4')).toBe(true)
    expect(hasHeightUtility('md:!max-h-screen')).toBe(true)
  })

  it('returns false when no height utility is present', () => {
    expect(hasHeightUtility('p-2 w-4')).toBe(false)
    expect(hasHeightUtility('')).toBe(false)
  })
})

describe('hasHeightInStyle', () => {
  it('detects height and max-height declarations', () => {
    expect(hasHeightInStyle('height: 100px')).toBe(true)
    expect(hasHeightInStyle('color: red; max-height: 50%')).toBe(true)
    expect(hasHeightInStyle('HEIGHT:100px')).toBe(true)
  })

  it('returns false when no height declaration is present', () => {
    expect(hasHeightInStyle('color: red; width: 10px')).toBe(false)
    expect(hasHeightInStyle('')).toBe(false)
  })
})
