import posthtml from 'posthtml'
import { render } from 'posthtml-render'
import isEmpty from 'lodash-es/isEmpty.js'
import { parser as parse } from 'posthtml-parser'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

const posthtmlPlugin = (replacements = {}) => tree => {
  if (!isEmpty(replacements)) {
    const regexes = Object.entries(replacements).map(([k, v]) => [new RegExp(k, 'gi'), v])
    const patterns = new RegExp(Object.keys(replacements).join('|'), 'gi')

    return parse(
      render(tree).replace(patterns, matched => {
        for (const [regex, replacement] of regexes) {
          if (regex.test(matched)) {
            return matched.replace(regex, replacement)
          }
        }

        return matched
      }),
      getPosthtmlOptions()
    )
  }

  return tree
}

export default posthtmlPlugin

export async function replaceStrings(html = '', replacements = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(replacements)
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}
