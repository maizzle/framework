import { validAttributeNames } from './postcss/compileCss.js'

/**
 * Remove specific attributes from `<style>` tags in PostHTML.
 *
 * Use to clean up <style> tag attributes after proccessing
 * has taken place. A "raw" attribute is used to indicate
 * that the content should not be compiled.
 * @returns {Function} PostHTML plugin
 */
const plugin = () => tree => {
  const process = node => {
    if (node && node.tag === 'style') {
      if (node.attrs && Object.keys(node.attrs).some(attr => validAttributeNames.has(attr))) {
        // Remove the attribute
        for (const attr of Object.keys(node.attrs)) {
          if (validAttributeNames.has(attr)) {
            delete node.attrs[attr]
          }
        }
      }
    }

    return node
  }

  return tree.walk(process)
}

export default plugin
