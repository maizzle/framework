import postcss from 'postcss'
import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'
import { transform } from 'lightningcss'
import tailwindcss from '@tailwindcss/postcss'
import postcssSafeParser from 'postcss-safe-parser'
import customProperties from 'postcss-custom-properties'

const attributes = new Set([
  'raw',
  'plain',
  'as-is',
  'uncompiled',
  'unprocessed',
])

// export attributes
export const validAttributeNames = attributes

/**
 * PostHTML plugin to process Tailwind CSS within style tags.
 *
 * This plugin processes CSS content in `<style>` tags and
 * compiles it with PostCSS. Tags marked with attribute
 * names found in `attributes` will be skipped.
 */
export function compileCss(config = {}) {
  return tree => {
    return new Promise((resolve, reject) => {
      const stylePromises = []

      tree.walk(node => {
        if (node && node.tag === 'style' && node.content) {
          if (node.attrs && Object.keys(node.attrs).some(attr => attributes.has(attr))) {
            return node
          }

          const css = Array.isArray(node.content)
            ? node.content.join('')
            : node.content

          const promise = processCss(css, config)
            .then(processedCss => {
              node.content = [processedCss]
            })
            .catch(error => {
              console.warn('Error processing CSS in style tag:', error.message)
            })

          stylePromises.push(promise)
        }

        return node
      })

      Promise.all(stylePromises)
        .then(() => resolve(tree))
        .catch(reject)
    })
  }
}

async function processCss(css, config) {
  /**
   * PostCSS pipeline. Plugins defined and added here
   * will apply to all `<style>` tags in the HTML,
   * unless marked to be excluded.
   */
  const resolveCSSProps = merge(get(config, 'css.resolveProps', {}), { preserve: false })

  let lightningCssOptions = get(config, 'css.lightning')
  if (lightningCssOptions !== false) {
    lightningCssOptions = merge(
      lightningCssOptions,
      {
        targets: {
          ie: 1,
        },
      }
    )
  }

  try {
    const result = await postcss([
      tailwindcss(get(config, 'css.tailwind', {})),
      customProperties(resolveCSSProps),
      ...get(config, 'postcss.plugins', []),
    ]).process(css, merge(
      get(config, 'postcss.options', {}),
      {
        from: config.cwd || './',
        parser: postcssSafeParser
      }
    ))

    /**
     * Lightning CSS processing
     *
     * We use this to lower the modern Tailwind CSS 4 syntax
     * to be more email-friendly.
     */

    if (result.css?.trim() && lightningCssOptions !== false) {
      try {
        const { code } = transform(
          merge(
            lightningCssOptions,
            {
              code: Buffer.from(result.css)
            }
          )
        )

        return code.toString()
      } catch (error) {
        console.warn('Failed to lower syntax with Lightning CSS:', error.message)
      }
    }

    return result.css
  } catch (error) {
    console.warn('Error compiling CSS:', error.message)
    return css
  }
}
