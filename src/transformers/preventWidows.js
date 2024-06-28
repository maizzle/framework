const posthtml = require('posthtml')
const {get, merge, isEmpty} = require('lodash')
const {removeWidows} = require('string-remove-widows')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}) => {
  if (isEmpty(config)) {
    return removeWidows(html).res
  }

  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

  return posthtml([removeWidowsPlugin(config)]).process(html, posthtmlOptions).then(result => result.html)
}

const removeWidowsPlugin = options => tree => {
  const {attrName = 'prevent-widows', ...removeWidowsOptions} = get(options, 'widowWords', options)

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
    for (const pair of removeWidowsOptions.ignore) {
      mappings.push(pair)
    }
  }

  if (typeof removeWidowsOptions.ignore !== 'string') {
    removeWidowsOptions.ignore = mappings
  }

  const process = node => {
    if (node.attrs && Object.keys(node.attrs).includes(attrName)) {
      const widowsRemovedString = removeWidows(tree.render(node.content), removeWidowsOptions).res

      node.content = tree.render(tree.parser(widowsRemovedString))
      node.attrs[attrName] = false
    }

    return node
  }

  return tree.walk(process)
}
