import { describe, it, expect } from 'vitest'
import { createPlaintext } from '../plaintext.ts'

describe('createPlaintext', () => {
  it('strips HTML tags from simple HTML', () => {
    const result = createPlaintext('<p>Hello World</p>')
    expect(result).toBe('Hello World')
  })

  it('preserves text content', () => {
    const result = createPlaintext('<div><h1>Title</h1><p>Some paragraph text here.</p></div>')
    expect(result).toContain('Title')
    expect(result).toContain('Some paragraph text here.')
  })

  it('handles empty input', () => {
    const result = createPlaintext('')
    expect(result).toBe('')
  })

  it('handles input with no HTML tags', () => {
    const result = createPlaintext('Just plain text')
    expect(result).toBe('Just plain text')
  })

  it('passes options through to string-strip-html', () => {
    const result = createPlaintext(
      '<div>Hello</div><br/>World',
      { ignoreTags: ['br'] },
    )
    expect(result).toContain('<br/>')
  })

  it('strips a full email template', () => {
    const html = `<!DOCTYPE html>
<html>
<head><title>Email</title><style>.red { color: red; }</style></head>
<body>
  <table><tr><td>
    <h1>Welcome</h1>
    <p>Thank you for signing up.</p>
  </td></tr></table>
</body>
</html>`

    const result = createPlaintext(html)
    expect(result).toContain('Welcome')
    expect(result).toContain('Thank you for signing up.')
    expect(result).not.toContain('<table>')
    expect(result).not.toContain('<html>')
    expect(result).not.toContain('color: red')
  })
})
