import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseSfcBlocks, findComponentTags, buildComponentMap } from './sfc-utils.ts'

interface LintIssue {
  type: 'error' | 'warning'
  title: string
  message: string
  line?: number
  file: string
}

export async function serveLint(url: string, res: any, root: string, componentDirs: string[]) {
  const filePath = url.replace('/__maizzle/lint/', '').replace(/\?.*$/, '')

  try {
    const absolutePath = resolve(filePath)
    const componentMap = await buildComponentMap(root, componentDirs)
    const visited = new Set<string>()
    const issues = checkFile(absolutePath, componentMap, visited)

    // Sort: errors first, then warnings, then by line
    issues.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'error' ? -1 : 1
      return (a.line ?? 0) - (b.line ?? 0)
    })

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(issues))
  } catch (error: any) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: error.message }))
  }
}

function checkFile(
  filePath: string,
  componentMap: Map<string, string>,
  visited: Set<string>,
): LintIssue[] {
  if (visited.has(filePath)) return []
  visited.add(filePath)

  let source: string
  try {
    source = readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const { template } = parseSfcBlocks(source)
  const issues: LintIssue[] = []

  if (template) {
    issues.push(...lintHtml(template.content, template.offset, filePath))

    // Recurse into components
    const componentTags = findComponentTags(template.content)
    for (const tag of componentTags) {
      const componentPath = componentMap.get(tag.toLowerCase())
      if (componentPath) {
        issues.push(...checkFile(componentPath, componentMap, visited))
      }
    }
  }

  return issues
}

function lineAt(html: string, offset: number, lineOffset: number): number {
  return html.slice(0, offset).split('\n').length + lineOffset
}

function lintHtml(html: string, lineOffset: number, filePath: string): LintIssue[] {
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
        issues.push({ type: 'warning', title: 'Missing alt text', message: 'Image is missing the alt attribute', line, file: filePath })
      }

      const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i)
      if (!srcMatch) {
        issues.push({ type: 'error', title: 'Missing image src', message: 'Image tag has no src attribute', line, file: filePath })
      } else if (!srcMatch[1].trim()) {
        issues.push({ type: 'error', title: 'Empty image src', message: 'Image src attribute is empty', line, file: filePath })
      } else if (srcMatch[1].trim().startsWith('http:')) {
        issues.push({ type: 'warning', title: 'Insecure image src', message: 'Image loads over HTTP instead of HTTPS', line, file: filePath })
      }
    }

    // Any tag with href — skip resource tags handled below
    if (!['link', 'script', 'source'].includes(tagName)) {
      const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)
      if (hrefMatch) {
        const href = hrefMatch[1].trim()
        if (!href) {
          issues.push({ type: 'warning', title: 'Empty link href', message: 'Link href attribute is empty', line, file: filePath })
        } else if (href === '#' || href === '/') {
          issues.push({ type: 'warning', title: 'Placeholder link', message: `Link href is "${href}"`, line, file: filePath })
        } else if (href.startsWith('http:')) {
          issues.push({ type: 'warning', title: 'Insecure link', message: 'Link uses HTTP instead of HTTPS', line, file: filePath })
        } else if (href.startsWith('http') && !/^https?:\/\/.+\..+/i.test(href)) {
          issues.push({ type: 'warning', title: 'Invalid link', message: `Link href "${href}" looks malformed`, line, file: filePath })
        }
      }
    }

    // Insecure resources (<link>, <script>, <source>)
    if (['link', 'script', 'source'].includes(tagName)) {
      const attrMatch = tag.match(/\b(?:href|src)\s*=\s*["']([^"']*)["']/i)
      if (attrMatch && attrMatch[1].trim().startsWith('http:')) {
        issues.push({ type: 'warning', title: 'Insecure resource', message: 'Resource loads over HTTP instead of HTTPS', line, file: filePath })
      }
    }
  }

  // Insecure CSS url() references
  for (const m of Array.from(html.matchAll(/url\s*\(\s*["']?(http:[^"')]+)["']?\s*\)/gi))) {
    issues.push({ type: 'warning', title: 'Insecure CSS url()', message: 'CSS url() loads over HTTP instead of HTTPS', line: lineAt(html, m.index!, lineOffset), file: filePath })
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
      file: filePath,
    })
  }

  return issues
}
