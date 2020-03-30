const fm = require('front-matter')
const posthtml = require('posthtml')
const layouts = require('posthtml-extend')
const modules = require('posthtml-modules')
const includes = require('posthtml-include')
const expressions = require('posthtml-expressions')

module.exports = async (html, config) => {
  return posthtml([
    layouts({ strict: false, ...config.build.posthtml.layouts }),
    includes(),
    modules({ ...config.build.posthtml.modules }),
    ...config.build.posthtml.plugins || [],
    expressions({ locals: { page: config } })
  ]).process(html, { ...config.build.posthtml.options || {} }).then(result => fm(result.html).body)
}
