import { expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import { filters } from '../../src/index.js'

const fixture = await readFile(new URL('../fixtures/filters.html', import.meta.url), 'utf8')
const expected = await readFile(new URL('../expected/filters.html', import.meta.url), 'utf8')

test('Filters', async () => {
  const customFilters = {
    'underscore-case': string => string.split('').join('_'),
  }

  expect(
    await filters(fixture, customFilters)
  ).toBe(expected)
})
