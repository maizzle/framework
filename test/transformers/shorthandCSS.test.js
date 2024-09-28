import { describe, expect, test } from 'vitest'
import { shorthandCSS } from '../../src/index.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Shorthand CSS', () => {
  const html = '<div style="margin-top: 0px; margin-right: 4px; margin-bottom: 0; margin-left: 0; padding-top: 0; padding-right: 0; padding-bottom: 0; padding-left: 2px;"></div>'
  const expected = '<div style="margin: 0px 4px 0 0; padding: 0 0 0 2px;"></div>'

  test('Sanity test', async () => {
    expect(await shorthandCSS(html)).toBe(expected)

    expect(await shorthandCSS(html, {
      tags: ['div']
    })).toBe(expected)
  })

  test('useTransformers context', async () => {
    expect(
      await useTransformers(html, { css: { shorthand: true } }).then(({ html }) => html)
    ).toBe(expected)
  })
})
