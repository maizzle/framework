import { describe, expect, test } from 'vitest'
import { render } from '../src/generators/render.js'
import { run as useTransformers } from '../src/transformers/index.js'

const cleanString = (str) => str.replace(/\s+/g, ' ').trim()

describe.concurrent('Tags', () => {
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

  test('<template> tags', async () => {
    const { html } = await useTransformers(`
      <template uppercase>test</template>
      <template preserve>test</template>
    `)

    expect(cleanString(html)).toBe('TEST <template>test</template>')
  })

  test('<env> tags', async () => {
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

  test('<not-env> tags', async () => {
    const source = `
      <not-env:local>{{ page.env }}</not-env:local>
      <not-env:production>{{ page.env }}</not-env:production>
      <fake:production>ignore</fake:production>
      <not-env:>test</not-env:>
    `

    const { html: inDev } = await render(source)

    const { html: inProduction } = await render(source, {
      env: 'production'
    })

    // we don't pass `env` to the page object so it remains as-is
    expect(cleanString(inDev)).toBe('{{ page.env }} <fake:production>ignore</fake:production>')
    expect(cleanString(inProduction)).toBe('production <fake:production>ignore</fake:production>')
  })
})
