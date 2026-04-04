/**
 * postcss-remove-declarations
 *
 * Removes CSS declarations (or whole rules) based on a selector map.
 *
 * The `remove` option maps a selector string to one of:
 *
 *   - `"*"`          — remove the entire rule
 *   - `string`       — remove the single named property
 *   - `string[]`     — remove every listed property
 *   - `Record<string, string>` — remove a property only when its value matches.
 *                     Append `!important` to the value to restrict the match
 *                     to non-important declarations only.
 *
 * Example:
 *   removeDeclarations({
 *     remove: {
 *       ':root': '*',
 *       '.foo': ['color', 'margin'],
 *       '.bar': { color: 'red' },
 *     }
 *   })
 */

import type { Plugin, Root } from 'postcss'

export type RemoveValue =
  | '*'
  | string
  | string[]
  | Record<string, string>

export interface RemoveDeclarationsOptions {
  remove: Record<string, RemoveValue>
}

const IMPORTANT = '!important'

function normalizeSelector(selector: string): string {
  return selector.replace(/(\r\n|\n|\r)/gm, '')
}

export default (options: RemoveDeclarationsOptions): Plugin => {
  return {
    postcssPlugin: 'postcss-remove-declarations',

    Once(root: Root) {
      const remove = options.remove ?? {}

      root.walkRules((rule) => {
        let toRemove = remove[normalizeSelector(rule.selector)]

        if (!toRemove) return

        // Remove the entire rule
        if (toRemove === '*') {
          rule.remove()
          return
        }

        // Normalise a bare string into an array
        if (typeof toRemove === 'string') {
          toRemove = [toRemove]
        }

        if (Array.isArray(toRemove)) {
          const props = toRemove as string[]
          rule.walkDecls((decl) => {
            if (props.includes(decl.prop)) decl.remove()
          })
        } else if (typeof toRemove === 'object') {
          // Object: match both property and value
          const map = toRemove as Record<string, string>
          rule.walkDecls((decl) => {
            if (!(decl.prop in map)) return

            let expected = map[decl.prop]
            const requireNonImportant = expected.endsWith(IMPORTANT)

            if (requireNonImportant) {
              expected = expected.slice(0, -IMPORTANT.length).trim()
            }

            if (decl.value !== expected) return
            if (decl.important && requireNonImportant) return

            decl.remove()
          })
        }

        // Remove the rule if all declarations were removed
        if (rule.nodes?.length === 0) {
          rule.remove()
        }
      })
    },
  }
}

export const postcss = true
