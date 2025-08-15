import { expect, test } from 'vitest'
import { run as useTransformers } from '../../src/transformers/index.js'

test('replaces css properties', async () => {
  expect(
    await useTransformers(
      '<style>div { color: red; text-decoration-line: underline; }</style>',
      {
        css: {
          replaceProperties: {
            color: 'background-color',
          }
        }
      }).then(({ html }) => html)
  ).toBe('<style>div { background-color: red; text-decoration: underline; }</style>')
})
