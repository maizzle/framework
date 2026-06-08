import postcss from 'postcss'
import tailwindcssPostcss from '@tailwindcss/postcss'
import postcssCalc from 'postcss-calc'
import safeParser from 'postcss-safe-parser'
import { transform } from 'lightningcss'
import resolveProps from '../plugins/postcss/resolveProps.ts'
import pruneVars from '../plugins/postcss/pruneVars.ts'
import { resolveMaizzleImports } from '../plugins/postcss/resolveMaizzleImports.ts'
import { optimizeTailwindCss } from './optimizeTailwindCss.ts'
import type { MaizzleConfig } from '../types/config.ts'

export function createTailwindProcessor(config: MaizzleConfig) {
  return postcss([
    // Must run before @tailwindcss/postcss so it sees absolute import paths
    resolveMaizzleImports(),
    tailwindcssPostcss({
      base: config.css?.base,
      transformAssetUrls: false,
      optimize: false,
    }),
    resolveProps(),
    postcssCalc({}),
    pruneVars(),
  ])
}

export function lowerCssSyntax(css: string): string {
  const result = transform({
    filename: 'email.css',
    code: Buffer.from(css),
    minify: false,
    targets: { ie: 4 << 5 },
  })

  return result.code.toString()
}

/**
 * Compile a Tailwind CSS source string into final email-safe CSS:
 * runs @tailwindcss/postcss, lowers modern syntax via lightningcss,
 * then applies cleanup + media-query merging.
 */
export async function compileTailwindCss(
  cssInput: string,
  config: MaizzleConfig,
  from: string,
): Promise<string> {
  const processor = createTailwindProcessor(config)
  const result = await processor.process(cssInput, { from, parser: safeParser })
  const lowered = lowerCssSyntax(result.css)
  return optimizeTailwindCss(lowered, config)
}
