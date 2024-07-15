import { describe, expect, test } from 'vitest'
import { render } from '../src/generators/render.js'

describe.concurrent('Render', () => {
  test('Throws if first argument is not a string', async () => {
    const html = true

    await expect(render(html)).rejects.toThrow('first argument must be a string')
  })

  test('Throws if first argument is an empty string', async () => {
    const html = ''

    await expect(render(html)).rejects.toThrow('received empty string')
  })

  test('Uses data from config if available', async () => {
    const source = '<div class="inline">{{ page.mail }}</div>'

    const { html } = await render(source, {
      mail: 'puzzle'
    })

    expect(html).toBe('<div class="inline">puzzle</div>')
  })

  test('Runs the `beforeRender` event', async () => {
    const { html } = await render('<div class="inline">{{ page.foo }}</div>', {
      beforeRender({ config }) {
        config.foo = 'bar'
      }
    })

    expect(html).toBe('<div class="inline">bar</div>')
  })

  test('Runs the `afterRender` event', async () => {
    const { html } = await render('<div class="inline">foo</div>', {
      afterRender({ config }) {
        config.replaceStrings = {
          foo: 'bar'
        }
      }
    })

    expect(html).toBe('<div class="inline">bar</div>')
  })

  test('Runs the `afterTransformers` event', async () => {
    const { html: withHtmlReturned } = await render('<div class="inline">foo</div>', {
      replaceStrings: {
        foo: 'bar'
      },
      afterTransformers({ html }) {
        return html.replace('bar', 'baz')
      }
    })

    const { html: nothingReturned } = await render('<div class="inline">foo</div>', {
      replaceStrings: {
        foo: 'bar'
      },
      afterTransformers({ html }) {
        html.replace('bar', 'baz')
      }
    })

    expect(withHtmlReturned).toBe('<div class="inline">baz</div>')
    expect(nothingReturned).toBe('<div class="inline">bar</div>')
  })
})
