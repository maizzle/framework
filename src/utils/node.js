import os from 'node:os'
import gm from 'gray-matter'
import pico from 'picocolors'
import { humanFileSize } from './string.js'

// Return a local IP address
export function getLocalIP() {
  const interfaces = os.networkInterfaces()

  for (const iface in interfaces) {
    const ifaceInfo = interfaces[iface]

    for (const alias of ifaceInfo) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address
      }
    }
  }

  return '127.0.0.1' // Default to localhost if no suitable IP is found
}

/**
 * Return the file size of a string
 *
 * @param {string} string The HTML string to calculate the file size of
 * @returns {number} The file size in bytes, a floating-point number
 * */
export function getFileSize(string) {
  const blob = new Blob([string], { type: 'text/html' })

  return blob.size.toFixed(2)
}

/**
 * Color-code a formatted file size string depending on the size
 *
 * 0-49 KB: green
 * 50-102 KB: yellow
 * >102 KB: red
 *
 * @param {string} string The HTML string to calculate the file size of
 * @returns {string} The formatted, color-coded file size
 * */
export function getColorizedFileSize(string) {
  const size = getFileSize(string)
  const formattedSize = humanFileSize(size)

  if (size / 1024 < 50) {
    return formattedSize
  }

  if (size / 1024 < 102) {
    return pico.yellow(formattedSize)
  }

  return pico.red(formattedSize)
}

export function parseFrontMatter(html) {
  /**
   * Need to pass empty options object to gray-matter
   * in order to disable caching.
   * https://github.com/jonschlinkert/gray-matter/issues/43
   */
  const { content, data, matter, stringify } = gm(html, {})
  return { content, data, matter, stringify }
}
