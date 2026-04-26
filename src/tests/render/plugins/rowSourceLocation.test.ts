import { describe, it, expect } from 'vitest'
import { rowSourceLocation } from '../../../render/plugins/rowSourceLocation.ts'

type TransformResult = { code: string; map: null } | undefined

function transform(code: string, id: string): TransformResult {
  const plugin = rowSourceLocation()
  // The Vite plugin's `transform` is typed as a hook with extra context.
  // We call it directly here; only `code` and `id` are read.
  return (plugin.transform as unknown as (
    code: string,
    id: string,
  ) => TransformResult)(code, id)
}

describe('rowSourceLocation', () => {
  it('injects data-maizzle-loc on a simple <Row>', () => {
    const code = '<template>\n  <Row>x</Row>\n</template>'
    const result = transform(code, '/abs/welcome.vue')
    expect(result?.code).toContain('<Row data-maizzle-loc="/abs/welcome.vue:2">')
  })

  it('injects data-maizzle-loc on a self-closing <Row />', () => {
    const code = '<template>\n  <Row />\n</template>'
    const result = transform(code, '/abs/welcome.vue')
    expect(result?.code).toMatch(/<Row\s+data-maizzle-loc="\/abs\/welcome\.vue:2"\s*\/>/)
  })

  it('injects data-maizzle-loc on kebab-case <row>', () => {
    const code = '<template>\n  <row>x</row>\n</template>'
    const result = transform(code, '/abs/welcome.vue')
    expect(result?.code).toContain('<row data-maizzle-loc="/abs/welcome.vue:2">')
  })

  it('preserves existing attributes when injecting', () => {
    const code = '<template>\n  <Row class="foo" :width="600">x</Row>\n</template>'
    const result = transform(code, '/abs/welcome.vue')
    expect(result?.code).toContain('class="foo"')
    expect(result?.code).toContain(':width="600"')
    expect(result?.code).toContain('data-maizzle-loc="/abs/welcome.vue:2"')
  })

  it('records distinct line numbers for multiple <Row> tags', () => {
    const code = [
      '<template>',
      '  <Row>a</Row>',
      '  <p>filler</p>',
      '  <Row>b</Row>',
      '</template>',
    ].join('\n')
    const result = transform(code, '/abs/welcome.vue')
    expect(result?.code).toContain('data-maizzle-loc="/abs/welcome.vue:2"')
    expect(result?.code).toContain('data-maizzle-loc="/abs/welcome.vue:4"')
  })

  it('is idempotent: skips <Row> that already has data-maizzle-loc', () => {
    const original = '<template>\n  <Row data-maizzle-loc="/x.vue:1">a</Row>\n</template>'
    const result = transform(original, '/abs/welcome.vue')
    expect(result).toBeUndefined()
  })

  it('does not transform <Row> inside <script> blocks', () => {
    const code = [
      '<script setup>',
      'const help = `use <Row><Column>...</Column></Row> instead`',
      '</script>',
      '<template>',
      '  <Row>x</Row>',
      '</template>',
    ].join('\n')
    const result = transform(code, '/abs/welcome.vue')
    // The `<Row>` in the script string MUST NOT be touched
    expect(result?.code).toContain('`use <Row><Column>...</Column></Row> instead`')
    // The `<Row>` in the template MUST be touched
    expect(result?.code).toContain('<Row data-maizzle-loc="/abs/welcome.vue:5">')
  })

  it('does not transform <Row> inside <style> blocks', () => {
    const code = [
      '<style>',
      '/* <Row> looks like an HTML tag in this comment */',
      '</style>',
      '<template>',
      '  <Row>x</Row>',
      '</template>',
    ].join('\n')
    const result = transform(code, '/abs/welcome.vue')
    expect(result?.code).toContain('/* <Row> looks like an HTML tag in this comment */')
    expect(result?.code).toContain('<Row data-maizzle-loc="/abs/welcome.vue:5">')
  })

  it('transforms the whole file for .md sources', () => {
    const code = '# Hello\n\n<Row>md content</Row>\n'
    const result = transform(code, '/abs/post.md')
    expect(result?.code).toContain('<Row data-maizzle-loc="/abs/post.md:3">')
  })

  it('returns undefined for non-.vue / non-.md files', () => {
    const code = '<Row>x</Row>'
    expect(transform(code, '/abs/welcome.html')).toBeUndefined()
    expect(transform(code, '/abs/script.ts')).toBeUndefined()
  })

  it('returns undefined when source has no <Row', () => {
    const code = '<template>\n  <div>plain</div>\n</template>'
    expect(transform(code, '/abs/welcome.vue')).toBeUndefined()
  })

  it('handles multiline <Row> opening tag', () => {
    const code = [
      '<template>',
      '  <Row',
      '    class="foo"',
      '  >x</Row>',
      '</template>',
    ].join('\n')
    const result = transform(code, '/abs/welcome.vue')
    expect(result?.code).toContain('data-maizzle-loc="/abs/welcome.vue:2"')
    expect(result?.code).toContain('class="foo"')
  })

  it('handles multiple <template> blocks', () => {
    const code = [
      '<template>',
      '  <Row>a</Row>',
      '</template>',
      '<template>',
      '  <Row>b</Row>',
      '</template>',
    ].join('\n')
    const result = transform(code, '/abs/welcome.vue')
    expect(result?.code).toContain('data-maizzle-loc="/abs/welcome.vue:2"')
    expect(result?.code).toContain('data-maizzle-loc="/abs/welcome.vue:5"')
  })
})
