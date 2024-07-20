/**
 * Inject a script into HTML by "prepending" it to the first available closing
 * tag from a list of candidates.
 *
 * @param {string} html The HTML content
 * @param {string} script The script to inject
 * @returns {string} The modified HTML
 */
export function injectScript(html = '', script = '') {
  if (html.includes('</head>')) {
    return html.replace('</head>', `${script}</head>`)
  }

  if (html.includes('</title>')) {
    return html.replace('</title>', `</title>${script}`)
  }

  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`)
  }

  if (html.includes('</html>')) {
    return html.replace('</html>', `${script}</html>`)
  }

  if (html.includes('<!doctype html>')) {
    return html.replace('<!doctype html>', `<!doctype html>${script}`)
  }

  return script + html
}

/**
 * Find the common prefix among an array of strings.
 *
 * @param {string[]} strings Array of strings
 * @returns {string} Common prefix
 * @throws {TypeError} If the input is not an array
 */
export function findCommonPrefix(strings) {
  // Must be an array
  if (!Array.isArray(strings)) {
    throw new TypeError('findCommonPrefix expects an array')
  }

  const sortedStrings = strings.slice().sort()
  const first = sortedStrings[0]
  const last = sortedStrings[sortedStrings.length - 1]
  let i = 0

  while (i < first.length && first.charAt(i) === last.charAt(i)) {
    i++
  }

  return first.substring(0, i)
}

export function formatMs(milliseconds) {
  const date = new Date(milliseconds);

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return formattedTime;
}

/**
 * Format milliseconds as human-readable text.
 *
 * @param {number} ms Number of milliseconds.
 * @returns {string} Formatted string.
 */
export function formatTime(ms) {
  if (ms < 1000) {
    return `${ms} ms`
  }

  if (ms < 60000) { // Less than 1 minute
    const seconds = ms / 1000
    return `${seconds.toFixed(2)} s`
  }

  const minutes = ms / 60000
  return `${minutes.toFixed(2)} min`
}

/**
 * Format bytes as human-readable text.
 *
 * @param {number} bytes Number of bytes.
 * @param {boolean} si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param {number} dp Number of decimal places to display.
 *
 * @return {string} Formatted string.
 */
export function humanFileSize(bytes, si=false, dp=2) {
  const threshold = si ? 1000 : 1024

  if (Math.abs(bytes) < threshold) {
    return bytes + ' B'
  }

  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  let u = -1
  const r = 10**dp

  do {
    bytes /= threshold
    ++u
  } while (Math.round(Math.abs(bytes) * r) / r >= threshold && u < units.length - 1)


  return bytes.toFixed(dp) + ' ' + units[u]
}

/**
 * Get the root directories from a list of globs.
 * @param {*} globs
 * @returns
 */
export function getRootDirectories(globs) {
  globs = Array.isArray(globs) ? globs : [globs]

  const positiveGlobs = new Set(globs.filter(g => !g.startsWith('!')))

  const rootDirs = new Set()

  for (const pattern of positiveGlobs) {
    rootDirs.add(pattern.split('/').slice(0, pattern.split('/').indexOf('**')).join('/'))
  }

  return Array.from(rootDirs)
}

/**
 * Get the file extensions from a glob pattern.
 * @param {*} pattern
 * @returns
 */
export function getFileExtensionsFromPattern(pattern) {
  const starExtPattern = /\.([^\*\{\}]+)$/ // Matches .ext but not .* or .{ext}
  const bracePattern = /\.{([^}]+)}$/ // Matches .{ext} or .{ext,ext}
  const wildcardPattern = /\.\*$/ // Matches .*

  if (wildcardPattern.test(pattern)) {
    return ['html'] // We default to 'html' if the pattern is a wildcard
  }

  const braceMatch = pattern.match(bracePattern);
  if (braceMatch) {
    return braceMatch[1].split(',') // Split and return extensions inside braces
  }

  const starExtMatch = pattern.match(starExtPattern)
  if (starExtMatch) {
    return [starExtMatch[1]] // Return single extension
  }

  return ['html'] // No recognizable extension pattern, default to 'html'
}

export function parseCSSRule(rule) {
  // Step 1: Trim the input string
  rule = rule.trim()

  // Step 2: Find the index of the first colon
  const colonIndex = rule.indexOf(':')

  // Step 3: Extract property and value parts
  if (colonIndex === -1) {
    return {
      property: '',
      value: ''
    }
  }

  const property = rule.slice(0, colonIndex).trim()
  const value = rule.slice(colonIndex + 1).trim()

  return { property, value }
}
