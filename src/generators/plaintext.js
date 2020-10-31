const path = require('path')
const stripHTML = require('string-strip-html')
const {getPropValue} = require('../utils/helpers')

module.exports.generate = async (html, destination, config) => {
  destination = getPropValue(config, 'permalink') || destination

  const options = getPropValue(config, 'plaintext') || {}

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
