import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveConfig } from '../config/index.ts'
import { defaults } from '../config/defaults.ts'

describe('resolveConfig', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'maizzle-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns defaults when no config file exists', async () => {
    const config = await resolveConfig(undefined, tempDir)

    expect(config.content).toEqual(defaults.content!.map(p => resolve(tempDir, p).replace(/\\/g, '/')))
    expect(config.output?.path).toBe('dist')
    expect(config.output?.extension).toBe('html')
    expect(config.server?.port).toBe(3000)
    expect(config.useTransformers).toBe(true)
    expect(config.css?.preferUnitless).toBe(true)
    expect(config.css?.resolveCalc).toBe(true)
    expect(config.css?.resolveProps).toBe(true)
  })

  it('loads maizzle.config.js from cwd', async () => {
    writeFileSync(
      join(tempDir, 'maizzle.config.js'),
      'export default { content: ["src/**/*.vue"] }'
    )

    const config = await resolveConfig(undefined, tempDir)

    expect(config.content).toEqual([resolve(tempDir, 'src/**/*.vue').replace(/\\/g, '/')])
    // defaults are still applied for missing keys
    expect(config.output?.path).toBe('dist')
  })

  it('loads maizzle.config.ts from cwd', async () => {
    writeFileSync(
      join(tempDir, 'maizzle.config.ts'),
      'export default { output: { path: "dist", extension: "htm" } }'
    )

    const config = await resolveConfig(undefined, tempDir)

    expect(config.output?.path).toBe('dist')
    expect(config.output?.extension).toBe('htm')
    // defaults for non-overridden keys
    expect(config.content).toEqual(defaults.content!.map(p => resolve(tempDir, p).replace(/\\/g, '/')))
  })

  it('prefers maizzle.config.ts over maizzle.config.js', async () => {
    writeFileSync(
      join(tempDir, 'maizzle.config.ts'),
      'export default { content: ["from-ts"] }'
    )
    writeFileSync(
      join(tempDir, 'maizzle.config.js'),
      'export default { content: ["from-js"] }'
    )

    const config = await resolveConfig(undefined, tempDir)

    expect(config.content).toEqual([resolve(tempDir, 'from-ts').replace(/\\/g, '/')])
  })

  it('loads from explicit config path', async () => {
    writeFileSync(
      join(tempDir, 'custom.config.js'),
      'export default { content: ["custom/**/*.vue"] }'
    )

    const config = await resolveConfig('custom.config.js', tempDir)

    expect(config.content).toEqual([resolve(tempDir, 'custom/**/*.vue').replace(/\\/g, '/')])
  })

  it('throws when explicit config path does not exist', async () => {
    await expect(
      resolveConfig('nonexistent.config.js', tempDir)
    ).rejects.toThrow('Config file not found')
  })

  it('merges user config with defaults using defu', async () => {
    writeFileSync(
      join(tempDir, 'maizzle.config.js'),
      'export default { css: { sixHex: true }, server: { port: 4000 } }'
    )

    const config = await resolveConfig(undefined, tempDir)

    // User values
    expect(config.css?.sixHex).toBe(true)
    expect(config.server?.port).toBe(4000)
    // Defaults preserved for unset nested keys
    expect(config.css?.preferUnitless).toBe(true)
    expect(config.server?.watch).toEqual([])
  })

  it('resolves components.root string relative to root', async () => {
    const config = await resolveConfig({
      root: 'project',
      components: { root: 'src/shared' },
    }, tempDir)

    expect(config.components?.root).toEqual([resolve(tempDir, 'project', 'src/shared')])
  })

  it('resolves components.root array relative to root', async () => {
    const config = await resolveConfig({
      root: 'project',
      components: { root: ['layouts', 'partials'] },
    }, tempDir)

    expect(config.components?.root).toEqual([
      resolve(tempDir, 'project', 'layouts'),
      resolve(tempDir, 'project', 'partials'),
    ])
  })

  it('passes through arbitrary user data', async () => {
    writeFileSync(
      join(tempDir, 'maizzle.config.js'),
      'export default { foo: "bar", myData: { nested: true } }'
    )

    const config = await resolveConfig(undefined, tempDir)

    expect(config.foo).toBe('bar')
    expect((config as any).myData).toEqual({ nested: true })
  })
})
