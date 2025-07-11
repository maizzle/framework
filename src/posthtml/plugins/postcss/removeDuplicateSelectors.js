/**
 * PostCSS plugin to remove duplicate selectors, keeping only the last occurrence.
 * This is useful when CSS contains multiple rules with the same selector,
 * and we want to keep only the most recent one.
 */
export default function removeDuplicateSelectors() {
  return {
    postcssPlugin: 'remove-duplicate-selectors',
    OnceExit(root) {
      const selectorMap = new Map()
      const rulesToRemove = []

      // First pass: collect all rules and their selectors
      root.walkRules(rule => {
        const selector = rule.selector

        // If we've seen this selector before, mark the previous one for removal
        if (selectorMap.has(selector)) {
          const previousRule = selectorMap.get(selector)
          rulesToRemove.push(previousRule)
        }

        // Update the map with the current rule (latest occurrence)
        selectorMap.set(selector, rule)
      })

      // Second pass: remove all the duplicate rules
      rulesToRemove.forEach(rule => {
        rule.remove()
      })
    }
  }
}

removeDuplicateSelectors.postcss = true
