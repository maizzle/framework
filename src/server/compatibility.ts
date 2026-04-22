import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'tinyglobby'
import { caniemail, rawData } from 'caniemail'
import type { CanIEmailOptions } from 'caniemail'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CLIENTS: CanIEmailOptions['clients'] = ['apple-mail.*', 'gmail.*', 'outlook.*', 'yahoo.*']

/**
 * Features that are too fundamental to be actionable — every email uses these.
 */
const IGNORED_ELEMENTS = [
  'html', 'head', 'body', 'meta', 'style', 'link', 'div', 'table', 'tr', 'td',
  'th', 'thead', 'tbody', 'tfoot', 'p', 'a', 'span', 'br', 'img',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 'title',
]
const IGNORED_TITLES = new Set([
  ...IGNORED_ELEMENTS.map(el => `<${el}> element`),
  'HTML5 doctype',
])

interface SfcBlock {
  content: string
  offset: number
}

interface RawIssue {
  type: 'error' | 'warning'
  client: string
  title: string
  notes: string[]
  line?: number
  file: string
}

interface GroupedIssue {
  type: 'error' | 'warning'
  title: string
  category: string
  clients: Array<{ name: string, notes: string[] }>
  url?: string
  line?: number
  file: string
}

function parseSfcBlocks(source: string): { template: SfcBlock | null, styles: SfcBlock[] } {
  let template: SfcBlock | null = null
  const styles: SfcBlock[] = []

  const templateMatch = source.match(/<template\b[^>]*>([\s\S]*)<\/template>/)
  if (templateMatch) {
    const contentStart = source.indexOf(templateMatch[0]) + templateMatch[0].indexOf(templateMatch[1])
    const offset = source.slice(0, contentStart).split('\n').length - 1
    template = { content: templateMatch[1], offset }
  }

  const styleRe = /<style\b([^>]*)>([\s\S]*?)<\/style>/g
  let m
  while ((m = styleRe.exec(source)) !== null) {
    // Skip preprocessor styles (scss, less, etc.) — caniemail only parses plain CSS
    if (/\blang\s*=\s*["'](?!css)/i.test(m[1])) continue

    const contentStart = m.index + m[0].indexOf(m[2])
    const offset = source.slice(0, contentStart).split('\n').length - 1
    styles.push({ content: m[2], offset })
  }

  return { template, styles }
}

/**
 * Standard HTML elements — anything not in this set is treated as a component.
 */
const HTML_ELEMENTS = new Set([
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
  'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
  'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del',
  'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
  'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img',
  'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map',
  'mark', 'menu', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol',
  'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q',
  'rp', 'rt', 'ruby', 's', 'samp', 'script', 'search', 'section', 'select',
  'slot', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary',
  'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th',
  'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr',
])

function findComponentTags(templateContent: string): string[] {
  const tags = new Set<string>()

  // PascalCase tags like <Section>, <Button>
  const pascalRe = /<([A-Z][a-zA-Z0-9]*)\b/g
  let m
  while ((m = pascalRe.exec(templateContent)) !== null) {
    tags.add(m[1])
  }

  // kebab-case tags like <my-component>
  const kebabRe = /<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)\b/g
  while ((m = kebabRe.exec(templateContent)) !== null) {
    if (!HTML_ELEMENTS.has(m[1])) {
      tags.add(m[1])
    }
  }

  return [...tags]
}

async function buildComponentMap(root: string, componentDirs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()

  const dirs = [
    resolve(__dirname, '../components'),
    resolve(root, 'components'),
    ...componentDirs,
  ].filter(d => existsSync(d))

  for (const dir of dirs) {
    const files = await glob(['**/*.vue'], { cwd: dir, absolute: true })
    for (const file of files) {
      const name = basename(file, '.vue')
      // Store lowercased for case-insensitive matching
      map.set(name.toLowerCase(), file)
    }
  }

  return map
}

function collectIssues(
  source: string,
  filePath: string,
): RawIssue[] {
  const { template, styles } = parseSfcBlocks(source)
  const issues: RawIssue[] = []

  if (template) {
    try {
      const result = caniemail({ clients: CLIENTS, html: template.content })
      pushIssues(result, issues, filePath, template.offset)
    } catch {}
  }

  for (const style of styles) {
    try {
      const result = caniemail({ clients: CLIENTS, css: style.content })
      pushIssues(result, issues, filePath, style.offset)
    } catch {}
  }

  return issues
}

function pushIssues(
  result: ReturnType<typeof caniemail>,
  issues: RawIssue[],
  filePath: string,
  lineOffset: number,
) {
  for (const [client, clientIssues] of result.issues.errors) {
    for (const issue of clientIssues) {
      if (IGNORED_TITLES.has(issue.title)) continue
      issues.push({
        type: 'error',
        client,
        title: issue.title,
        notes: issue.notes,
        line: issue.position ? issue.position.start.line + lineOffset : undefined,
        file: filePath,
      })
    }
  }

}

function checkFile(
  filePath: string,
  componentMap: Map<string, string>,
  visited: Set<string>,
): RawIssue[] {
  if (visited.has(filePath)) return []
  visited.add(filePath)

  let source: string
  try {
    source = readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const issues = collectIssues(source, filePath)

  // Find and recursively check components used in the template
  const templateMatch = source.match(/<template\b[^>]*>([\s\S]*)<\/template>/)
  if (templateMatch) {
    const componentTags = findComponentTags(templateMatch[1])
    for (const tag of componentTags) {
      const componentPath = componentMap.get(tag.toLowerCase())
      if (componentPath) {
        issues.push(...checkFile(componentPath, componentMap, visited))
      }
    }
  }

  return issues
}

// Build title -> url/category lookups from raw caniemail data
const urlMap = new Map<string, string>()
const categoryMap = new Map<string, string>()
for (const item of (rawData as any).data) {
  urlMap.set(item.title, item.url)
  categoryMap.set(item.title, item.category)
}

export async function serveCompatibility(
  url: string,
  res: any,
  root: string,
  componentDirs: string[],
) {
  const filePath = url.replace('/__maizzle/compatibility/', '').replace(/\?.*$/, '')

  try {
    const absolutePath = resolve(filePath)
    const componentMap = await buildComponentMap(root, componentDirs)
    const visited = new Set<string>()
    const issues = checkFile(absolutePath, componentMap, visited)

    // Group by feature title + type, merge clients
    const grouped = new Map<string, GroupedIssue>()

    for (const issue of issues) {
      const key = `${issue.type}:${issue.title}:${issue.file}`
      const existing = grouped.get(key)
      const clientName = issue.client
        .split('.')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())

      if (existing) {
        const existingClient = existing.clients.find(c => c.name === clientName)
        if (existingClient) {
          for (const note of issue.notes) {
            if (!existingClient.notes.includes(note)) {
              existingClient.notes.push(note)
            }
          }
        } else {
          existing.clients.push({ name: clientName, notes: [...issue.notes] })
        }
      } else {
        grouped.set(key, {
          type: issue.type,
          title: issue.title,
          category: categoryMap.get(issue.title) || 'others',
          clients: [{ name: clientName, notes: [...issue.notes] }],
          url: urlMap.get(issue.title),
          line: issue.line,
          file: issue.file,
        })
      }
    }

    const categoryOrder = ['css', 'html', 'image', 'others']
    const sortedIssues = [...grouped.values()].sort((a, b) => {
      const catA = categoryOrder.indexOf(a.category)
      const catB = categoryOrder.indexOf(b.category)
      if (catA !== catB) return catA - catB
      if (a.type !== b.type) return a.type === 'error' ? -1 : 1
      return a.title.localeCompare(b.title)
    })

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(sortedIssues))
  } catch (error: any) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: error.message }))
  }
}
