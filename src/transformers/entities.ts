import { defu as merge } from 'defu'
import { walk } from '../utils/ast/index.ts'
import type { ChildNode } from 'domhandler'
import type { EntitiesConfig } from '../types/index.ts'

const DEFAULT_ENTITIES: Record<string, string> = {
  '\u200D': '&zwj;',
  '\u200C': '&zwnj;',
  '\u00A0': '&nbsp;',
  '\u00AD': '&shy;',
  '\u200B': '&#8203;',
  '\u2007': '&#8199;',
  '\u034F': '&#847;',
  '\u2003': '&emsp;',
  '\u2028': '&LineSeparator;',
  '\u2029': '&ParagraphSeparator;',
  '\u00B7': '&middot;',
  '\u2013': '&ndash;',
  '\u2014': '&mdash;',
  '\u2018': '&lsquo;',
  '\u2019': '&rsquo;',
  '\u201C': '&ldquo;',
  '\u201D': '&rdquo;',
  '\u00AB': '&laquo;',
  '\u00BB': '&raquo;',
  '\u2022': '&bull;',
  '\u2039': '&lsaquo;',
  '\u203A': '&rsaquo;'
}

export function entities(dom: ChildNode[], config: EntitiesConfig = true): ChildNode[] {
  if (!config) return dom

  const map = typeof config === 'object'
    ? merge(config as Record<string, string>, DEFAULT_ENTITIES)
    : DEFAULT_ENTITIES

  walk(dom, (node) => {
    if (node.type === 'text') {
      for (const [char, entity] of Object.entries(map)) {
        node.data = node.data.split(char).join(entity)
      }
    }
  })

  return dom
}
