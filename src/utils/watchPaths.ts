import { matchesGlob, relative } from 'pathe'

/**
 * Build a predicate that tells whether an absolute file path emitted by
 * chokidar matches any of the given globs. Patterns are interpreted as
 * project-relative; a leading `./` is stripped so user-supplied globs like
 * `./locales/**` behave identically to `locales/**`.
 */
export function createWatchedFileMatcher(patterns: string[], cwd: string) {
  const normalized = patterns.map(p => p.replace(/^\.\//, ''))
  return (file: string) => {
    const rel = relative(cwd, file)
    return normalized.some(p => matchesGlob(rel, p))
  }
}

/**
 * Derive the directories the dev server watcher must cover explicitly now
 * that its Vite root is the dev UI directory, not the project cwd: the
 * static prefixes of the content globs, component source dirs, the Maizzle
 * root, and the static prefixes of the watch globs. Directories, not globs —
 * the dev server runs with Vite's default `disableGlobbing`, so globs passed
 * to `watcher.add` are treated literally.
 *
 * Negated patterns are excludes and produce no watch root. A watch pattern
 * with no static prefix (a bare `*.json`, or a glob starting with `**`)
 * deliberately falls back to `cwd`:
 * it asks for project-wide matching, and only a project-wide watch can honor
 * it. Content patterns cannot hit that fallback — they arrive from
 * `resolveConfig` already resolved against the (absolute) root.
 */
export function deriveWatchRoots(options: {
  content: string[]
  componentDirs: string[]
  root?: string
  watchPaths: string[]
  cwd: string
}): string[] {
  const { content, componentDirs, root, watchPaths, cwd } = options

  const globFreePrefix = (pattern: string) => {
    const prefix = pattern.split(/[*?{]/)[0]
    return prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  }

  return [...new Set([
    ...content.filter(p => !p.startsWith('!')).map(globFreePrefix),
    ...componentDirs,
    ...(root ? [root] : []),
    ...watchPaths.filter(p => !p.startsWith('!')).map(p => globFreePrefix(p) || cwd),
  ].filter(Boolean))]
}
