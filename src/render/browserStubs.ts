/**
 * Browser-build replacement for the Node-only transformer modules
 * (`compileTailwindCss.ts`, `format.ts`, `inlineLink.node.ts`). The browser
 * renderer always passes explicit implementations via `TransformOptions`, so
 * these lazy fallbacks are never actually invoked — aliasing them here keeps
 * `@tailwindcss/postcss`, `lightningcss`, `oxfmt` and `node:fs` out of the
 * browser bundle entirely.
 */
function nodeOnly(): never {
  throw new Error('[maizzle] A Node-only transformer was invoked in the browser build. This is a bug — the browser renderer should inject its own implementation.')
}

export const compileTailwindCss = nodeOnly
export const format = nodeOnly
export const readLinkFile = nodeOnly
