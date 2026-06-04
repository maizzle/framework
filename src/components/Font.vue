<script setup lang="ts">
import { type PropType } from 'vue'
import { useFont } from '../composables/useFont'

type PopularGoogleFont =
  // Sans-serif
  | 'Roboto' | 'Open Sans' | 'Inter' | 'Lato' | 'Montserrat'
  // Serif
  | 'Merriweather' | 'Playfair Display' | 'Lora' | 'PT Serif' | 'Noto Serif'
  // Display
  | 'Oswald' | 'Bebas Neue' | 'Anton' | 'Lobster' | 'Pacifico'
  // Handwriting
  | 'Dancing Script' | 'Caveat' | 'Shadows Into Light' | 'Satisfy' | 'Great Vibes'
  // Monospace
  | 'Roboto Mono' | 'Source Code Pro' | 'JetBrains Mono' | 'Fira Code' | 'Inconsolata'

const props = defineProps({
  /**
   * A single font family name, e.g. `"Roboto"` or `"Open Sans"`.
   *
   * For fallback fonts, use the `fallback` prop instead of a
   * comma-separated list here. Popular Google Fonts are suggested
   * in the IDE, but any string is accepted.
   *
   * @example "Open Sans"
   */
  family: {
    type: String as PropType<PopularGoogleFont | (string & {})>,
    required: true,
    validator: (v: string) => v.trim().length > 0,
  },
  /**
   * CSS fallback list appended to the `font-family` declaration.
   *
   * @example "Verdana, sans-serif"
   */
  fallback: {
    type: String,
    default: '',
  },
  /**
   * Font provider used to build the stylesheet URL when `url` is omitted.
   * Bunny Fonts is a drop-in, privacy-friendly Google Fonts mirror.
   */
  provider: {
    type: String as PropType<'google' | 'bunny'>,
    default: 'google',
    validator: (v: string) => ['google', 'bunny'].includes(v),
  },
  /**
   * Stylesheet URL. When provided, used as-is for the `<link href>`.
   * When omitted, a Google Fonts URL is built from `family`, `weights`,
   * `display` and `styles`.
   */
  url: {
    type: String,
    default: '',
  },
  /**
   * Font weights to load. Ignored when `url` is provided.
   */
  weights: {
    type: Array as () => number[],
    default: () => [400],
  },
  /**
   * `font-display` value. Ignored when `url` is provided.
   */
  display: {
    type: String as PropType<'auto' | 'block' | 'swap' | 'fallback' | 'optional'>,
    default: 'swap',
    validator: (v: string) => ['auto', 'block', 'swap', 'fallback', 'optional'].includes(v),
  },
  /**
   * Font styles to load. Ignored when `url` is provided.
   *
   * @example ['normal', 'italic']
   */
  styles: {
    type: Array as () => Array<'normal' | 'italic'>,
    default: () => ['normal'],
  },
})

useFont({
  family: props.family,
  fallback: props.fallback || undefined,
  provider: props.provider,
  url: props.url || undefined,
  weights: props.weights,
  display: props.display,
  styles: props.styles,
})
</script>

<template></template>
