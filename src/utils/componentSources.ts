import { resolve, relative } from 'node:path'
import type { ComponentSource } from '../types/config.ts'

/**
 * Internal representation of a component source after defaults are
 * resolved and `path` is made absolute. Always carries the same shape
 * regardless of which user-facing form produced it.
 */
export interface NormalizedComponentSource {
  /** Absolute directory path. */
  path: string
  /**
   * Custom prefix prepended to resolved component names.
   *   - `undefined` → use folder-name namespace (the `directoryAsNamespace`
   *     behavior of unplugin-vue-components).
   *   - `''` (empty string) → no prefix at all; use the bare filename.
   *   - any other string → exact prefix.
   */
  prefix?: string
  /** Include intermediate subfolder names in the resolved name. */
  pathPrefix: boolean
}

/**
 * Normalize a user-supplied `components.source` value into an array
 * of absolute, fully-defaulted entries.
 */
export function normalizeComponentSources(
  sources: ComponentSource | ComponentSource[] | undefined,
  cwd: string,
): NormalizedComponentSource[] {
  if (!sources) return []
  const list = Array.isArray(sources) ? sources : [sources]
  return list.map((s) => {
    if (typeof s === 'string') {
      return { path: resolve(cwd, s), prefix: undefined, pathPrefix: true }
    }
    return {
      path: resolve(cwd, s.path),
      prefix: s.prefix,
      pathPrefix: s.pathPrefix ?? true,
    }
  })
}

function pascalCase(s: string): string {
  return s
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toUpperCase())
}

export interface ComponentNameOptions {
  /** Absolute path to the component file. */
  filePath: string
  /** Absolute path to the dir root the component was discovered under. */
  dirRoot: string
  /** See {@link NormalizedComponentSource.prefix}. */
  prefix?: string
  /** See {@link NormalizedComponentSource.pathPrefix}. */
  pathPrefix: boolean
}

/**
 * Compute the component name unplugin-vue-components would assign for a
 * given file under a given dir, mirroring the plugin's
 * `directoryAsNamespace: true` + `collapseSamePrefixes: true` behavior
 * and layering custom-prefix sources on top.
 *
 * Used both at render time (to register a custom resolver) and at lint
 * time (so the linter can follow component graph correctly).
 */
export function componentNameFromPath(opts: ComponentNameOptions): string {
  const { filePath, dirRoot, prefix, pathPrefix } = opts

  const rel = relative(dirRoot, filePath).replace(/\\/g, '/')
  const noExt = rel.replace(/\.(vue|md)$/, '')
  const segments = noExt.split('/').map(pascalCase)
  const fileName = segments.pop() ?? ''

  if (prefix !== undefined) {
    const folderPart = pathPrefix ? segments.join('') : ''
    const stripped = prefix && fileName.startsWith(prefix)
      ? fileName.slice(prefix.length)
      : fileName
    return prefix + folderPart + stripped
  }

  const folderPart = segments.join('')
  if (folderPart && fileName.startsWith(folderPart)) {
    return fileName
  }
  return folderPart + fileName
}
