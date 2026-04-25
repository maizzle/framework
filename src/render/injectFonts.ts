import type { ChildNode, Element } from 'domhandler'
import type { FontRegistration } from '../composables/renderContext.ts'
import { decodeStyleEntities } from '../utils/decodeStyleEntities.ts'

const TAILWIND_IMPORT_RE = /((@import|@reference)\s+["'](tailwindcss|@maizzle\/tailwindcss)|@tailwind\s)/

function getText(el: Element): string {
  return (el.children || [])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.data)
    .join('')
}

/**
 * Inject font `<link>` tags into `<head>` and merge `@theme` declarations
 * into the template's existing Tailwind `<style>` block (so the
 * `font-{slug}` utilities are generated in the same compilation unit
 * as the Tailwind import). Without a Tailwind import, emits plain
 * `.font-{slug}` class rules so the utility still works.
 */
export function injectFonts(
  dom: ChildNode[],
  fonts: FontRegistration[],
  parseDom: (html: string) => ChildNode[],
  walk: (ast: ChildNode[], cb: (n: ChildNode) => void) => void,
): void {
  if (!fonts.length) return

  let head: Element | undefined
  let tailwindStyle: Element | undefined

  walk(dom, (node) => {
    const el = node as Element
    if (!el.name) return
    if (el.name === 'head' && !head) head = el
    if (el.name === 'style' && !tailwindStyle && TAILWIND_IMPORT_RE.test(decodeStyleEntities(getText(el)))) {
      tailwindStyle = el
    }
  })

  if (!head) return

  const linkHtml = fonts
    .map(f => `<link href="${f.url}" rel="stylesheet" media="screen">`)
    .join('')
  const linkNodes = parseDom(linkHtml)
  for (const child of linkNodes) {
    (child as any).parent = head
  }
  head.children = [...(head.children || []), ...linkNodes] as any

  if (tailwindStyle) {
    const themeDecls = fonts
      .map(f => `  --font-${f.slug}: ${f.declaration};`)
      .join('\n')
    const existing = getText(tailwindStyle)
    tailwindStyle.children = [{
      type: 'text',
      data: `${existing}\n@theme {\n${themeDecls}\n}\n`,
      parent: tailwindStyle,
    } as any]
  } else {
    const classRules = fonts
      .map(f => `.font-${f.slug} { font-family: ${f.declaration}; }`)
      .join('\n')
    const styleNodes = parseDom(`<style>\n${classRules}\n</style>`)
    for (const child of styleNodes) {
      (child as any).parent = head
    }
    head.children = [...(head.children || []), ...styleNodes] as any
  }
}
