import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface LintIssue {
  type: 'error' | 'warning'
  title: string
  message: string
  line?: number
}

export function serveLint(url: string, res: any) {
  const filePath = url.replace('/__maizzle/lint/', '').replace(/\?.*$/, '')

  try {
    const source = readFileSync(resolve(filePath), 'utf-8')

    // Extract only the <template> block for linting
    const templateMatch = source.match(/<template\b[^>]*>([\s\S]*)<\/template>/)
    const html = templateMatch ? templateMatch[1] : source

    // Calculate the offset of the <template> content within the source file
    const templateOffset = templateMatch
      ? source.slice(0, source.indexOf(templateMatch[0]) + templateMatch[0].indexOf(templateMatch[1])).split('\n').length - 1
      : 0

    const issues = lintHtml(html, templateOffset)

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(issues))
  } catch (error: any) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: error.message }))
  }
}

function lineAt(html: string, offset: number, lineOffset: number): number {
  return html.slice(0, offset).split('\n').length + lineOffset
}

function lintHtml(html: string, lineOffset = 0): LintIssue[] {
  const issues: LintIssue[] = []

  // Match all tags (multiline) — [^>] doesn't cross > so use [\s\S] with lazy quantifier
  const tagRe = /<([a-zA-Z][a-zA-Z0-9]*)\b([\s\S]*?)>/g

  for (const m of Array.from(html.matchAll(tagRe))) {
    const tag = m[0]
    const tagName = m[1].toLowerCase()
    const line = lineAt(html, m.index!, lineOffset)

    // Images
    if (tagName === 'img') {
      if (!/\balt\s*=/i.test(tag)) {
        issues.push({ type: 'warning', title: 'Missing alt text', message: 'Image is missing the alt attribute', line })
      }

      const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i)
      if (!srcMatch) {
        issues.push({ type: 'error', title: 'Missing image src', message: 'Image tag has no src attribute', line })
      } else if (!srcMatch[1].trim()) {
        issues.push({ type: 'error', title: 'Empty image src', message: 'Image src attribute is empty', line })
      } else if (srcMatch[1].trim().startsWith('http:')) {
        issues.push({ type: 'warning', title: 'Insecure image src', message: 'Image loads over HTTP instead of HTTPS', line })
      }
    }

    // Any tag with href (catches <a>, <Button>, etc.)
    const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)
    if (hrefMatch) {
      const href = hrefMatch[1].trim()
      if (!href) {
        issues.push({ type: 'warning', title: 'Empty link href', message: 'Link href attribute is empty', line })
      } else if (href === '#' || href === '/') {
        issues.push({ type: 'warning', title: 'Placeholder link', message: `Link href is "${href}"`, line })
      } else if (href.startsWith('http:')) {
        issues.push({ type: 'warning', title: 'Insecure link', message: 'Link uses HTTP instead of HTTPS', line })
      } else if (href.startsWith('http') && !/^https?:\/\/.+\..+/i.test(href)) {
        issues.push({ type: 'warning', title: 'Invalid link', message: `Link href "${href}" looks malformed`, line })
      }
    }

    // Insecure resources (<link>, <script>, <source>)
    if (['link', 'script', 'source'].includes(tagName)) {
      const attrMatch = tag.match(/\b(?:href|src)\s*=\s*["']([^"']*)["']/i)
      if (attrMatch && attrMatch[1].trim().startsWith('http:')) {
        issues.push({ type: 'warning', title: 'Insecure resource', message: 'Resource loads over HTTP instead of HTTPS', line })
      }
    }
  }

  // Insecure CSS url() references
  for (const m of Array.from(html.matchAll(/url\s*\(\s*["']?(http:[^"')]+)["']?\s*\)/gi))) {
    issues.push({ type: 'warning', title: 'Insecure CSS url()', message: 'CSS url() loads over HTTP instead of HTTPS', line: lineAt(html, m.index!, lineOffset) })
  }

  // Check for unclosed tags (block-level and common inline elements)
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ])

  const trackedTags = new Set([
    'a', 'b', 'body', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'head', 'html', 'i', 'li', 'ol', 'p', 'span', 'strong', 'style',
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'u', 'ul',
  ])

  const stack: Array<{ tag: string, line: number }> = []

  // Strip comments and content inside <style>/<script> to avoid false matches
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, (m) => '\n'.repeat((m.match(/\n/g) || []).length))
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => '\n'.repeat((m.match(/\n/g) || []).length))

  const strippedLines = stripped.split('\n')

  for (let i = 0; i < strippedLines.length; i++) {
    const line = strippedLines[i]
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g
    let m

    while ((m = tagRegex.exec(line)) !== null) {
      const fullMatch = m[0]
      const tagName = m[1].toLowerCase()

      if (!trackedTags.has(tagName) || voidElements.has(tagName)) continue
      if (fullMatch.endsWith('/>')) continue

      if (fullMatch.startsWith('</')) {
        // Closing tag
        let lastOpen = -1
        for (let j = stack.length - 1; j >= 0; j--) {
          if (stack[j].tag === tagName) { lastOpen = j; break }
        }
        if (lastOpen !== -1) {
          stack.splice(lastOpen, 1)
        }
      } else {
        // Opening tag
        stack.push({ tag: tagName, line: i + 1 + lineOffset })
      }
    }
  }

  for (const unclosed of stack) {
    issues.push({
      type: 'error',
      title: 'Unclosed tag',
      message: `<${unclosed.tag}> tag is not closed`,
      line: unclosed.line,
    })
  }

  // Sort: errors first, then warnings, then by line
  issues.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'error' ? -1 : 1
    return (a.line ?? 0) - (b.line ?? 0)
  })

  return issues
}
