import type { MaizzleConfig } from '../types/config.ts'

/**
 * Injectable capabilities for the transformer pipeline.
 *
 * The Tailwind compiler, the HTML formatter and local stylesheet reads are
 * the only Node-only seams in {@link runTransformers}. They're injected
 * (rather than statically imported) so the browser/edge build can supply
 * isomorphic implementations — or opt out — without pulling native deps
 * (`@tailwindcss/postcss`, `lightningcss`, `oxfmt`, `node:fs`) into the bundle.
 *
 * When a field is `undefined`, the consuming transformer lazily imports its
 * Node default. Pass `null` for `format`/`readLinkFile` to disable the
 * capability (browser).
 */
export type CompileTailwind = (cssInput: string, config: MaizzleConfig, from: string) => Promise<string>
export type FormatFn = (html: string, options: object) => Promise<string>
export type ReadLinkFile = (href: string, filePath: string) => string | undefined

export interface TransformOptions {
  compileTailwind?: CompileTailwind
  format?: FormatFn | null
  readLinkFile?: ReadLinkFile | null
}
