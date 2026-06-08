import postcss from 'postcss'
import tailwindcssPostcss from '@tailwindcss/postcss'
import postcssCalc from 'postcss-calc'
import safeParser from 'postcss-safe-parser'
import { transform } from 'lightningcss'
import resolveProps from '../plugins/postcss/resolveProps.ts'
import pruneVars from '../plugins/postcss/pruneVars.ts'
import { tailwindCleanup } from '../plugins/postcss/tailwindCleanup.ts'
import { mergeMediaQueries } from '../plugins/postcss/mergeMediaQueries.ts'
import { quoteFontFamilies } from '../plugins/postcss/quoteFontFamilies.ts'
import { resolveMaizzleImports } from '../plugins/postcss/resolveMaizzleImports.ts'
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
    code: new TextEncoder().encode(css),
    minify: false,
    targets: { ie: 4 << 5 },
  })

  return new TextDecoder().decode(result.code)
}

export async function optimizeTailwindCss(css: string, config: MaizzleConfig): Promise<string> {
  const plugins: postcss.Plugin[] = [...tailwindCleanup(config), quoteFontFamilies()]

  const mediaPlugin = mergeMediaQueries(config)
  if (mediaPlugin) plugins.push(mediaPlugin)

  const result = await postcss(plugins).process(css, { from: undefined })

  return result.css
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
