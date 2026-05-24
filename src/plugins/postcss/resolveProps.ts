/**
 * postcss-resolve-props
 *
 * Resolves CSS custom properties (var() references) and removes
 * the consumed declarations, producing flat CSS for email inlining.
 *
 * Resolution order per var():
 *   1. Local declaration in the same rule
 *   2. :root declaration (top-level only, not inside @media)
 *   3. @property initial-value (Tailwind v4 composable defaults)
 *   4. Fallback value from the var() itself
 *
 * Handles nested var() in both values and fallbacks.
 * Replaces postcss-custom-properties with correct support for
 * local var declarations (Tailwind composable pattern, user CSS).
 */

import type { AtRule, Plugin, Root, Rule } from 'postcss'

/** Check if a rule's selector includes :root */
function isRootRule(rule: Rule): boolean {
  const sel = rule.selector
  return sel === ':root' || sel.includes(':root')
}

/** Check if a rule is inside @layer (not @media or other at-rules) */
function isInLayer(rule: Rule): boolean {
  return rule.parent?.type === 'atrule' && (rule.parent as any).name === 'layer'
}

/**
 * Parse the first var() call in a string by counting parens.
 * Returns null if no var() found.
 */
function findVar(value: string, startFrom = 0): {
  start: number
  end: number
  name: string
  fallback: string | undefined
} | null {
  const idx = value.indexOf('var(', startFrom)
  if (idx === -1) return null

  let depth = 1
  let i = idx + 4
  let commaIdx = -1

  while (i < value.length && depth > 0) {
    const ch = value.charCodeAt(i)
    if (ch === 40 /* ( */) depth++
    else if (ch === 41 /* ) */) {
      if (--depth === 0) break
    } else if (ch === 44 /* , */ && depth === 1 && commaIdx === -1) {
      commaIdx = i
    }
    i++
  }

  if (depth !== 0) return null

  const name = commaIdx === -1
    ? value.slice(idx + 4, i).trim()
    : value.slice(idx + 4, commaIdx).trim()

  const fallback = commaIdx === -1
    ? undefined
    : value.slice(commaIdx + 1, i)

  return { start: idx, end: i + 1, name, fallback }
}

/**
 * Resolve all var() references in a value string.
 * Iterates until no resolvable var() remain.
 */
function resolveValue(
  value: string,
  localVars: Map<string, string>,
  rootVars: Map<string, string>,
  propertyDefaults?: Map<string, string>,
): string {
  let result = value
  let safety = 10

  while (safety-- > 0) {
    const v = findVar(result)
    if (!v) break

    const resolved = localVars.get(v.name) ?? rootVars.get(v.name) ?? propertyDefaults?.get(v.name)

    if (resolved !== undefined) {
      result = result.slice(0, v.start) + resolved + result.slice(v.end)
    } else if (v.fallback !== undefined) {
      result = result.slice(0, v.start) + v.fallback.trim() + result.slice(v.end)
    } else {
      /**
       * Unresolvable with no fallback — skip past it to avoid infinite loop.
       * Try to find another var() after this one.
       */
      const next = findVar(result, v.end)
      if (!next) break

      // Process the rest of the string from after this var()
      const tail = resolveValue(result.slice(v.end), localVars, rootVars, propertyDefaults)
      result = result.slice(0, v.end) + tail
      break
    }
  }

  return result
}

export default (): Plugin => {
  return {
    postcssPlugin: 'postcss-resolve-props',

    Once(root: Root) {
      // Pass 0: collect @property initial-value defaults (Tailwind v4 composable pattern)
      const propertyDefaults = new Map<string, string>()

      root.walkAtRules('property', (rule: AtRule) => {
        const name = rule.params.trim()
        if (!name.startsWith('--')) return

        rule.walkDecls('initial-value', (decl) => {
          propertyDefaults.set(name, decl.value)
        })
      })

      /**
       * Pass 1: collect :root vars (top-level and inside @layer). Skip
       * :root inside @media — those are for dark mode and should
       * stay.
       */
      const rootVars = new Map<string, string>()

      root.walkRules((rule) => {
        if (!isRootRule(rule)) return

        /**
         * Allow :root at top level or inside @layer (Tailwind theme vars).
         * Skip :root inside @media or other non-layer at-rules.
         */
        if (rule.parent?.type !== 'root' && !isInLayer(rule)) return

        rule.each((node) => {
          if (node.type === 'decl' && node.prop.startsWith('--')) {
            rootVars.set(node.prop, node.value)
          }
        })
      })

      // Resolve :root vars referencing other :root vars
      if (rootVars.size > 0) {
        let changed = true
        let iterations = 5

        while (changed && iterations-- > 0) {
          changed = false
          for (const [name, value] of rootVars) {
            if (!value.includes('var(')) continue
            const resolved = resolveValue(value, rootVars, rootVars, propertyDefaults)
            if (resolved !== value) {
              rootVars.set(name, resolved)
              changed = true
            }
          }
        }
      }

      // Pass 2: resolve var() in all rules
      root.walkRules((rule) => {
        /**
         * Skip :root inside @media — those vars are for dark mode etc. and
         * must stay in the <style> tag as-is. Allow :root at top
         * level and inside @layer (processed in pass 3).
         */
        if (isRootRule(rule)) {
          if (rule.parent?.type !== 'root' && !isInLayer(rule)) return
        }

        // Collect local --* declarations (walk into nested @media etc.)
        const localVars = new Map<string, string>()
        const localDecls: Declaration[] = []
        let hasVarRefs = false

        rule.walk((node) => {
          if (node.type !== 'decl') return

          if (node.prop.startsWith('--')) {
            localDecls.push(node)
          } else if (node.value.includes('var(')) {
            hasVarRefs = true
          }
        })

        // Skip rules with no var() references and no local vars to clean up
        if (!hasVarRefs && localDecls.length === 0) return

        // Build local vars map — resolve values that reference other locals or :root
        for (const decl of localDecls) {
          const value = decl.value.includes('var(')
            ? resolveValue(decl.value, localVars, rootVars, propertyDefaults)
            : decl.value

          localVars.set(decl.prop, value)
        }

        // Resolve var() in non-custom-property declarations (walk into nested @media etc.)
        if (hasVarRefs) {
          rule.walk((node) => {
            if (node.type !== 'decl') return
            if (node.prop.startsWith('--')) return
            if (!node.value.includes('var(')) return

            const resolved = resolveValue(node.value, localVars, rootVars, propertyDefaults)

            if (resolved !== node.value) {
              // Clean up: collapse whitespace, trim
              const cleaned = resolved.replace(/  +/g, ' ').trim()

              if (cleaned) {
                node.value = cleaned
              } else {
                // Value resolved to empty — remove the declaration
                node.remove()
              }
            }
          })
        }

        // Remove local --* declarations (consumed or no longer needed)
        for (const decl of localDecls) {
          decl.remove()
        }
      })

      // Remove @property rules (not supported in email clients)
      root.walkAtRules('property', (rule) => {
        rule.remove()
      })

      // Pass 3: clean up :root (same scope as pass 1)
      root.walkRules((rule) => {
        if (!isRootRule(rule)) return
        if (rule.parent?.type !== 'root' && !isInLayer(rule)) return

        rule.each((node) => {
          if (node.type === 'decl' && node.prop.startsWith('--')) {
            node.remove()
          }
        })

        if (rule.nodes?.length === 0) {
          rule.remove()
        }
      })
    },
  }
}

export const postcss = true
