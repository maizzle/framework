const serve = require('./commands/serve')
const toFile = require('./commands/build')
const render = require('./functions/render')
const transformers = require('./transformers')
const PostCSS = require('./generators/postcss')
const toPlaintext = require('./functions/plaintext')
const TailwindCSS = require('./generators/tailwindcss')

module.exports = {
  serve,
  render,
  build: toFile,
  ...transformers,
  postcss: PostCSS,
  plaintext: toPlaintext,
  tailwindcss: TailwindCSS
}
