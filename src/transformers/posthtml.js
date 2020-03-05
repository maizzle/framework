const posthtml = require('posthtml')
const preventWidows = require('prevent-widows')
const posthtmlmd = require('posthtml-markdown')
const posthtmlContent = require('posthtml-content')
const Tailwind = require('../generators/tailwind')

module.exports = async (html, config) => {
  const plugins = [
    posthtmlContent({ tailwind: css => Tailwind.fromString(css, html, false, config) }),
    posthtmlmd(config.markdown),
    preventWidows.posthtml()
  ]

  html = await posthtml(plugins).process(html).then(res => res.html)

  return html
}
