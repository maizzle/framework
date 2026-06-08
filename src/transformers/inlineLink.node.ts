import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { ReadLinkFile } from './env.ts'

/**
 * Node default for {@link inlineLinkDom}: resolve a local `<link href>`
 * relative to the source file and read it from disk. Lives in its own
 * module so the browser/edge build never pulls `node:fs`/`node:path` into
 * the bundle (it's lazily imported and marked external there).
 */
export const readLinkFile: ReadLinkFile = (href, filePath) => {
  try {
    return readFileSync(resolve(dirname(filePath), href), 'utf8')
  } catch {
    return undefined
  }
}
