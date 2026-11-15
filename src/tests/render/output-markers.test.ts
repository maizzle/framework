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

  it('survives a filter on an ancestor of Plaintext', async () => {
    const result = await render(`
      <template>
        <div uppercase>
          <Plaintext>only-pt</Plaintext>
          <NotPlaintext>only-html</NotPlaintext>
          <p>shared <Raw>{{ $a->b }}</Raw></p>
        </div>
      </template>
    `, { plaintext: true })

    expect(result.html).not.toMatch(/only-pt/i)
    expect(result.html).toContain('ONLY-HTML')
    expect(result.html).toContain('SHARED {{ $a->b }}')
    expect(result.html).not.toMatch(/__MZ/i)

    expect(result.plaintext).toContain('ONLY-PT')
    expect(result.plaintext).not.toMatch(/only-html/i)
    expect(result.plaintext).toContain('SHARED {{ $a->b }}')
    expect(result.plaintext).not.toMatch(/__MZ/i)
  })

  it('survives replaceStrings replacing underscores', async () => {
    const result = await render(`
      <template>
        <div>
          <Plaintext>only_pt</Plaintext>
          <NotPlaintext>only_html</NotPlaintext>
          <p>snake_case <Raw>{{ $a->b_c }}</Raw></p>
        </div>
      </template>
    `, { plaintext: true, replaceStrings: { _: '-' } })

    expect(result.html).not.toMatch(/only.pt/)
    expect(result.html).toContain('only-html')
    expect(result.html).toContain('snake-case {{ $a->b_c }}')
    expect(result.html).not.toMatch(/MZ(PT|HO|RAW)/)

    expect(result.plaintext).toContain('only-pt')
    expect(result.plaintext).not.toMatch(/only.html/)
    expect(result.plaintext).toContain('snake-case {{ $a->b_c }}')
    expect(result.plaintext).not.toMatch(/MZ(PT|HO|RAW)/)
  })

  it('survives replaceStrings removing non-ASCII characters', async () => {
    const result = await render(`
      <template>
        <div>
          <Plaintext>only-pt café</Plaintext>
          <NotPlaintext>only-html café</NotPlaintext>
          <p>shared café <Raw>{{ $a->b }} – raw</Raw></p>
        </div>
      </template>
    `, { plaintext: true, replaceStrings: { '[^\\x00-\\x7F]': '' } })

    expect(result.html).not.toContain('only-pt')
    expect(result.html).toContain('only-html caf')
    expect(result.html).toContain('shared caf {{ $a->b }} – raw')
    expect(result.html).not.toMatch(/MZ(PT|HO|RAW)/)

    expect(result.plaintext).toContain('only-pt caf')
    expect(result.plaintext).not.toContain('only-html')
    expect(result.plaintext).toContain('shared caf {{ $a->b }} – raw')
    expect(result.plaintext).not.toMatch(/MZ(PT|HO|RAW)/)
  })
})
