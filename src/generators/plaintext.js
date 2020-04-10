const path = require('path')
const fs = require('fs-extra')
const stripHTML = require('string-strip-html')

module.exports.output = async (html, filePath, config) => {
  filePath = config.permalink || filePath
  const destination = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + '.txt')

  const plaintext = stripHTML(html,
    {
      dumpLinkHrefsNearby: {
        enabled: true,
        putOnNewLine: true,
        wrapHeads: '[',
        wrapTails: ']'
      }
    })

  fs.outputFile(destination, plaintext)
}
