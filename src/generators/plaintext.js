const path = require('path')
const {get} = require('lodash')
const {stripHtml} = require('string-strip-html')

module.exports.generate = async (html, destination, config) => {
  const options = get(config, 'plaintext', {})
  const extension = get(options, 'destination.extension', 'txt')
  const plaintext = stripHtml(html, {
    dumpLinkHrefsNearby: {
      enabled: true
    },
    ...options
  }).result

  // If we set plaintext.destination.path in config/fm
  if (get(options, 'destination.path')) {
    destination = get(options, 'destination.path')

    return {plaintext, destination}
  }

  destination = get(config, 'permalink', destination)

  if (typeof destination === 'string') {
    destination = path.join(path.dirname(destination), path.basename(destination, path.extname(destination)) + '.' + extension)
  }

  return {plaintext, destination}
}
