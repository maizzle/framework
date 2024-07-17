import path from 'pathe'
import posthtml from 'posthtml'
import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'
import { stripHtml } from 'string-strip-html'
import defaultConfig from '../posthtml/defaultConfig.js'
import { writeFile, lstat, mkdir } from 'node:fs/promises'

/**
 * Removes HTML tags from a given HTML string based on
 * a specified tag name or an array of tag names.
 *
 * @param {Object} options - The options object.
 * @param {string|string[]} [options.tag='not-plaintext'] - The tag name or an array of tag names to remove from the HTML.
 * @param {string} [options.html=''] - The HTML string from which to remove the tags.
 * @param {Object} [options.config={}] - PostHTML options.
 * @returns {string} - The HTML string with the specified tags removed.
 */
const removeTags = ({ tag = 'not-plaintext', html = '', config = {} }) => {
  /**
   * If the HTML string is empty, return it as is
   */
  if (!html) {
    return html
  }

  const posthtmlPlugin = () => tree => {
    const process = node => {
      if (!node.tag) {
        return node
      }

      /**
       * If the tag is a string and it matches the node tag, remove it
       */
      if (node.tag === tag) {
        return {
          tag: false,
          content: ['']
        }
      }

      return node
    }

    return tree.walk(process)
  }

  const posthtmlOptions = merge(defaultConfig, config)

  return posthtml([posthtmlPlugin()]).process(html, { ...posthtmlOptions }).then(res => res.html)
}

/**
 * Handles custom <plaintext> tags and replaces their content based on the tag name.
 *
 * @param {Object} options - The options object.
 * @param {string} [options.html=''] - The HTML string containing custom tags to be processed.
 * @param {Object} [options.config={}] - PostHTML options.
 * @returns {string} - The modified HTML string after processing custom tags.
 */
export async function handlePlaintextTags(html = '', config = {}) {
  /**
   * If the HTML string is empty, return early
   */
  if (!html) {
    return html
  }

  const posthtmlPlugin = () => tree => {
    const process = node => {
      /**
       * Remove <plaintext> tags and their content from the HTML
       */
      if (node.tag === 'plaintext') {
        return {
          tag: false,
          content: ['']
        }
      }

      /**
       * Replace <not-plaintext> tags with their content
       */
      if (node.tag === 'not-plaintext') {
        return {
          tag: false,
          content: tree.render(node.content)
        }
      }

      return node
    }

    return tree.walk(process)
  }

  const posthtmlOptions = merge(defaultConfig, config)

  return posthtml([posthtmlPlugin()]).process(html, { ...posthtmlOptions }).then(res => res.html)
}

/**
 * Generate a plaintext representation from the provided HTML.
 *
 * @param {Object} options - The options object.
 * @param {string} [options.html=''] - The HTML string to convert to plaintext.
 * @param {Object} [options.config={}] - Configuration object.
 * @returns {Promise<string>|void} - The generated plaintext as a string.
 */
export async function generatePlaintext(html = '', config = {}) {
  const { posthtml: posthtmlOptions, ...stripOptions } = config

  /**
   * Remove <not-plaintext> tags and their content from the HTML.
   * `config` is an object containing PostHTML options.
   */
  html = await removeTags({ tag: 'not-plaintext', html, config: posthtmlOptions })

  /**
   * Return the plaintext representation from the stripped HTML.
   * The `dumpLinkHrefsNearby` option is enabled by default.
   */
  return stripHtml(
    html,
    merge(
      stripOptions,
      {
        dumpLinkHrefsNearby: {
          enabled: true,
        },
      },
    )
  ).result
}

export async function writePlaintextFile(plaintext = '', config = {}) {
  if (!plaintext) {
    throw new Error('Missing plaintext content.')
  }

  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext content must be a string.')
  }

  /**
   * Get plaintext output path config, i.e `config.plaintext.destination.path`
   *
   * Fall back to template's build output path and extension, for example:
   * `config.build.output.path`
   */
  const plaintextConfig = get(config, 'plaintext')
  let plaintextOutputPath = get(plaintextConfig, 'output.path', get(config, 'build.output.path'))
  const plaintextExtension = get(plaintextConfig, 'output.extension', 'txt')

  /**
   * If `plaintext: true` (either from Front Matter or from config)
   */
  if (plaintextConfig === true) {
    // If the template has a `permalink` key set in the FM
    if (typeof config.permalink === 'string') {
      // Output plaintext at the `permalink` path
      plaintextOutputPath = config.permalink
    } else {
      // Output plaintext at the same directory as the HTML file
      plaintextOutputPath = get(config, 'build.output.path')
    }
  }

  /**
   * If `plaintext: path/to/file.ext` in the FM
   * Can't work if set in config.js as file path, because it would be the same for all templates
   * We check later if it's a dir path, won't work if it's a file path
   */
  if (typeof plaintextConfig === 'string') {
    plaintextOutputPath = plaintextConfig
  }

  // No need to handle if it's an object, since we already set it to that initially

  /**
   * If `plaintextOutputPath` is a file path, output file there
   */
  if (path.extname(plaintextOutputPath)) {
    // Ensure the target directory exists
    await lstat(plaintextOutputPath).catch(async () => {
      await mkdir(plaintextOutputPath, { recursive: true })
    })

    // Ensure correct extension is used
    plaintextOutputPath = path.join(
      path.dirname(plaintextOutputPath),
      path.basename(plaintextOutputPath, path.extname(plaintextOutputPath)) + '.' + plaintextExtension
    )

    console.log('plaintextOutputPath', plaintextOutputPath);

    return writeFile(plaintextOutputPath, plaintext)
  }

  /**
   * If `plaintextOutputPath` is a directory path, output file there, using the template's name
   */
  const templateFileName = get(config, 'build.current.path.name')

  plaintextOutputPath = path.join(
    path.dirname(plaintextOutputPath),
    get(config, 'build.current.path.dir'),
    templateFileName + '.' + plaintextExtension
  )

  // Ensure the target directory exists
  await lstat(path.dirname(plaintextOutputPath)).catch(async () => {
    await mkdir(path.dirname(plaintextOutputPath), { recursive: true })
  })

  return writeFile(plaintextOutputPath, plaintext)
}
