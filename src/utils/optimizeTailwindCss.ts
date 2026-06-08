import postcss from 'postcss'
import { tailwindCleanup } from '../plugins/postcss/tailwindCleanup.ts'
import { mergeMediaQueries } from '../plugins/postcss/mergeMediaQueries.ts'
import { quoteFontFamilies } from '../plugins/postcss/quoteFontFamilies.ts'
import type { MaizzleConfig } from '../types/config.ts'

/**
 * Post-compilation cleanup shared by the Node and browser Tailwind
 * compilers. Pure PostCSS (no native deps), so it's safe in any runtime:
 * strips Tailwind scaffolding, re-quotes font families, merges media
 * queries.
 */
export async function optimizeTailwindCss(css: string, config: MaizzleConfig): Promise<string> {
  const plugins: postcss.Plugin[] = [...tailwindCleanup(config), quoteFontFamilies()]

  const mediaPlugin = mergeMediaQueries(config)
  if (mediaPlugin) plugins.push(mediaPlugin)

  const result = await postcss(plugins).process(css, { from: undefined })

  return result.css
}
