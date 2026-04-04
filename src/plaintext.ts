import { stripHtml } from 'string-strip-html'
import defu from 'defu'

const defaults = {
  dumpLinkHrefsNearby: {
    enabled: true,
    putOnNewLine: true,
  },
}

export function createPlaintext(html: string, options?: Record<string, unknown>): string {
  return stripHtml(html, defu(options, defaults)).result
}
