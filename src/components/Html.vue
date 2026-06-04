<script setup lang="ts">
import { createStaticVNode, inject, provide, useAttrs, useSlots } from 'vue'
import type { PropType } from 'vue'
import { outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'
import { RenderContextKey } from '../composables/renderContext'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const slots = useSlots()

const props = defineProps({
  /**
   * Language code for the `lang` attribute on `<html>`.
   *
   * Also provided to the child `Body` component for `xml:lang`.
   *
   * @default 'en'
   */
  lang: {
    type: String as PropType<
      | 'af' | 'ar' | 'az'
      | 'be' | 'bg' | 'bs'
      | 'ca' | 'cs' | 'cy'
      | 'da' | 'de' | 'dv'
      | 'el' | 'en' | 'es' | 'et' | 'eu'
      | 'fa' | 'fi' | 'fo' | 'fr'
      | 'gl' | 'gu'
      | 'he' | 'hi' | 'hr' | 'hu' | 'hy'
      | 'id' | 'is' | 'it'
      | 'ja'
      | 'ka' | 'kk' | 'kn' | 'ko' | 'ky'
      | 'lt' | 'lv'
      | 'mk' | 'mn' | 'mr' | 'ms' | 'mt'
      | 'nb' | 'nl' | 'nn' | 'no'
      | 'pa' | 'pl' | 'pt'
      | 'ro' | 'ru'
      | 'sa' | 'se' | 'sk' | 'sl' | 'sq' | 'sr' | 'sv' | 'sw'
      | 'ta' | 'te' | 'th' | 'tr' | 'tt'
      | 'uk' | 'ur' | 'uz'
      | 'vi'
      | 'zh'
      | (string & {})
    >,
    default: 'en'
  },
  /**
   * Text direction of the document.
   *
   * - `ltr` — left to right (default)
   * - `rtl` — right to left
   *
   * @default 'ltr'
   */
  dir: {
    type: String as PropType<'ltr' | 'rtl'>,
    default: 'ltr'
  },
  /**
   * Whether to include VML and Office XML namespace declarations.
   *
   * Required for Outlook VML support (background images, etc.).
   * Set to `false` to omit the `xmlns:v` and `xmlns:o` attributes.
   *
   * @default true
   */
  xmlns: {
    type: [Boolean, String],
    default: true
  },
  /**
   * Toggle Outlook (MSO) and VML fallback markup for this
   * component and all descendants.
   *
   * When `false`, skips MSO ghost tables, VML shapes,
   * `xmlns:v`/`xmlns:o` attributes, and mso-specific CSS
   * in all built-in components.
   *
   * @default true
   */
  outlookFallback: outlookFallbackProp,
  /**
   * DOCTYPE declaration prepended to the rendered HTML.
   *
   * Overrides `doctype` in the Maizzle config and any value
   * set via `useDoctype()` in the same template.
   *
   * @default '<!DOCTYPE html>'
   */
  doctype: {
    type: String,
    default: undefined,
  },
})

const outlookFallback = useOutlookFallback(props.outlookFallback)

if (props.doctype !== undefined) {
  const ctx = inject(RenderContextKey, undefined)
  if (ctx) ctx.doctype = props.doctype
}

provide('htmlLang', props.lang)

const render = () => {
  const extraAttrs = Object.entries(attrs)
    .map(([key, value]) => value === true ? key : `${key}="${value}"`)
    .join(' ')

  const parts = [
    `lang="${props.lang}"`,
    `dir="${props.dir}"`,
  ]

  if (outlookFallback && props.xmlns !== false && props.xmlns !== 'false') {
    parts.push(
      'xmlns:v="urn:schemas-microsoft-com:vml"',
      'xmlns:o="urn:schemas-microsoft-com:office:office"',
    )
  }

  if (extraAttrs) {
    parts.push(extraAttrs)
  }

  return [
    createStaticVNode(`<html ${parts.join(' ')}>`, 1),
    slots.default?.(),
    createStaticVNode('</html>', 1),
  ]
}
</script>

<template>
  <render />
</template>
