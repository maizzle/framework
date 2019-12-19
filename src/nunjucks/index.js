const marked = require('marked')
const nunjucks = require('nunjucks')
const markdown = require('nunjucks-markdown')
const ComponentExtension = require('../nunjucks/tags/component')

module.exports.init = async (config) => {
  const tags = config && config.tags ? config.tags : {}
  const basePath = config && config.path ? config.path : process.cwd()

  const nunjucksEnv = nunjucks.configure(basePath, { autoescape: false, noCache: true, tags: tags })

  nunjucksEnv.addExtension('componentExtension', new ComponentExtension(nunjucks))

  markdown.register(nunjucksEnv, marked)

  return nunjucksEnv
}
