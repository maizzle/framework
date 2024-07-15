import request from 'supertest'
import serve from '../src/commands/serve.js'
import { describe, expect, test, beforeAll } from 'vitest'

const init = async () => {
  await serve({
    build: {
      content: 'test/fixtures/build/**/*.html',
      static: {
        source: 'test/fixtures/build/**/*.png',
      }
    },
    components: {
      folders: ['test/stubs/templates']
    },
    beforeCreate(config) {
      config.hello = 'world'
    },
    server: {
      maxRetries: 1
    }
  })
}

beforeAll(async () => {
  await init()
})

describe.concurrent('Server', () => {
  test('Starts server', async () => {
    const res = await request('http://localhost:3000').get('/')

    expect(res.status).toBe(200)
    expect(res.text).toContain('<title>Maizzle | Templates</title>')

    // Test if the server serves static files from `build.static.source`
    const imageRes = await request('http://localhost:3000').get('/image.png')
    expect(imageRes.status).toBe(200)
  })

  test('Retries for a different port', async () => {
    await init()

    const res = await request('http://localhost:3001').get('/')

    expect(res.status).toBe(200)
  })

  test('Throws if it cannot render a template', async () => {
    const res = await request('http://localhost:3000').get('/error.html')

    expect(res.status).toBe(500)
  })

  test('Serves scripts', async () => {
    const hmr = await request('http://localhost:3000').get('/hmr.js')

    expect(hmr.status).toBe(200)
  })

  test('Lists grouped templates', async () => {
    const res = await request('http://localhost:3000').get('/')

    expect(res.status).toBe(200)
    expect(res.text).toContain('<h2>test/fixtures/build</h2>')
  })

  test('Renders template', async () => {
    const res = await request('http://localhost:3000').get('/expandLinkTag.html')

    expect(res.status).toBe(200)
    expect(res.text).toContain('<style>.hidden {')
  })
})
