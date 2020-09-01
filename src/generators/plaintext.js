const path = require('path')
const stripHTML = require('string-strip-html')
const {getPropValue} = require('../utils/helpers')

module.exports.prepare = async (html, filePath, config) => {
  filePath = getPropValue(config, 'permalink') || filePath
  const target = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + '.txt')

  const plaintext = stripHTML(html,
    {
      dumpLinkHrefsNearby: {
        enabled: true,
        putOnNewLine: true,
        wrapHeads: '[',
        wrapTails: ']'
      }
    }).result

  return {target, plaintext}
}
