const path = require('path')
const {get} = require('lodash')
const {stripHtml} = require('string-strip-html')

module.exports.generate = async (html, destination, config) => {
  const configDestinationPath = get(config, 'destination.path')
  const extension = get(config, 'destination.extension', 'txt')

  const plaintext = stripHtml(html, {
    dumpLinkHrefsNearby: {
      enabled: true
    },
    ...get(config, 'options', {})
  }).result

  // If we set plaintext.destination.path in config/fm
  if (configDestinationPath) {
    /**
     * Using a file path will generate a single plaintext file,
     * no matter how many templates there are.
     *
     * It will be based on the last-processed template.
     */
    if (path.extname(configDestinationPath)) {
      destination = configDestinationPath

      return {plaintext, destination}
    }

    /**
     * Using a directory-like path for plaintext.destination.path
     */
    destination = path.join(configDestinationPath, path.basename(config.filepath, path.extname(config.filepath)) + '.' + extension)

    return {plaintext, destination}
  }

  /**
   * Use template's `permalink` Front Matter key,
   * fall back to the original `destination`.
   */
  destination = get(config, 'permalink', destination)

  if (typeof destination === 'string') {
    destination = path.join(path.dirname(destination), path.basename(destination, path.extname(destination)) + '.' + extension)
  }

  return {plaintext, destination}
}
