const marked = require('marked')
const nunjucks = require('nunjucks')
const markdown = require('nunjucks-markdown')
const ComponentExtension = require('../nunjucks/tags/component')

module.exports.init = async (path) => {
  const nunjucksEnv = nunjucks.configure(path, { autoescape: false, noCache: true })

  nunjucksEnv.addExtension('componentExtension', new ComponentExtension(nunjucks))

  markdown.register(nunjucksEnv, marked)

  return nunjucksEnv
}
