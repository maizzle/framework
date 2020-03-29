const fm = require('front-matter')
const posthtml = require('posthtml')
const layouts = require('posthtml-extend')
const modules = require('posthtml-modules')
const includes = require('posthtml-include')
const expressions = require('posthtml-expressions')

module.exports = async (html, config) => {
  const directives = [
    { name: '?php', start: '<', end: '>' },
    ...config.build.posthtml.directives
  ]

  return posthtml([
    layouts({ ...config.build.layouts, strict: false }),
    includes(),
    modules(config.build.modules),
    expressions({ locals: { page: config } })
  ]).process(html, { directives: directives }).then(result => fm(result.html).body)
}
