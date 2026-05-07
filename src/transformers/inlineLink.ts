import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'

/**
 * Inline `<link rel="stylesheet">` tags as `<style>` tags.
 *
 * - Local file paths are inlined when `filePath` is provided (resolved
 *   relative to it).
 * - Remote URLs (`http://` / `https://`) are only inlined when the link
 *   carries an `inline` attribute, e.g. `<link rel="stylesheet" inline href="…">`.
 *
 * @param html     HTML string to transform.
 * @param filePath Path of the source file the HTML came from, used as the
 *                 base for resolving relative `href` values. Required for
 *                 local-file inlining; remote `inline` links work without it.
 * @returns        The transformed HTML string.
 *
 * @example
 * import { inlineLink } from '@maizzle/framework'
 *
 * const out = await inlineLink(
 *   '<link rel="stylesheet" href="./styles.css">',
 *   '/path/to/template.html',
 * )
 */
export async function inlineLink(html: string, filePath?: string): Promise<string> {
  return serialize(await inlineLinkDom(parse(html), filePath))
}

/**
 * DOM-form of {@link inlineLink} used by the internal transformer pipeline.
 * Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export async function inlineLinkDom(dom: ChildNode[], filePath?: string): Promise<ChildNode[]> {
  const links: { node: Element; parent: ChildNode; index: number }[] = []

  walk(dom, (node) => {
    if ((node as Element).name !== 'link') return

    const el = node as Element
    const attrs = el.attribs || {}

    if (attrs.rel !== 'stylesheet' || !attrs.href) return

    const parent = el.parent as ChildNode

    if (parent && 'children' in parent) {
      const index = (parent.children as ChildNode[]).indexOf(el)
      if (index !== -1) {
        links.push({ node: el, parent, index })
      }
    } else {
      // Top-level node
      const index = dom.indexOf(el)
      if (index !== -1) {
        links.push({ node: el, parent: null as any, index })
      }
    }
  })

  for (const { node, parent, index } of links) {
    const href = node.attribs.href
    const isRemote = href.startsWith('http://') || href.startsWith('https://')

    let css: string | undefined

    if (isRemote) {
      if (!('inline' in node.attribs)) continue

      try {
        const response = await fetch(href)
        css = await response.text()
      } catch {
        continue
      }
    } else {
      if (!filePath) continue

      try {
        const absolutePath = resolve(dirname(filePath), href)
        css = readFileSync(absolutePath, 'utf8')
      } catch {
        continue
      }
    }

    const styleNode = {
      type: 'tag',
      name: 'style',
      attribs: {},
      children: [{
        type: 'text',
        data: css,
        parent: null as any,
      }],
      parent: parent || null,
    } as any

    // Set parent reference on the text child
    styleNode.children[0].parent = styleNode

    const siblings = parent && 'children' in parent
      ? parent.children as ChildNode[]
      : dom

    siblings.splice(index, 1, styleNode)
  }

  return dom
}
