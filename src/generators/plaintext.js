const path = require('path')
const {get} = require('lodash')
const stripHTML = require('string-strip-html')

module.exports.generate = async (html, destination, config) => {
  destination = get(config, 'permalink', destination)

  const options = get(config, 'plaintext', {})

  const plaintext = stripHTML(html, {
    dumpLinkHrefsNearby: {
      enabled: true
    },
    ...options
  }).result

  if (typeof destination === 'string') {
    destination = path.join(path.dirname(destination), path.basename(destination, path.extname(destination)) + '.txt')
  }

  return {plaintext, destination}
}
