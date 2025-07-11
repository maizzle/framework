import { defu as merge } from 'defu'
import { transform } from 'lightningcss'

const plugin = (options = {}) => tree => {
  options = merge(options, {
    targets: options.targets ? {} : {
      ie: 1,
    },
  })

  const process = node => {
    // Check if this is a style tag with content
    if (node.tag === 'style' && node.content && Array.isArray(node.content)) {
      // Get the CSS content from the style tag
      const cssContent = node.content.join('')

      if (cssContent.trim()) {
        try {
          const { code } = transform(
            merge(
              options,
              {
                code: Buffer.from(cssContent)
              }
            )
          )

          // Replace the content with processed CSS
          node.content = [code.toString()]
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
