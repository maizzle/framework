import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { render } from '../../render/index.ts'
import { createTempProject } from './_helpers.ts'

describe('Plaintext / NotPlaintext via render()', () => {
  let tempDir: string
  const originalCwd = process.cwd()

  beforeEach(() => {
    tempDir = createTempProject()
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('Plaintext content is dropped from html and present in plaintext', async () => {
    const result = await render(`
      <template>
        <div>
          <p>shared</p>
          <Plaintext>only-in-plaintext</Plaintext>
        </div>
      </template>
    `, { plaintext: true })

    expect(result.html).toContain('shared')
    expect(result.html).not.toContain('only-in-plaintext')
    expect(result.html).not.toContain('data-maizzle-plaintext-only')

    expect(result.plaintext).toContain('shared')
    expect(result.plaintext).toContain('only-in-plaintext')
  })

  it('NotPlaintext content is present in html and dropped from plaintext', async () => {
    const result = await render(`
      <template>
        <div>
          <p>shared</p>
          <NotPlaintext>only-in-html</NotPlaintext>
        </div>
      </template>
    `, { plaintext: true })

    expect(result.html).toContain('only-in-html')
    expect(result.html).not.toContain('data-maizzle-html-only')

    expect(result.plaintext).toContain('shared')
    expect(result.plaintext).not.toContain('only-in-html')
  })

  it('routes sibling Plaintext + NotPlaintext to opposite outputs', async () => {
    const result = await render(`
      <template>
        <div>
          <Plaintext>only-pt</Plaintext>
          <NotPlaintext>only-html</NotPlaintext>
        </div>
      </template>
    `, { plaintext: true })

    expect(result.html).not.toContain('only-pt')
    expect(result.html).toContain('only-html')

    expect(result.plaintext).toContain('only-pt')
    expect(result.plaintext).not.toContain('only-html')
  })

  it('URL transforms apply to plaintext content', async () => {
    const result = await render(`
      <template>
        <div>
          <Plaintext>
            <a href="/path">label</a>
          </Plaintext>
        </div>
      </template>
    `, {
      plaintext: true,
      url: { base: 'https://example.com' },
    })

    // baseURL transform should have prefixed the href before plaintext extraction
    expect(result.plaintext).toContain('label')
    expect(result.plaintext).toContain('https://example.com/path')
  })
})
