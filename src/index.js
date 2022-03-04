const serve = require('./commands/serve')
const toFile = require('./commands/build')
const transformers = require('./transformers')
const toString = require('./functions/render')
const toPlaintext = require('./functions/plaintext')

module.exports = {
  serve,
  build: toFile,
  ...transformers,
  render: toString,
  plaintext: toPlaintext
}
