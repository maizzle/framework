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
      beforeRender({ config, matter }) {
        config.foo = 'bar'

        expect(config).toBeInstanceOf(Object)
        expect(matter).toBeInstanceOf(Object)
      }
    })

    expect(html).toBe('<div class="inline">bar</div>')
  })

  test('Runs the `afterRender` event', async () => {
    const { html } = await render('<div class="inline">foo</div>', {
      afterRender({ config, matter }) {
        config.replaceStrings = {
          foo: 'bar'
        }

        expect(config).toBeInstanceOf(Object)
        expect(matter).toBeInstanceOf(Object)
      }
    })

    expect(html).toBe('<div class="inline">bar</div>')
  })

  test('Runs the `afterTransformers` event', async () => {
    const { html: withHtmlReturned } = await render('<div class="inline">foo</div>', {
      replaceStrings: {
        foo: 'bar'
      },
      afterTransformers({ html, matter, config }) {
        expect(config).toBeInstanceOf(Object)
        expect(matter).toBeInstanceOf(Object)

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

  test('<env:> tags', async () => {
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

  test('fetch component', async () => {
    const { html } = await render(`
      <x-list>
        <fetch url="test/stubs/data.json">
          {{ undefinedVariable }}
          <each loop="user in response">{{ user.name + (loop.last ? '' : ', ') }}</each>
          @{{ ignored }}
        </fetch>
      </x-list>
    `, {
      components: {
        folders: ['test/stubs/components'],
      }
    })

    expect(cleanString(html)).toBe('<h1>Results</h1> {{ undefinedVariable }} Leanne Graham, Ervin Howell {{ ignored }}')
  })

  test('uses expressions options', async () => {
    const { html } = await render(`
      <script locals>
        module.exports = { name: 'John' }
      </script>
      <h1>Hello {{ name }}</h1>
    `,
      {
        expressions: {
          removeScriptLocals: true,
        }
      }
    )

    expect(cleanString(html)).toBe('<h1>Hello John</h1>')
  })

  test("whitespace", async () => {
    const { html } = await render(`
      <h1>Hello <x-span>John</x-span>, nice to meet you!</h1>
    `,
      {
        components: {
          folders: ["test/stubs/components"],
        }
      }
    )

    expect(cleanString(html)).toBe("<h1>Hello <span>John</span>, nice to meet you!</h1>");
  })
})
