const posthtml = require('posthtml')
const {get, isEmpty} = require('lodash')
const {removeWidows} = require('string-remove-widows')

module.exports = async (html, config = {}) => {
  if (isEmpty(config)) {
    return removeWidows(html).res
  }

  const posthtmlOptions = get(config, 'build.posthtml.options', {recognizeNoValueAttribute: true})

  return posthtml([removeWidowsPlugin(config)]).process(html, posthtmlOptions).then(result => result.html)
}

const removeWidowsPlugin = options => tree => {
  const {attrName = 'prevent-widows', ...removeWidowsOptions} = options

  removeWidowsOptions.minWordCount = removeWidowsOptions.minWordCount || 3

  // Ignore defaults
  const mappings = [
    // Jinja-like
    {
      heads: '{{',
      tails: '}}'
    },
    {
      heads: ['{% if', '{%- if'],
      tails: ['{% endif', '{%- endif']
    },
    {
      heads: ['{% for', '{%- for'],
      tails: ['{% endfor', '{%- endfor']
    },
    {
      heads: ['{%', '{%-'],
      tails: ['%}', '-%}']
    },
    {
      heads: '{#',
      tails: '#}'
    },
    // ASP/Hexo-like
    {
      heads: ['<%', '<%=', '<%-'],
      tails: ['%>', '=%>', '-%>']
    },
    // MSO comments
    {
      heads: '<!--[',
      tails: ']>'
    },
    // <![endif]-->
    {
      heads: '<![',
      tails: ']--><'
    }
  ]

  if (Array.isArray(removeWidowsOptions.ignore)) {
    removeWidowsOptions.ignore.forEach(pair => mappings.push(pair))
  }

  if (typeof removeWidowsOptions.ignore !== 'string') {
    removeWidowsOptions.ignore = mappings
  }

  const process = node => {
    if (node.attrs && node.attrs[attrName]) {
      const widowsRemovedString = removeWidows(tree.render(node.content), removeWidowsOptions).res

      node.content = tree.render(tree.parser(widowsRemovedString))
      node.attrs[attrName] = false
    }

    return node
  }

  return tree.walk(process)
}
