import { describe, expect, test, vi } from 'vitest'
import { readFileConfig } from '../src/utils/getConfigByFilePath'

vi.mock('module', () => ({
  async import(path) {
    // Simulate file not found or error condition
    if (path.includes('config.invalid.js')) {
      throw new Error('File not found')
    }

    // Simulate a successful import for other paths
    return { default: { foo: 'bar' } }
  },
}))

describe.concurrent('Config', () => {
  test('Throws if it cannot load the config', async () => {
    await expect(readFileConfig('config.invalid.js'))
      .rejects.toThrow('Could not compute config')

    await expect(readFileConfig({ env: 'invalid' }))
      .rejects.toThrow('Could not compute config')
  })

  test('Returns the resolved config', async () => {
    const config = await readFileConfig('test/stubs/config/config.js')

    expect(config).toHaveProperty('foo', 'bar')
  })

  test('Uses the correct environment config', async () => {
    const config = await readFileConfig({ env: 'maizzle-ci' })

    expect(config)
      .toHaveProperty('env', 'maizzle-ci')
      .toHaveProperty('local', true)
      .toHaveProperty('foo', 'bar')
  })

  test('Overrides `content` in base config', async () => {
    const config = await readFileConfig({ build: { content: ['maizzle-ci'] } })

    expect(config)
      .toHaveProperty('env', 'local')
      .toHaveProperty('build.content', ['maizzle-ci'])
  })
})
