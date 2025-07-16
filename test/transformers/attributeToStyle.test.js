import { describe, expect, test } from 'vitest'
import { attributeToStyle } from '../../src/index.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Attribute to style', () => {
  test('Expands attributes to inline CSS', async () => {
    const html = `<table align="left" width="100%" height="600" bgcolor="#FFFFFF" background="https://example.com/image.jpg">
      <tr>
        <td align="center" valign="top"></td>
      </tr>
    </table>`

    expect(
      await attributeToStyle(html, ['width', 'height', 'bgcolor', 'background', 'align', 'valign'])
    ).toBe(`<table align="left" width="100%" height="600" bgcolor="#FFFFFF" background="https://example.com/image.jpg" style="float: left; width: 100%; height: 600px; background-color: #FFFFFF; background-image: url('https://example.com/image.jpg')">
      <tr>
        <td align="center" valign="top" style="text-align: center; vertical-align: top"></td>
      </tr>
    </table>`)

    expect(
      await useTransformers(html, {
        attributes: { add: false },
        css: { inline: { attributeToStyle: ['width', 'height'] } },
      }).then(({ html }) => html)
    ).toBe(`<table align="left" width="100%" height="600" bgcolor="#ffffff" background="https://example.com/image.jpg" style="width: 100%; height: 600px">
      <tr>
        <td align="center" valign="top"></td>
      </tr>
    </table>`)
  })

  test('Expands align="center" to style="margin-left: auto; margin-right: auto"', async () => {
    const html = `<table align="center">
      <tr>
        <td></td>
      </tr>
    </table>`

    expect(await attributeToStyle(html, ['align'])).toBe(`<table align="center" style="margin-left: auto; margin-right: auto">
      <tr>
        <td></td>
      </tr>
    </table>`)

    // Does not expand anything if options are empty or false
    expect(await attributeToStyle(html, [])).toBe(html)
    expect(await attributeToStyle(html, false)).toBe(html)
  })

  test('Defaults to px for width values without units', async () => {
    expect(
      await attributeToStyle('<td width="100" style="color: #000;"></td>', ['width'])
    ).toBe('<td width="100" style="color: #000; width: 100px"></td>')
  })
})
