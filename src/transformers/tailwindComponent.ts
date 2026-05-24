import { resolve } from 'node:path'
import type { ChildNode, Element, Comment } from 'domhandler'
import { walk } from '../utils/ast/index.ts'
import { compileTailwindCss } from '../utils/compileTailwindCss.ts'
import type { TailwindBlock } from '../composables/renderContext.ts'
import type { MaizzleConfig } from '../types/config.ts'

const DEFAULT_SEED = '@import "@maizzle/tailwindcss" source(none);'

interface BlockMeta {
  id: string
  configCss?: string
  nested: boolean
  classes: Set<string>
}

const OPEN_RE = /^mz-tw:(\S+)$/
const CLOSE_RE = /^\/mz-tw:(\S+)$/

/**
 * Compile Tailwind CSS for each top-level <Tailwind> block in the render
 * context. Nested <Tailwind> instances are flattened: their classes flow
 * up to the outermost block, their `#config` slot (if any) is ignored.
 * One <style> per outermost block is appended to <head>; marker comments
 * are stripped after.
 */
export async function tailwindComponent(
  dom: ChildNode[],
  blocks: TailwindBlock[],
  config: MaizzleConfig,
  filePath?: string,
): Promise<ChildNode[]> {
  if (!blocks.length) return dom

  const map = new Map<string, BlockMeta>()
  for (const b of blocks) {
    map.set(b.id, { id: b.id, configCss: b.css, nested: false, classes: new Set() })
  }

  const stack: string[] = []
  const markers: Comment[] = []

  walk(dom, (node) => {
    if (node.type === 'comment') {
      const data = (node as Comment).data
      const open = data.match(OPEN_RE)
      const close = data.match(CLOSE_RE)
      if (open) {
        const id = open[1]
        const meta = map.get(id)
        if (meta && stack.length > 0) meta.nested = true
        if (meta) stack.push(id)
        markers.push(node as Comment)
      } else if (close) {
        const id = close[1]
        if (stack[stack.length - 1] === id) stack.pop()
        markers.push(node as Comment)
      }
      return
    }

    const el = node as Element
    /**
     * Always assign to the OUTERMOST active marker (stack[0]) so nested
     * <Tailwind> blocks merge their classes into the parent's scope.
     */
    if (el.attribs?.class && stack.length > 0) {
      map.get(stack[0])!.classes.add(el.attribs.class)
    }
  })

  const fromPath = filePath ?? resolve(process.cwd(), 'template.vue')

  let head: Element | undefined
  walk(dom, (n) => {
    if (!head && (n as Element).name === 'head') head = n as Element
  })

  if (!head) {
    throw new Error('`Tailwind` component requires `Head` component to be present in the template.')
  }

  /**
   * Compile + inject one <style raw> per outermost block. `raw` opts
   * the existing tailwindcss transformer out of recompiling
   * already-compiled CSS.
   */
  for (const meta of map.values()) {
    if (meta.nested) continue

    const cssInput = buildCssInput(meta.configCss, meta.classes)
    const css = (await compileTailwindCss(cssInput, config, `${fromPath}?tw=${meta.id}`)).trim()
    if (!css) continue

    const styleNode: Element = {
      type: 'tag',
      name: 'style',
      attribs: { raw: '' },
      children: [],
      parent: head,
      prev: null,
      next: null,
    } as any

    const textNode = {
      type: 'text',
      data: css,
      parent: styleNode,
      prev: null,
      next: null,
    } as any

    styleNode.children = [textNode]
    head.children.push(styleNode)
  }

  // Strip marker comments from their parents
  for (const c of markers) {
    const parent = c.parent as Element | null
    if (!parent?.children) continue
    const i = parent.children.indexOf(c)
    if (i >= 0) parent.children.splice(i, 1)
  }

  return dom
}

function buildCssInput(configCss: string | undefined, classes: Set<string>): string {
  const seed = configCss ?? DEFAULT_SEED

  if (!classes.size) return seed

  const inline = [...classes].join(' ').replace(/"/g, '\\"')
  return `${seed}\n@source inline("${inline}");`
}
