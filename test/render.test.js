import { describe, expect, test } from 'vitest'
import { render } from '../src/generators/render.js'

const cleanString = (str) => str.replace(/\s+/g, ' ').trim()


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
      beforeRender({ config, posthtml, transform }) {
        config.foo = 'bar'

        expect(config).toBeInstanceOf(Object)
        expect(posthtml).toBeInstanceOf(Function)
        expect(transform.inlineCSS).toBeInstanceOf(Function)
      }
    })

    expect(html).toBe('<div class="inline">bar</div>')
  })

  test('Runs the `afterRender` event', async () => {
    const { html } = await render('<div class="inline">foo</div>', {
      afterRender({ config, posthtml, transform }) {
        config.replaceStrings = {
          foo: 'bar'
        }

        expect(config).toBeInstanceOf(Object)
        expect(posthtml).toBeInstanceOf(Function)
        expect(transform.inlineCSS).toBeInstanceOf(Function)
      }
    })

    expect(html).toBe('<div class="inline">bar</div>')
  })

  test('Runs the `afterTransformers` event', async () => {
    const { html: withHtmlReturned } = await render('<div class="inline">foo</div>', {
      replaceStrings: {
        foo: 'bar'
      },
      afterTransformers({ html, config, posthtml, transform }) {
        expect(config).toBeInstanceOf(Object)
        expect(posthtml).toBeInstanceOf(Function)
        expect(transform.inlineCSS).toBeInstanceOf(Function)

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

  test('Uses env-based attributes', async () => {
    const source = '<div title="local" title-production="{{ page.env }}"></div>'

    const { html: inDev } = await render(source)

    const { html: inProduction } = await render(source, {
      env: 'production'
    })

    expect(inDev).toBe('<div title="local" title-production="{{ page.env }}"></div>')
    expect(inProduction).toBe('<div title="production"></div>')
  })

  test('Parses <env:> tags based on current environment', async () => {
    const source = `
      <env:local>{{ page.env }}</env:local>
      <env:production>{{ page.env }}</env:production>
      <fake:production>ignore</fake:production>
      <env:>test</env:>
    `

    const { html: inDev } = await render(source)

    const { html: inProduction } = await render(source, {
      env: 'production'
    })

    // we don't pass `env` to the page object so it remains as-is
    expect(cleanString(inDev)).toBe('{{ page.env }} <fake:production>ignore</fake:production>')
    expect(inProduction.trim()).toBe('production\n      <fake:production>ignore</fake:production>')
  })
})
