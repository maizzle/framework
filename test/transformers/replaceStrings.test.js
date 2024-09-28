import { describe, expect, test } from 'vitest'
import { replaceStrings } from '../../src/index.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Replace strings', () => {
  test('Does nothing if no options were passed', async () => {
    expect(await replaceStrings('initial text')).toBe('initial text')
    expect(await replaceStrings('initial text', {})).toBe('initial text')
  })

  test('Skips targets it cannot find', async () => {
    expect(await replaceStrings('initial text', { '/not/': 'found' })).toBe('initial text')
  })

  test('Replaces strings', async () => {
    expect(await replaceStrings('initial text', { 'initial': 'updated' })).toBe('updated text')
  })

  test('Replaces capturing groups', async () => {
    expect(await replaceStrings('initial [text]', { '(initial) \\[(text)\\]': '($2) updated' })).toBe('(text) updated')
    expect(await replaceStrings('«initial» «text»', { '«(.*?)»' : '«&nbsp;$1&nbsp;»' })).toBe('«&nbsp;initial&nbsp;» «&nbsp;text&nbsp;»')
  })

  test('useTransformers context', async () => {
    expect(
      await useTransformers('initial text', { replaceStrings: { 'initial': 'updated' } }).then(({ html }) => html)
    ).toBe('updated text')
  })
})
