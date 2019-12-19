const marked = require('marked')
const nunjucks = require('nunjucks')
const markdown = require('nunjucks-markdown')
const ComponentExtension = require('../nunjucks/tags/component')

module.exports.init = async (config) => {
  const tags = config.tags || {}

  const nunjucksEnv = nunjucks.configure(`${config.path || process.cwd()}`, { autoescape: false, noCache: true, tags: tags })

  nunjucksEnv.addExtension('componentExtension', new ComponentExtension(nunjucks))

  markdown.register(nunjucksEnv, marked)

  return nunjucksEnv
}
