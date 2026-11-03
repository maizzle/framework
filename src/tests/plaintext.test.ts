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
    expect(result).toContain('<br>')
  })

  it('separates block-level elements with blank lines', () => {
    const result = createPlaintext('<h1>Hello Jane</h1><p>You were invited to join <strong>Acme</strong>.</p><div><a href="https://example.com">Accept</a></div><p>Acme Inc.</p>')
    expect(result).toBe('Hello Jane\n\nYou were invited to join Acme.\n\nAccept\n\nhttps://example.com\n\nAcme Inc.')
  })

  it('breaks lines at <br> and list items', () => {
    expect(createPlaintext('<p>One<br>Two</p>')).toBe('One\nTwo')
    expect(createPlaintext('<ul><li>One</li><li>Two</li></ul>')).toBe('One\nTwo')
  })

  it('does not depend on source formatting', () => {
    const minified = '<div><p>Hello <strong>Jane</strong>,</p><p>Welcome!</p></div>'
    const formatted = `<div>
  <p>
    Hello
    <strong>Jane</strong>,
  </p>
  <p>Welcome!</p>
</div>`
    expect(createPlaintext(formatted)).toBe(createPlaintext(minified))
    expect(createPlaintext(minified)).toBe('Hello Jane,\n\nWelcome!')
  })

  it('keeps line breaks in <pre>', () => {
    expect(createPlaintext('<pre>a\nb</pre>')).toBe('a\nb')
  })

  it('removes zero-width filler text', () => {
    const result = createPlaintext('<p>Hello</p><div role="separator">&zwj;</div><p>World</p><div>&zwj;</div>')
    expect(result).toBe('Hello\n\nWorld')
  })

  it('keeps joiners inside text', () => {
    expect(createPlaintext('<p>&#x1F469;&zwj;&#x1F4BB;</p>')).toBe(String.fromCodePoint(0x1F469, 0x200D, 0x1F4BB))
    expect(createPlaintext('<p>&#x645;&#x6CC;&zwnj;&#x62E;</p>')).toBe(String.fromCodePoint(0x645, 0x6CC, 0x200C, 0x62E))
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
