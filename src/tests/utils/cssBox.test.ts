import { describe, it, expect } from 'vitest'
import safeParser from 'postcss-safe-parser'
import {
  lengthToPx,
  shorthandSides,
  horizontalPaddingPx,
  shorthandBorderWidthPx,
  horizontalBorderPx,
} from '../../utils/cssBox.ts'

const root = (decls: string) => safeParser(decls)

describe('lengthToPx', () => {
  it('parses px and unitless as px', () => {
    expect(lengthToPx('10px')).toBe(10)
    expect(lengthToPx('480')).toBe(480)
  })

  it('converts rem and em at 16px root', () => {
    expect(lengthToPx('2rem')).toBe(32)
    expect(lengthToPx('1.5em')).toBe(24)
  })

  it('converts pt', () => {
    expect(lengthToPx('12pt')).toBeCloseTo(12 * 1.333, 5)
  })

  it('returns null for percentages and non-lengths', () => {
    expect(lengthToPx('50%')).toBeNull()
    expect(lengthToPx('auto')).toBeNull()
  })
})

describe('shorthandSides', () => {
  it('expands 1-4 token shorthands', () => {
    expect(shorthandSides('5px')).toEqual({ left: '5px', right: '5px' })
    expect(shorthandSides('1px 2px')).toEqual({ left: '2px', right: '2px' })
    expect(shorthandSides('1px 2px 3px')).toEqual({ left: '2px', right: '2px' })
    expect(shorthandSides('1px 2px 3px 4px')).toEqual({ left: '4px', right: '2px' })
  })

  it('returns an empty object for more than four tokens', () => {
    expect(shorthandSides('1px 2px 3px 4px 5px')).toEqual({})
  })
})

describe('horizontalPaddingPx', () => {
  it('sums left and right from the padding shorthand', () => {
    expect(horizontalPaddingPx(root('padding: 0 20px'))).toBe(40)
  })

  it('reads per-side padding', () => {
    expect(horizontalPaddingPx(root('padding-left: 5px; padding-right: 7px'))).toBe(12)
  })

  it('ignores percentage padding', () => {
    expect(horizontalPaddingPx(root('padding: 10%'))).toBe(0)
  })

  it('ignores a malformed padding shorthand (more than four tokens)', () => {
    expect(horizontalPaddingPx(root('padding: 1px 2px 3px 4px 5px'))).toBe(0)
  })
})

describe('shorthandBorderWidthPx', () => {
  it('extracts the px width from a shorthand', () => {
    expect(shorthandBorderWidthPx('2px solid red')).toBe(2)
  })

  it('returns null for none/hidden', () => {
    expect(shorthandBorderWidthPx('none')).toBeNull()
  })

  it('defaults to 3px when a style is set but no width', () => {
    expect(shorthandBorderWidthPx('solid red')).toBe(3)
  })
})

describe('horizontalBorderPx', () => {
  it('sums both sides from the border shorthand', () => {
    expect(horizontalBorderPx(root('border: 2px solid red'))).toBe(4)
  })

  it('treats a no-width border shorthand as zero', () => {
    expect(horizontalBorderPx(root('border: none'))).toBe(0)
  })

  it('reads border-width shorthand', () => {
    expect(horizontalBorderPx(root('border-width: 1px 2px'))).toBe(4)
  })

  it('reads per-side border and width', () => {
    expect(horizontalBorderPx(root('border-left: 3px solid red'))).toBe(3)
    expect(horizontalBorderPx(root('border-right-width: 6px'))).toBe(6)
  })

  it('honors border-style: none in the shorthand', () => {
    expect(horizontalBorderPx(root('border-width: 1px 2px; border-style: none none'))).toBe(0)
  })

  it('honors per-side border-left-style/border-right-style none', () => {
    expect(horizontalBorderPx(root('border-left-width: 5px; border-left-style: none'))).toBe(0)
    expect(horizontalBorderPx(root('border-right-width: 5px; border-right-style: hidden'))).toBe(0)
  })

  it('honors a no-width border-left/right shorthand as that side zero', () => {
    expect(horizontalBorderPx(root('border-left: 4px solid red; border-right: none'))).toBe(4)
    expect(horizontalBorderPx(root('border-left: none; border-right: 4px solid red'))).toBe(4)
  })

  it('ignores a malformed border-width shorthand (more than four tokens)', () => {
    expect(horizontalBorderPx(root('border-width: 1px 2px 3px 4px 5px'))).toBe(0)
  })

  it('keeps the previous width when a border-width token is not a length', () => {
    expect(horizontalBorderPx(root('border-width: medium medium'))).toBe(0)
  })

  it('keeps the previous width when a per-side border width is not a length', () => {
    expect(horizontalBorderPx(root('border-left-width: thin'))).toBe(0)
    expect(horizontalBorderPx(root('border-right-width: thin'))).toBe(0)
  })

  it('keeps a per-side width when its style is visible (not none/hidden)', () => {
    expect(horizontalBorderPx(root('border-left-width: 5px; border-left-style: solid'))).toBe(5)
    expect(horizontalBorderPx(root('border-right-width: 6px; border-right-style: dashed'))).toBe(6)
  })
})
