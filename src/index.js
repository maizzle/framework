const serve = require('./commands/serve')
const toFile = require('./commands/build')
const transformers = require('./transformers')
const toString = require('./functions/render')
const PostCSS = require('./generators/postcss')
const toPlaintext = require('./functions/plaintext')
const TailwindCSS = require('./generators/tailwindcss')

module.exports = {
  serve,
  build: toFile,
  ...transformers,
  render: toString,
  postcss: PostCSS,
  plaintext: toPlaintext,
  tailwindcss: TailwindCSS
}
