<script setup lang="ts">
import { createStaticVNode, inject, useAttrs, useSlots } from 'vue'
import type { PropType } from 'vue'
import { outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const slots = useSlots()

const props = defineProps({
  /**
   * Language code for the `xml:lang` attribute on `<body>`.
   *
   * Inherited from the parent `Html` component's `lang` prop by default.
   *
   * @example 'fr'
   */
  xmlLang: {
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
    default: undefined
  },
  /**
   * Text direction of the body.
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
   * Accessible label for the email article wrapper.
   *
   * Used as the `aria-label` on the inner `<div role="article">`.
   * Helps screen readers identify the email content.
   *
   * @example 'Order confirmation'
   */
  ariaLabel: {
    type: String,
    default: undefined
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
})

const outlookFallback = useOutlookFallback(props.outlookFallback)

const htmlLang = inject<string>('htmlLang', 'en')

const msoBody = `<!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    <w:WordDocument>
      <w:DontUseAdvancedTypographyReadingMail />
    </w:WordDocument>
  </xml>
<![endif]-->`

const render = () => {
  const extraAttrs = Object.entries(attrs)
    .map(([key, value]) => value === true ? key : `${key}="${value}"`)
    .join(' ')

  const lang = props.xmlLang ?? htmlLang

  const parts = [
    `dir="${props.dir}"`,
    'style="margin: 0; padding: 0; width: 100%; height: 100%; word-break: break-word;"',
  ]
  if (outlookFallback) {
    parts.unshift(`xml:lang="${lang}"`)
  }

  if (extraAttrs) {
    parts.push(extraAttrs)
  }

  const articleParts = [
    'role="article"',
    'aria-roledescription="email"',
    props.ariaLabel ? `aria-label="${props.ariaLabel}"` : '',
    `lang="${lang}"`,
    `dir="${props.dir}"`,
    'style="font-size: medium; font-size: max(16px, 1rem)"',
  ].filter(Boolean).join(' ')

  return [
    createStaticVNode(`<body ${parts.join(' ')}>`, 1),
    outlookFallback ? createStaticVNode(`<span style="display: none">${msoBody}</span>`, 1) : null,
    createStaticVNode(`<div ${articleParts}>`, 1),
    slots.default?.(),
    createStaticVNode('</div>', 1),
    createStaticVNode('</body>', 1),
  ]
}
</script>

<template>
  <render />
</template>
