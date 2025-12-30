const append = (content, attribute) => content + attribute

const capitalize = content => content.charAt(0).toUpperCase() + content.slice(1)

const ceil = content => Math.ceil(Number.parseFloat(content))

const divide = (content, attribute) => Number.parseFloat(content) / Number.parseFloat(attribute)

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  '\'': '&#39;'
}
// biome-ignore lint: not confusing
const escape = content => content.replace(/["&'<>]/g, m => escapeMap[m])

const escapeOnce = content => escape(unescape(content))

const floor = content => Math.floor(Number.parseFloat(content))

const lowercase = content => content.toLowerCase()

const lstrip = content => content.replace(/^\s+/, '')

const minus = (content, attribute) => Number.parseFloat(content) - Number.parseFloat(attribute)

const modulo = (content, attribute) => Number.parseFloat(content) % Number.parseFloat(attribute)

const multiply = (content, attribute) => Number.parseFloat(content) * Number.parseFloat(attribute)

const newlineToBr = content => content.replace(/\r?\n/g, '<br>')

const plus = (content, attribute) => Number.parseFloat(content) + Number.parseFloat(attribute)

const prepend = (content, attribute) => attribute + content

const remove = (content, attribute) => {
  const regex = new RegExp(attribute, 'g')
  return content.replace(regex, '')
}

const removeFirst = (content, attribute) => content.replace(attribute, '')

const replace = (content, attribute) => {
  const [search, replace] = attribute.split('|')
  const regex = new RegExp(search, 'g')
  return content.replace(regex, replace)
}

const replaceFirst = (content, attribute) => {
  const [search, replace] = attribute.split('|')
  return content.replace(search, replace)
}

const round = content => Math.round(Number.parseFloat(content))

const rstrip = content => content.replace(/\s+$/, '')

const uppercase = content => content.toUpperCase()

const size = content => content.length

const slice = (content, attribute) => {
  const [start, end] = attribute.split(',')

  if (!end && !start) {
    return content
  }

  if (!end) {
    return content.slice(attribute)
  }

  return content.slice(start, end)
}

const stripNewlines = content => content.replace(/\r?\n/g, '')

const trim = content => content.trim()

const truncate = (content, attribute) => {
  const [length, omission] = attribute.split(',')

  return content && content.length > Number.parseInt(length, 10)
    ? content.slice(0, length) + (omission || '...')
    : content // content is shorter than length required to truncate
}

const truncateWords = (content, attribute) => {
  const [length, omission] = attribute.split(',')

  return content.split(' ')
    .slice(0, Number.parseInt(length, 10))
    .join(' ') + (omission || '...')
}

const unescapeMap = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#34;': '"',
  '&#39;': '\''
}
// biome-ignore lint: not confusing
const unescape = string => string.replace(/&(amp|lt|gt|#34|#39);/g, m => unescapeMap[m])

const urlDecode = content => content.split('+').map(decodeURIComponent).join(' ')

const urlEncode = content => content.split(' ').map(encodeURIComponent).join('+')

export const filters =  {
  append,
  capitalize,
  ceil,
  'divide-by': divide,
  escape,
  'escape-once': escapeOnce,
  floor,
  lowercase,
  lstrip,
  minus,
  modulo,
  multiply,
  'newline-to-br': newlineToBr,
  plus,
  prepend,
  remove,
  'remove-first': removeFirst,
  replace,
  'replace-first': replaceFirst,
  round,
  rstrip,
  uppercase,
  size,
  slice,
  'strip-newlines': stripNewlines,
  times: multiply,
  trim,
  truncate,
  'truncate-words': truncateWords,
  'url-decode': urlDecode,
  'url-encode': urlEncode,
  unescape
}
