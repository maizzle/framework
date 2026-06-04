import safeParser from 'postcss-safe-parser'
import type { Root } from 'postcss'
import { walk } from '../utils/ast/index.ts'
import { horizontalBorderPx, horizontalPaddingPx, lengthToPx } from '../utils/cssBox.ts'
import type { ChildNode, Element, ParentNode } from 'domhandler'

const MARKER = 'data-maizzle-img-width'

function firstDeclValue(root: Root, prop: string): string | undefined {
  let found: string | undefined
  root.walkDecls(prop, (d) => {
    found = d.value
    return false
  })
  return found
}

/**
 * Resolve an element's own pixel width from its inlined style (`max-width`
 * then `width`) or, failing that, its `width` attribute. Percentages and
 * other non-pixel lengths return null — the caller leaves the image fluid.
 */
function pixelWidthOf(el: Element, root: Root | null): number | null {
  if (root) {
    const fromStyle = (firstDeclValue(root, 'max-width') ?? '')
    const styleMax = fromStyle ? lengthToPx(fromStyle) : null
    if (styleMax != null) return styleMax
    const w = firstDeclValue(root, 'width')
    const styleWidth = w ? lengthToPx(w) : null
    if (styleWidth != null) return styleWidth
  }
  const attrWidth = el.attribs?.width
  return attrWidth ? lengthToPx(attrWidth) : null
}

/**
 * Backfill the `width` attribute on `<Img>`-emitted images that were left
 * without an explicit width. Runs after `columnWidth`, so every
 * Container/Section/Column ancestor already carries a resolved pixel
 * width in its inline style.
 *
 * For each marked `<img>`, walk up the ancestor chain accumulating
 * horizontal padding+border, stopping at the nearest ancestor with a
 * resolvable pixel width. The image width is that source minus the
 * accumulated inset (so padding on wrappers narrows the image to its
 * content box). When no pixel width is found anywhere, the marker is
 * dropped and the image stays fluid.
 */
export function imgWidthDom(dom: ChildNode[]): ChildNode[] {
  const targets: Element[] = []

  walk(dom, (node) => {
    const el = node as Element
    if (el.attribs && MARKER in el.attribs) targets.push(el)
  })

  for (const img of targets) {
    let cur: ParentNode | null = img.parent
    let insetPx = 0
    let resolvedPx: number | null = null

    while (cur) {
      const el = cur as Element
      if (el.attribs) {
        const root = el.attribs.style ? safeParser(el.attribs.style) : null
        if (root) insetPx += horizontalPaddingPx(root) + horizontalBorderPx(root)

        const px = pixelWidthOf(el, root)
        if (px != null) {
          resolvedPx = px
          break
        }
      }
      cur = (cur as any).parent ?? null
    }

    if (resolvedPx != null) {
      img.attribs.width = String(Math.max(0, Math.round(resolvedPx - insetPx)))
    }

    delete img.attribs[MARKER]
  }

  return dom
}
