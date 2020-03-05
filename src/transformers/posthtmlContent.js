const posthtml = require('posthtml')
const Tailwind = require('../generators/tailwind')
const posthtmlContent = require('posthtml-content')

module.exports = async (html, config) => {
  html = await posthtml([
    posthtmlContent({
      tailwind: css => Tailwind.fromString(css, html, false, config)
    })
  ]).process(html).then(res => res.html)

  return html
}
