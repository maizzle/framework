<script setup lang="ts">
import { createStaticVNode, inject, useAttrs, useSlots } from 'vue'
import type { PropType } from 'vue'

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
  }
})

const htmlLang = inject<string>('htmlLang', 'en')

const render = () => {
  const extraAttrs = Object.entries(attrs)
    .map(([key, value]) => value === true ? key : `${key}="${value}"`)
    .join(' ')

  const lang = props.xmlLang ?? htmlLang

  const parts = [
    `xml:lang="${lang}"`,
    `dir="${props.dir}"`,
    'style="margin: 0; padding: 0; width: 100%; word-break: break-word;"',
  ]

  if (extraAttrs) {
    parts.push(extraAttrs)
  }

  return [
    createStaticVNode(`<body ${parts.join(' ')}>`, 1),
    slots.default?.(),
    createStaticVNode('</body>', 1),
  ]
}
</script>

<template>
  <render />
</template>
