import { describe, it, expect } from 'vitest'
import { twMerge } from '../../utils/twMerge.ts'

describe('twMerge', () => {
  it('merges standard Tailwind utilities', () => {
    expect(twMerge('m-0 px-2', 'px-4')).toBe('m-0 px-4')
  })

  it('does not treat text-underline-* as a text color', () => {
    expect(twMerge('text-underline-1', 'text-red-500')).toBe('text-underline-1 text-red-500')
    expect(twMerge('text-underline-color-red-500', 'text-blue-500')).toBe('text-underline-color-red-500 text-blue-500')
  })

  it('merges text-underline-* utilities within their own group', () => {
    expect(twMerge('text-underline-1', 'text-underline-2')).toBe('text-underline-2')
    expect(twMerge('text-underline-style-dotted', 'text-underline-style-solid')).toBe('text-underline-style-solid')
    expect(twMerge('text-underline-color-red-500', 'text-underline-color-blue-500')).toBe('text-underline-color-blue-500')
  })

  it('merges prose size modifiers but keeps the base prose class', () => {
    expect(twMerge('prose-sm', 'prose-lg')).toBe('prose-lg')
    expect(twMerge('prose', 'prose-lg')).toBe('prose prose-lg')
  })

  it('merges mso-* utilities', () => {
    expect(twMerge('mso-hide-all', 'mso-hide-none')).toBe('mso-hide-none')
    expect(twMerge('sm:mso-hide-all', 'sm:mso-hide-none')).toBe('sm:mso-hide-none')
    expect(twMerge('mso-line-height-rule-exactly', 'mso-line-height-rule-at-least')).toBe('mso-line-height-rule-at-least')
    expect(twMerge('mso-element-left-4', '-mso-element-left-4')).toBe('-mso-element-left-4')
  })

  it('keeps mso-* utilities with a shared prefix apart', () => {
    expect(twMerge('mso-element-para-border-div', 'mso-element-wrap-none')).toBe('mso-element-para-border-div mso-element-wrap-none')
  })

  it('lets mso-* shorthands override their sides', () => {
    expect(twMerge('mso-padding-top-alt-4', 'mso-padding-alt-0')).toBe('mso-padding-alt-0')
    expect(twMerge('mso-padding-alt-0', 'mso-padding-top-alt-4')).toBe('mso-padding-alt-0 mso-padding-top-alt-4')
  })
})
