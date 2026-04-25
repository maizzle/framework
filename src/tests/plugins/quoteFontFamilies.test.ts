import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import { quoteFontFamilies } from '../../plugins/postcss/quoteFontFamilies.ts'

async function run(css: string): Promise<string> {
  const result = await postcss([quoteFontFamilies()]).process(css, { from: undefined })
  return result.css
}

describe('quoteFontFamilies', () => {
  it('quotes a multi-word family that lightningcss unquoted', async () => {
    const out = await run('.f { font-family: Open Sans, Arial, sans-serif }')
    expect(out).toBe('.f { font-family: "Open Sans", Arial, sans-serif }')
  })

  it('leaves single-word families alone', async () => {
    const out = await run('.f { font-family: Roboto, Arial, sans-serif }')
    expect(out).toBe('.f { font-family: Roboto, Arial, sans-serif }')
  })

  it('preserves already-quoted families', async () => {
    const out = await run(`.f { font-family: "Open Sans", "Helvetica Neue", sans-serif }`)
    expect(out).toBe(`.f { font-family: "Open Sans", "Helvetica Neue", sans-serif }`)
  })

  it('preserves single-quoted families', async () => {
    const out = await run(`.f { font-family: 'Open Sans', sans-serif }`)
    expect(out).toBe(`.f { font-family: 'Open Sans', sans-serif }`)
  })

  it('does not touch generic keywords with spaces', async () => {
    const out = await run('.f { font-family: ui-sans-serif, system-ui, sans-serif }')
    expect(out).toBe('.f { font-family: ui-sans-serif, system-ui, sans-serif }')
  })

  it('quotes multiple multi-word names in one declaration', async () => {
    const out = await run('.f { font-family: Open Sans, Helvetica Neue, sans-serif }')
    expect(out).toBe('.f { font-family: "Open Sans", "Helvetica Neue", sans-serif }')
  })

  it('handles var() references without quoting', async () => {
    const out = await run('.f { font-family: var(--font-open-sans), Arial }')
    expect(out).toBe('.f { font-family: var(--font-open-sans), Arial }')
  })

  it('only touches font-family declarations', async () => {
    const out = await run('.f { content: "hello world" }')
    expect(out).toBe('.f { content: "hello world" }')
  })

  it('is a no-op when value has no spaces', async () => {
    const out = await run('.f { font-family: serif }')
    expect(out).toBe('.f { font-family: serif }')
  })
})
