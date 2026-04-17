<script setup lang="ts">
import type { PropType } from 'vue'

defineOptions({ inheritAttrs: false })

defineProps({
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
   * Accessible label for the email article wrapper.
   *
   * Used as the `aria-label` on the inner `<div role="article">`.
   *
   * @example 'Order confirmation'
   */
  ariaLabel: {
    type: String,
    default: undefined
  }
})
</script>

<template>
  <html :lang="lang" :dir="dir" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office">
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <style>
        td,th,div,p,a,h1,h2,h3,h4,h5,h6 {font-family: "Segoe UI", sans-serif; mso-line-height-rule: exactly;}
        .mso-break-all {word-break: break-all;}
      </style>
      <![endif]-->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" media="screen">
    <style>
      @import "@maizzle/tailwindcss";

      img {
        @apply max-w-full align-middle;
      }
    </style>
  </head>
  <body :xml:lang="lang" :class="['m-0 p-0 size-full [word-break:break-word]', bodyClass]">
    <div
      role="article"
      aria-roledescription="email"
      :aria-label="ariaLabel"
      :lang="lang"
      :dir="dir"
      style="font-size: medium;"
      :class="['[font-size:max(16px,1rem)] font-inter', $attrs.class]"
    >
      <slot />
    </div>
  </body>
  </html>
</template>
