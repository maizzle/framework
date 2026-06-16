<script setup lang="ts">
import { computed, useAttrs, createStaticVNode, type PropType } from 'vue'
import { twMerge } from 'tailwind-merge'
import { outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  /**
   * Classes to add to the `<body>` tag.
   */
  bodyClass: {
    type: String,
    default: ''
  },
  /**
   * Language code for the `lang` and `xml:lang` attributes.
   *
   * @default 'en'
   */
  lang: {
    type: String,
    default: 'en'
  },
  /**
   * Text direction.
   *
   * @default 'ltr'
   */
  dir: {
    type: String as PropType<'ltr' | 'rtl'>,
    default: 'ltr'
  },
  /**
   * Render an empty `<head>` before the main head element.
   *
   * This is a workaround for Yahoo! Mail on Android, which
   * strips the first `<head>` element it finds.
   *
   * @default false
   */
  doubleHead: {
    type: [Boolean, String],
    default: false
  },
  /**
   * Accessible label for the email article wrapper.
   *
   * Used as the `aria-label` on the inner `<div role="article">`.
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

const attrs = useAttrs()
const bodyMergedClass = computed(() => twMerge('m-0 p-0 size-full [word-break:break-word]', props.bodyClass))
const articleMergedClass = computed(() => twMerge('[font-size:max(16px,1rem)] font-inter', attrs.class as string))

const EmptyHead = () => createStaticVNode('<head></head>', 1)

const MsoHead = () => createStaticVNode(
  `<!--[if mso]>
    <style>
      td,th,div,p,a,h1,h2,h3,h4,h5,h6 {font-family: "Segoe UI", sans-serif; mso-line-height-rule: exactly;}
      .mso-break-all {word-break: break-all;}
    </style>
  <![endif]-->`,
  1
)

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

const htmlXmlns = computed(() => outlookFallback ? {
  'xmlns:v': 'urn:schemas-microsoft-com:vml',
  'xmlns:o': 'urn:schemas-microsoft-com:office:office',
} : {})
</script>

<template>
  <html :lang="lang" :dir="dir" v-bind="htmlXmlns">
  <EmptyHead v-if="props.doubleHead === true || props.doubleHead === 'true'" />
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <MsoHead v-if="outlookFallback" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" media="screen">
    <style>
      @import "@maizzle/tailwindcss";

      img {
        @apply max-w-full align-middle;
      }
    </style>
  </head>
  <body :xml:lang="outlookFallback ? lang : null" :class="bodyMergedClass">
    <span v-if="outlookFallback" style="display: none" v-html="msoBody"></span>
    <div
      role="article"
      aria-roledescription="email"
      :aria-label="ariaLabel"
      :lang="lang"
      :dir="dir"
      style="font-size: medium;"
      data-juice-duplicates
      v-bind="{ ...attrs, class: undefined }"
      :class="articleMergedClass"
    >
      <slot />
    </div>
  </body>
  </html>
</template>
