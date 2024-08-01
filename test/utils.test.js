import os from 'node:os'
import { describe, expect, test, vi, afterAll } from 'vitest'
import {
  injectScript,
  findCommonPrefix,
  formatMs,
  formatTime,
  humanFileSize
} from '../src/utils/string.js'

import {
  getLocalIP,
  getFileSize,
  getColorizedFileSize,
  parseFrontMatter
} from '../src/utils/node.js'

describe.concurrent('String utils', () => {
  test('Injects script at correct location', () => {
    const script = '<script src="test.js"></script>'

    // Returns the HTML if no valid location is found
    expect(injectScript('<p></p>', script)).toBe(script + '<p></p>')

    // Injects script before </head>
    expect(injectScript('<html><head><title>Test</title></head><body></body></html>', script))
      .toBe('<html><head><title>Test</title><script src="test.js"></script></head><body></body></html>')

    // Injects script after </title>
    expect(injectScript('<html><title>Test</title><body></body></html>', script))
      .toBe('<html><title>Test</title><script src="test.js"></script><body></body></html>')

    // Injects script before </body>
    expect(injectScript('<html><body><p>foo</p></body></html>', script))
      .toBe('<html><body><p>foo</p><script src="test.js"></script></body></html>')

    // Injects script before </html>
    expect(injectScript('<html><p>foo</p></html>', script))
      .toBe('<html><p>foo</p><script src="test.js"></script></html>')

    // Injects script after <!doctype html>
    expect(injectScript('<!doctype html><p>foo</p>', script))
      .toBe('<!doctype html><script src="test.js"></script><p>foo</p>')
  })

  test('Finds common prefix', () => {
    expect(findCommonPrefix(['foo', 'foobar', 'foobar'])).toBe('foo')

    expect(() => findCommonPrefix(true)).toThrow()
  })

  test('Formats milliseconds to time', () => {
    expect(formatMs(100000)).toBe('00:01:40')
  })

  test('Formats milliseconds to human-readable time', () => {
    expect(formatTime(100000)).toBe('1.67 min')
    expect(formatTime(40000)).toBe('40.00 s')
    expect(formatTime(900)).toBe('900 ms')
  })

  test('Formats bytes to human-readable size', () => {
    expect(humanFileSize(100)).toBe('100 B')
    expect(humanFileSize(1048576)).toBe('1.00 MB')
    expect(humanFileSize(1024, true)).toBe('1.02 KB')
  })
})

describe.concurrent('Node utils', () => {
  test('Gets local IP address', () => {
    expect(getLocalIP()).toBeDefined()
    expect(getLocalIP()).toContain('.')
  })

  test('should return a valid IPv4 address if found', () => {
    // Mock data for a valid IPv4 address
    const mockInterfaces = {
      eth0: [
        { family: 'IPv4', internal: false, address: '192.168.1.100' },
        { family: 'IPv6', internal: false, address: 'fe80::1' }
      ]
    }

    const mockedInterface = vi.spyOn(os, 'networkInterfaces').mockReturnValue(mockInterfaces)

    afterAll(() => {
      mockedInterface.mockReset()
    })

    expect(getLocalIP()).toBe('192.168.1.100')
  })

  test('`getLocalIP` returns default IP when no suitable IP is found', () => {
    const mockInterfaces = {
      eth0: [
        { family: 'IPv6', internal: false, address: 'fe80::1' }
      ]
    }

    const mockNetworkInterfaces = vi.spyOn(os, 'networkInterfaces').mockReturnValue(mockInterfaces)

    afterAll(() => {
      mockNetworkInterfaces.mockReset()
    })

    expect(getLocalIP()).toBe('127.0.0.1')
  })

  test('Gets file size of a string', () => {
    expect(getFileSize('foo')).toBe('3.00')

    // Colorized file size
    expect(getColorizedFileSize('foo')).toBe('3.00 B')
    expect(getColorizedFileSize('x'.repeat(49 * 1024))).toContain('49.00 KB')
    expect(getColorizedFileSize('x'.repeat(101 * 1024))).toContain('101.00 KB')
    expect(getColorizedFileSize('x'.repeat(102 * 1024))).toContain('102.00 KB')
  })

  test('Parses front matter', () => {
    const result = parseFrontMatter('---\ntitle: Test\n---\n\n<p>Test</p>')

    expect(result.data.title).toBe('Test')
    expect(result.content.trim()).toBe('<p>Test</p>')
  })
})
