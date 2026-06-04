export type FilterFunction = (str: string, value: string) => string

const escapeMap: Record<string, string> = {
  '"': '&#34;',
  '&': '&amp;',
  "'": '&#39;',
  '<': '&lt;',
  '>': '&gt;',
}

const escapeRegex = /["&'<>]/g

function escapeHtml(str: string): string {
  return str.replace(escapeRegex, ch => escapeMap[ch])
}

export const defaults: Record<string, FilterFunction> = {
  append: (str, value) => str + value,
  prepend: (str, value) => value + str,
  uppercase: str => str.toUpperCase(),
  lowercase: str => str.toLowerCase(),
  capitalize: str => str.charAt(0).toUpperCase() + str.slice(1),
  ceil: str => String(Math.ceil(Number.parseFloat(str))),
  floor: str => String(Math.floor(Number.parseFloat(str))),
  round: str => String(Math.round(Number.parseFloat(str))),
  escape: str => escapeHtml(str),
  'escape-once': str => {
    const decoded = str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#34;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")

    return escapeHtml(decoded)
  },
  lstrip: str => str.trimStart(),
  rstrip: str => str.trimEnd(),
  trim: str => str.trim(),
  minus: (str, value) => String(Number.parseFloat(str) - Number.parseFloat(value)),
  plus: (str, value) => String(Number.parseFloat(str) + Number.parseFloat(value)),
  multiply: (str, value) => String(Number.parseFloat(str) * Number.parseFloat(value)),
  times: (str, value) => String(Number.parseFloat(str) * Number.parseFloat(value)),
  'divide-by': (str, value) => String(Number.parseFloat(str) / Number.parseFloat(value)),
  divide: (str, value) => String(Number.parseFloat(str) / Number.parseFloat(value)),
  modulo: (str, value) => String(Number.parseFloat(str) % Number.parseFloat(value)),
  'newline-to-br': str => str.replace(/\n/g, '<br>'),
  'strip-newlines': str => str.replace(/\n/g, ''),
  remove: (str, value) => str.split(value).join(''),
  'remove-first': (str, value) => {
    const i = str.indexOf(value)
    return i === -1 ? str : str.slice(0, i) + str.slice(i + value.length)
  },
  replace: (str, value) => {
    const [search = '', replacement = ''] = value.split('|')
    return str.split(search).join(replacement)
  },
  'replace-first': (str, value) => {
    const [search = '', replacement = ''] = value.split('|')
    const i = str.indexOf(search)
    return i === -1 ? str : str.slice(0, i) + replacement + str.slice(i + search.length)
  },
  size: str => String(str.length),
  slice: (str, value) => {
    const args = value.split(',').map(s => Number.parseInt(s.trim(), 10))
    return str.slice(args[0], args[1])
  },
  truncate: (str, value) => {
    const commaIndex = value.indexOf(',')
    const length = Number.parseInt(commaIndex === -1 ? value : value.slice(0, commaIndex), 10)
    const ellipsis = commaIndex === -1 ? '...' : value.slice(commaIndex + 1)

    if (str.length <= length) return str

    return str.slice(0, length) + ellipsis
  },
  'truncate-words': (str, value) => {
    const commaIndex = value.indexOf(',')
    const count = Number.parseInt(commaIndex === -1 ? value : value.slice(0, commaIndex), 10)
    const ellipsis = commaIndex === -1 ? '...' : value.slice(commaIndex + 1)
    const words = str.split(/\s+/).filter(Boolean)

    if (words.length <= count) return str

    return words.slice(0, count).join(' ') + ellipsis
  },
  'url-decode': str => decodeURIComponent(str.replace(/\+/g, ' ')),
  'url-encode': str => encodeURIComponent(str),
}
