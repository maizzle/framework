import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import { removeWidows } from 'string-remove-widows'
import posthtmlConfig from '../posthtml/defaultConfig.js'

const posthtmlPlugin = (options = {}) => tree => {
  options = merge(options, {
    minWordCount: 3,
    attrName: 'prevent-widows'
  })

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

  if (Array.isArray(options.ignore)) {
    options.ignore.forEach(pair => mappings.push(pair))
  }

  if (typeof options.ignore !== 'string') {
    options.ignore = mappings
  }

  const process = node => {
    if (node.attrs && Object.keys(node.attrs).includes(options.attrName)) {
      const widowsRemovedString = removeWidows(tree.render(node.content), options).res
      node.content = tree.render(tree.parser(widowsRemovedString))
      delete node.attrs[options.attrName]
    }

    return node
  }

  return tree.walk(process)
}

export default posthtmlPlugin

export async function preventWidows(html = '', options = {}, posthtmlOptions = {}) {
  // Apply only to elements that contain the `prevent-widows` attribute
  if (options.withAttributes) {
    return posthtml([
      posthtmlPlugin(options)
    ])
      .process(html, merge(posthtmlOptions, posthtmlConfig))
      .then(result => result.html)
  }

  // Apply to all elements
  return removeWidows(html, options).res
}
