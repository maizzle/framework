import { describe, expect, test } from 'vitest'
import { sixHEX } from '../../src/index.js'
import { cleanString } from '../../src/utils/string.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Six-digit HEX', () => {
  const html = `
    <div bgcolor="#000" style="color: #fff; background-color: #000">This should not change: #ffc</div>
    <font color="#fff">Text</font>
  `

  const expected = `
    <div bgcolor="#000000" style="color: #fff; background-color: #000">This should not change: #ffc</div>
    <font color="#ffffff">Text</font>
  `

  test('Sanity test', async () => {
    expect(
      cleanString(
        await sixHEX(html)
      )
    ).toBe(cleanString(expected))
  })

  test('useTransformers context', async () => {
    expect(
      await useTransformers(html, { css: { sixHex: true } }).then(({ html }) => html)
    ).toBe(expected)
  })
})
