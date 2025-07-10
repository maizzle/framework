import postcss from 'postcss'
import sortMediaQueries from 'postcss-sort-media-queries'

const plugin = (options = {}) => tree => {
  const process = node => {
    // Check if this is a style tag with content
    if (node.tag === 'style' && node.content && Array.isArray(node.content)) {
      // Get the CSS content from the style tag
      const cssContent = node.content.join('')

      if (cssContent.trim()) {
        try {
          // Create PostCSS processor for combining and sorting media queries
          const processor = postcss([
            sortMediaQueries({
              sort: options.sort || 'mobile-first',
              ...options
            })
          ])

          // Process CSS synchronously
          const result = processor.process(cssContent, {
            from: undefined,
            to: undefined
          })

          // Replace the content with processed CSS
          node.content = [result.css]
        } catch (error) {
          // If processing fails, leave the content unchanged
          console.warn('Failed to process media queries:', error.message)
        }
      }
    }

    return node
  }

  return tree.walk(process)
}

export default plugin
