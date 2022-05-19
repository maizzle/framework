const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  '\'': '&#39;'
}

const unescapeMap = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#34;': '"',
  '&#39;': '\''
}

const unescape = string => string.replace(/&(amp|lt|gt|#34|#39);/g, m => unescapeMap[m])

const append = (content, attribute) => content + attribute
const capitalize = content => content.charAt(0).toUpperCase() + content.slice(1)
const ceil = content => Math.ceil(Number.parseFloat(content))
const divide = (content, attribute) => Number.parseFloat(content) / Number.parseFloat(attribute)
const escape = content => content.replace(/["&'<>]/g, m => escapeMap[m])
const escapeOnce = content => escape(unescape(content))
const floor = content => Math.floor(Number.parseFloat(content))
const lowercase = content => content.toLowerCase()
const lstrip = content => content.replace(/^\s+/, '')
const minus = (content, attribute) => Number.parseFloat(content) - Number.parseFloat(attribute)
const modulo = (content, attribute) => Number.parseFloat(content) % Number.parseFloat(attribute)
const multiply = (content, attribute) => Number.parseFloat(content) * Number.parseFloat(attribute)
const newlineToBr = content => content.replace(/\n/g, '<br>')
const plus = (content, attribute) => Number.parseFloat(content) + Number.parseFloat(attribute)
const prepend = (content, attribute) => attribute + content
const remove = (content, attribute) => content.replaceAll(attribute, '')
const removeFirst = (content, attribute) => content.replace(attribute, '')
const replace = (content, attribute) => {
  const [search, replace] = attribute.split('|')
  return content.replaceAll(search, replace)
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
  try {
    const [start, end] = attribute.split(',')
    return content.slice(start, end)
  } catch {
    return content.slice(attribute)
  }
}

const stripNewlines = content => content.replace(/\n/g, '')
const trim = content => content.trim()
const truncate = (content, attribute) => {
  try {
    const [length, omission] = attribute.split(',')
    return content.length > Number.parseInt(length, 10) ?
      content.slice(0, length) + (omission || '...') :
      content
  } catch {
    const length = Number.parseInt(attribute, 10)
    return content.length > length ? content.slice(0, length) + '...' : content
  }
}

const truncateWords = (content, attribute) => {
  try {
    const [length, omission] = attribute.split(',')
    return content.split(' ').slice(0, Number.parseInt(length, 10)).join(' ') + (omission || '...')
  } catch {
    const length = Number.parseInt(attribute, 10)
    return content.split(' ').slice(0, length).join(' ') + '...'
  }
}

// eslint-disable-next-line
const urlDecode = content => content.split('+').map(decodeURIComponent).join(' ')
// eslint-disable-next-line
const urlEncode = content => content.split(' ').map(encodeURIComponent).join('+')

exports.append = append
exports.capitalize = capitalize
exports.ceil = ceil
exports['divide-by'] = divide
exports.divide = divide
exports.escape = escape
exports['escape-once'] = escapeOnce
exports.floor = floor
exports.lowercase = lowercase
exports.lstrip = lstrip
exports.minus = minus
exports.modulo = modulo
exports.multiply = multiply
exports['newline-to-br'] = newlineToBr
exports.plus = plus
exports.prepend = prepend
exports.remove = remove
exports['remove-first'] = removeFirst
exports.replace = replace
exports['replace-first'] = replaceFirst
exports.round = round
exports.rstrip = rstrip
exports.uppercase = uppercase
exports.size = size
exports.slice = slice
exports.strip = trim
exports['strip-newlines'] = stripNewlines
exports.times = multiply
exports.trim = trim
exports.truncate = truncate
exports['truncate-words'] = truncateWords
exports['url-decode'] = urlDecode
exports['url-encode'] = urlEncode
