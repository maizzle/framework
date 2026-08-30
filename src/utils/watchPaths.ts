import { matchesGlob, relative } from 'pathe'

/**
 * Build a predicate that tells whether an absolute file path emitted by
 * chokidar matches any of the given globs. Patterns are interpreted as
 * project-relative; a leading `./` is stripped so user-supplied globs like
 * `./locales/**` behave identically to `locales/**`.
 *
 * Negated patterns (`!…`) are excludes: a file matches when it matches an
 * include pattern and no exclude pattern. They must not reach `matchesGlob`
 * as-is — it treats a lone negated pattern as "everything except", which
 * under `some()` would make the predicate true for almost every file.
 */
export function createWatchedFileMatcher(patterns: string[], cwd: string) {
  const stripDotSlash = (p: string) => p.replace(/^\.\//, '')
  const includes = patterns.filter(p => !p.startsWith('!')).map(stripDotSlash)
  const excludes = patterns.filter(p => p.startsWith('!')).map(p => stripDotSlash(p.slice(1)))
  return (file: string) => {
    const rel = relative(cwd, file)
    return includes.some(p => matchesGlob(rel, p)) && !excludes.some(p => matchesGlob(rel, p))
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

  // Stop at any glob syntax across both glob backends in use — pathe's
  // matchesGlob for the watched-file matcher (wildcards, ?, braces, bracket
  // classes) and tinyglobby/picomatch for template listing (additionally
  // extglobs: +(…), @(…), !(…), matched as two-char openers so bare
  // parentheses in directory names stay literal). Splitting too late would
  // leave a literal never-existing path as the root and silently lose
  // coverage; splitting too early merely watches the parent directory,
  // which still covers the target — so err on the side of splitting.
  const globFreePrefix = (pattern: string) => {
    const prefix = pattern.split(/[*?{[]|[+@!]\(/)[0]
    return prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  }

  return [...new Set([
    ...content.filter(p => !p.startsWith('!')).map(globFreePrefix),
    ...componentDirs,
    ...(root ? [root] : []),
    ...watchPaths.filter(p => !p.startsWith('!')).map(p => globFreePrefix(p) || cwd),
  ].filter(Boolean))]
}
