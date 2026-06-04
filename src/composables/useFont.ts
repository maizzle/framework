import { inject } from 'vue'
import { RenderContextKey } from './renderContext.ts'

type FontCategory = 'sans' | 'serif' | 'mono' | 'display' | 'handwriting'

const FAMILY_CATEGORIES: Record<string, FontCategory> = {
  // Sans-serif
  'Roboto': 'sans',
  'Open Sans': 'sans',
  'Inter': 'sans',
  'Lato': 'sans',
  'Montserrat': 'sans',
  // Serif
  'Merriweather': 'serif',
  'Playfair Display': 'serif',
  'Lora': 'serif',
  'PT Serif': 'serif',
  'Noto Serif': 'serif',
  // Display
  'Oswald': 'display',
  'Bebas Neue': 'display',
  'Anton': 'display',
  'Lobster': 'display',
  'Pacifico': 'display',
  // Handwriting
  'Dancing Script': 'handwriting',
  'Caveat': 'handwriting',
  'Shadows Into Light': 'handwriting',
  'Satisfy': 'handwriting',
  'Great Vibes': 'handwriting',
  // Monospace
  'Roboto Mono': 'mono',
  'Source Code Pro': 'mono',
  'JetBrains Mono': 'mono',
  'Fira Code': 'mono',
  'Inconsolata': 'mono',
}

const DEFAULT_FALLBACKS: Record<FontCategory, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, Menlo, Consolas, monospace',
  display: 'Impact, "Arial Black", system-ui, sans-serif',
  handwriting: '"Segoe Script", "Brush Script MT", cursive',
}

export type FontProvider = 'google' | 'bunny'

export interface UseFontOptions {
  /**
   * A single font family name, e.g. `"Roboto"` or `"Open Sans"`.
   *
   * For fallback fonts, use the `fallback` option instead of a
   * comma-separated list here.
   */
  family: string
  /** CSS fallback list appended to the `font-family` declaration. */
  fallback?: string
  /**
   * Font provider used to build the stylesheet URL when `url` is omitted.
   * Bunny Fonts is a drop-in, privacy-friendly Google Fonts mirror.
   * @default 'google'
   */
  provider?: FontProvider
  /**
   * Stylesheet URL. When provided, used as-is for the `<link href>`.
   * When omitted, a URL is built from `provider`, `family`, `weights`,
   * `display` and `styles`.
   */
  url?: string
  /** Font weights to load. Ignored when `url` is provided. */
  weights?: number[]
  /** `font-display` value. Ignored when `url` is provided. */
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
  /** Font styles to load. Ignored when `url` is provided. */
  styles?: Array<'normal' | 'italic'>
}

const PROVIDER_BASE_URL: Record<FontProvider, string> = {
  google: 'https://fonts.googleapis.com/css2',
  bunny: 'https://fonts.bunny.net/css2',
}

function slugify(family: string): string {
  return family
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function buildProviderUrl(opts: Required<Omit<UseFontOptions, 'url' | 'fallback'>>): string {
  const familyParam = opts.family.trim().replace(/\s+/g, '+')
  const weights = [...opts.weights].sort((a, b) => a - b)
  const hasItalic = opts.styles.includes('italic')
  const hasNormal = opts.styles.includes('normal')

  const axis = hasItalic
    ? `:ital,wght@${weights.flatMap(w => [
        ...(hasNormal ? [`0,${w}`] : []),
        `1,${w}`,
      ]).join(';')}`
    : `:wght@${weights.join(';')}`

  return `${PROVIDER_BASE_URL[opts.provider]}?family=${familyParam}${axis}&display=${opts.display}`
}

/**
 * Register a font for the current email template.
 *
 * Builds a Google Fonts stylesheet URL from `family`/`weights`/`display`/`styles`
 * (or uses `url` as-is). The renderer injects a `<link>` tag into `<head>`
 * and merges `--font-{slug}` declarations into the template's existing
 * `@import "tailwindcss"` style block so a `font-{slug}` utility class
 * is generated. If no Tailwind import is found, falls back to a `:root`
 * declaration so the CSS variable is still available.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * useFont({ family: 'Roboto', fallback: 'Verdana, sans-serif', weights: [400, 600] })
 * ```
 */
export function useFont(options: UseFontOptions): void {
  const ctx = inject(RenderContextKey)
  if (!ctx) return

  ctx.fonts = ctx.fonts ?? []
  if (ctx.fonts.some(f => f.family === options.family)) return

  const url = options.url ?? buildProviderUrl({
    family: options.family,
    provider: options.provider ?? 'google',
    weights: options.weights ?? [400],
    display: options.display ?? 'swap',
    styles: options.styles ?? ['normal'],
  })

  const fallback = options.fallback
    ?? DEFAULT_FALLBACKS[FAMILY_CATEGORIES[options.family] ?? 'sans']
  const quoted = /\s/.test(options.family) ? `"${options.family}"` : options.family
  const declaration = `${quoted}, ${fallback}`

  ctx.fonts.push({
    family: options.family,
    slug: slugify(options.family),
    declaration,
    url,
  })
}
