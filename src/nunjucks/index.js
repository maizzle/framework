const marked = require('marked')
const nunjucks = require('nunjucks')
const markdown = require('nunjucks-markdown')
const componentExtension = require('../nunjucks/tags/component')

module.exports.init = () => {
  const nunjucksEnv = nunjucks.configure({ autoescape: false, noCache: true })

  nunjucksEnv.addExtension('componentExtension', new componentExtension(nunjucks));

  markdown.register(nunjucksEnv, marked)

  return nunjucksEnv
}
