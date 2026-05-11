import { matchesGlob, relative } from 'node:path'

/**
 * Build a predicate that tells whether an absolute file path emitted by
 * chokidar matches any of the given globs. Patterns are interpreted as
 * project-relative; a leading `./` is stripped so user-supplied globs like
 * `./locales/**` behave identically to `locales/**`.
 */
export function createWatchedFileMatcher(patterns: string[], cwd: string) {
  const normalized = patterns.map(p => p.replace(/^\.\//, ''))
  return (file: string) => {
    const rel = relative(cwd, file).replace(/\\/g, '/')
    return normalized.some(p => matchesGlob(rel, p))
  }
}
