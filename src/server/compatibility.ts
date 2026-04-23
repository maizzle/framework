import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { caniemail, rawData } from 'caniemail'
import type { CanIEmailOptions } from 'caniemail'
import { parseSfcBlocks, findComponentTags, buildComponentMap } from './sfc-utils.ts'

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
