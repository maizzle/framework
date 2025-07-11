/**
 * PostCSS plugin to clean up Tailwind CSS artifacts and leftovers.
 *
 * This plugin safely removes unused Tailwind-specific CSS that
 * may be left behind after processing, while preserving
 * any CSS that might be intentionally used.
 */
export default function cleanupTailwindArtifacts(options = {}) {
  const opts = {
    removeEmptyLayers: true,
    removeUnusedTwProperties: true,
    removeEmptyRules: false,
    preserveCustomProperties: [], // Array of custom property names to preserve
    ...options
  }

  return {
    postcssPlugin: 'cleanup-tailwind-artifacts',
    OnceExit(root) {
      const usedCustomProperties = new Set()
      const rulesToRemove = []

      // First pass: collect all custom properties usage
      root.walkDecls(decl => {
        // Check if any declaration uses custom properties
        if (decl.value.includes('var(--')) {
          const matches = decl.value.match(/var\(--[\w-]+\)/g)
          if (matches) {
            matches.forEach(match => {
              const propName = match.replace(/var\(|-|\)/g, '')
              usedCustomProperties.add(propName)
            })
          }
        }
      })

      // Second pass: find unused @property declarations and empty @layer rules
      root.walkAtRules(rule => {
        // Handle @property declarations
        if (rule.name === 'property' && opts.removeUnusedTwProperties) {
          const propertyName = rule.params.replace(/^--/, '')

          // Only remove Tailwind-specific custom properties that aren't used
          if (propertyName.startsWith('tw-') && !usedCustomProperties.has(propertyName)) {
            // Check if it's in the preserve list
            if (!opts.preserveCustomProperties.includes(propertyName)) {
              rulesToRemove.push(rule)
            }
          }
        }

        // Handle @layer rules
        if (rule.name === 'layer' && opts.removeEmptyLayers) {
          // Only remove @layer rules that have no nodes
          if (!rule.nodes || rule.nodes.length === 0) {
            rulesToRemove.push(rule)
          }
        }
      })

      // Third pass: remove empty rules (optional, off by default)
      if (opts.removeEmptyRules) {
        root.walkRules(rule => {
          if (!rule.nodes || rule.nodes.length === 0) {
            rulesToRemove.push(rule)
          }
        })
      }

      // Remove all identified artifacts
      rulesToRemove.forEach(rule => {
        rule.remove()
      })
    }
  }
}

cleanupTailwindArtifacts.postcss = true
