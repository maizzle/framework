import { describe, expect, test } from 'vitest'
import { safeClassNames } from '../../src/index.js'
import { cleanString } from '../../src/utils/string.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Safe class names', () => {
  const html = `
    <style>
      .sm\\:text-left {
        text-align: left;
      }
      .w-1\\.5 {
        width: 1.5rem;
      }
    </style>
    <div class="sm:text-left w-1.5">foo</div>
  `

  const expected = `
    <style>
      .sm-text-left {
        text-align: left;
      }
      .w-1_dot_5 {
        width: 1.5rem;
      }
    </style>
    <div class="sm-text-left w-1_dot_5">foo</div>
  `

  test('Works with options (object)', async () => {
    expect(
      cleanString(
        await safeClassNames(html, {
          replacements: {
            '.': '_dot_',
          }
        })
      )
    ).toBe(cleanString(expected))
  })

  test('Works with options (boolean)', async () => {
    expect(
      cleanString(
        await safeClassNames(html, true)
      )
    ).toBe(cleanString(`
      <style>
        .sm-text-left {
          text-align: left;
        }
        .w-1_5 {
          width: 1.5rem;
        }
      </style>
      <div class="sm-text-left w-1_5">foo</div>
    `))
  })

  test('useTransformers context', async () => {
    expect(
      cleanString(
        await useTransformers(html, {
          css: {
            safe: {
              replacements: {
                '.': '_dot_',
              }
            }
          }
        }).then(({ html }) => html)
      )
    ).toBe(cleanString(`
      <style>
        .sm-text-left {
          text-align: left;
        }
        .w-1_dot_5 {
          width: 1.5rem;
        }
      </style>
      <div class="sm-text-left w-1_dot_5">foo</div>
    `))
  })
})
