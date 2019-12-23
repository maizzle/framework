const posthtml = require('posthtml')
const Tailwind = require('../generators/tailwind')
const preventWidows = require('prevent-widows')
const posthtmlContent = require('posthtml-content')

module.exports = async (html, config) => {
  const plugins = [
    posthtmlContent({ tailwind: css => Tailwind.fromString(css, html, false, config) }),
    preventWidows.posthtml()
  ]

  html = await posthtml(plugins).process(html).then(res => res.html)

  return html
}
