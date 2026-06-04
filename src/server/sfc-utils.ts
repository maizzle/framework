import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'tinyglobby'
import { componentNameFromPath, type NormalizedComponentSource } from '../utils/componentSources.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Built-in framework components Maizzle ships internally. Issues raised
 * against these files are framework-owned, not the user's responsibility,
 * so the dev UI's Checks tab filters them out.
 */
const FRAMEWORK_COMPONENTS_DIR = resolve(__dirname, '../components').replace(/\\/g, '/') + '/'

export function isFrameworkComponent(file: string): boolean {
  return file.replace(/\\/g, '/').startsWith(FRAMEWORK_COMPONENTS_DIR)
}

export interface SfcBlock {
  content: string
  offset: number
}

export function parseSfcBlocks(source: string): { template: SfcBlock | null, styles: SfcBlock[] } {
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
export const HTML_ELEMENTS = new Set([
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

export function findComponentTags(templateContent: string): string[] {
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

export async function buildComponentMap(
  root: string,
  componentDirs: NormalizedComponentSource[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()

  /**
   * Built-in framework components + the user's default `components/` dir
   * use unplugin's directoryAsNamespace + collapseSamePrefixes
   * behavior — i.e. no explicit prefix, folder name becomes
   * the namespace.
   */
  const implicitDirs = [
    resolve(__dirname, '../components'),
    resolve(root, 'components'),
  ].filter(existsSync)

  const allSources: NormalizedComponentSource[] = [
    ...implicitDirs.map(path => ({ path, prefix: undefined, pathPrefix: true })),
    ...componentDirs.filter(s => existsSync(s.path)),
  ]

  for (const source of allSources) {
    const files = await glob(['**/*.vue'], { cwd: source.path, absolute: true })
    for (const file of files) {
      const name = componentNameFromPath({
        filePath: file,
        dirRoot: source.path,
        prefix: source.prefix,
        pathPrefix: source.pathPrefix,
      })
      // Lowercased for case-insensitive lookups in the linter/compat scanners.
      map.set(name.toLowerCase(), file)
    }
  }

  return map
}
