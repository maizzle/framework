import { describe, expect, test } from 'vitest'
import { useMso } from '../../src/index.js'
import { cleanString } from '../../src/utils/string.js'

describe.concurrent('MSO tags', () => {
  test('Sanity test', async () => {
    expect(
      cleanString(
        await useMso(`
          <outlook>show in outlook</outlook>
          <not-outlook>hide from outlook</not-outlook>
        `)
      )
    ).toBe(cleanString(`
      <!--[if mso]>show in outlook<![endif]-->
      <!--[if !mso]><!-->hide from outlook<!--<![endif]-->
    `))
  })
})
