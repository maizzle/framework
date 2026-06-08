/**
 * `process.cwd()` in Node, `/` everywhere else. Lets the isomorphic
 * transformer files reference a working directory without assuming a Node
 * `process` exists (the browser/edge build has none).
 */
export function cwd(): string {
  return typeof process !== 'undefined' && typeof process.cwd === 'function'
    ? process.cwd()
    : '/'
}
