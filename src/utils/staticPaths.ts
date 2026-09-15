import { dirname, resolve } from 'node:path'

/** Absolute static (non-glob) prefix of a source pattern, used as the strip base. */
export function staticBase(pattern: string): string {
  const staticPart = pattern.split(/[*{?[]/)[0]
  // Treat both separators as trailing: resolved patterns use '\' on Windows.
  return resolve(/[/\\]$/.test(staticPart) ? staticPart : dirname(staticPart))
}
