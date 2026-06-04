<script setup lang="ts">
import { computed, useAttrs, createStaticVNode } from 'vue'
import type { PropType } from 'vue'
import { twMerge } from 'tailwind-merge'
import { outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /** The URL the button links to. */
  href: {
    type: String,
    required: true
  },
  /**
   * The button style variant.
   * - `solid` — filled background (default)
   * - `outline` — transparent background with a border
   * - `ghost` — transparent background, no border
   * - `link` — plain anchor with no button chrome
   * @default 'solid'
   */
  variant: {
    type: String as PropType<'solid' | 'outline' | 'ghost' | 'link'>,
    default: 'solid' as const
  },
  /**
   * Horizontal alignment of the button wrapper.
   * Accepts `'left'`, `'center'`, or `'right'`.
   * @default null
   */
  align: {
    type: String as PropType<'left' | 'center' | 'right' | null>,
    default: null
  },
  /**
   * `mso-text-raise` value applied to the inner `<span>` elements.
   * Controls vertical text alignment inside the button in old Outlook.
   * @default '16px'
   */
  msoPt: {
    type: String,
    default: '16px'
  },
  /**
   * `mso-text-raise` value applied to the spacer `<i>` element rendered for Outlook.
   * Adjusts the bottom spacing that old Outlook uses to simulate padding.
   * @default '31px'
   */
  msoPb: {
    type: String,
    default: '31px'
  },
  /**
   * URL or path to an icon image displayed alongside the button label.
   * @default null
   */
  icon: {
    type: String,
    default: null
  },
  /**
   * Width of the icon image in pixels.
   * @default 12
   */
  iconWidth: {
    type: [String, Number],
    default: 12
  },
  /**
   * Side on which the icon is placed relative to the button label.
   * Accepts `'left'` or `'right'`.
   * @default 'right'
   */
  iconPosition: {
    type: String as PropType<'left' | 'right'>,
    default: 'right' as const
  },
  /**
   * Additional CSS classes applied to the icon `<img>` element.
   * @default ''
   */
  iconClass: {
    type: String,
    default: ''
  },
  /**
   * Alt text for the icon image.
   * @default ''
   */
  iconAlt: {
    type: String,
    default: ''
  },
  /**
   * Horizontal padding in old Outlook, applied as `mso-font-width` on the
   * outer spacer `<i>` elements. Accepts a number, a numeric string, or a
   * string with `%`. Bare numbers are treated as percentages. Effective
   * range up to 500%.
   * @default 150
   */
  msoPx: {
    type: [String, Number],
    default: 150
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

const parsedIconWidth = computed(() => parseInt(String(props.iconWidth), 10))

const alignClass = computed(() => props.align ? ({
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
})[props.align] || '' : '')

const baseClasses = computed(() => {
  if (props.variant === 'link') {
    return 'no-underline text-gray-950'
  }

  const classes = [
    'inline-block',
    'no-underline',
    'px-6',
    'py-4',
    'text-base',
    'leading-none',
    'rounded',
  ]

  if (props.variant === 'outline') {
    classes.push('bg-transparent', 'border', 'border-solid', 'border-indigo-700', 'text-indigo-700')
  } else if (props.variant === 'ghost') {
    classes.push('bg-transparent', 'text-indigo-700', 'hover:bg-indigo-50')
  } else {
    classes.push('bg-indigo-700', 'text-white')
  }

  return classes.join(' ')
})

const isLink = computed(() => props.variant === 'link')

const mergedClass = computed(() => twMerge(baseClasses.value, attrs.class as string))

const textSpanStyle = computed(() =>
  outlookFallback ? `mso-text-raise: ${props.msoPt};` : undefined,
)

const msoPx = computed(() => {
  const v = String(props.msoPx).trim()
  // Bare number → percentage. Anything with a unit passes through.
  return /^\d+(\.\d+)?$/.test(v) ? `${v}%` : v
})

/**
 * Outlook spacer `<i>` elements rendered as raw HTML inside MSO conditional
 * comments. JS strings keep `&emsp;` / `&#8203;` from being decoded by
 * Vue's template parser; htmlparser2 then preserves the comment
 * data verbatim because conditional comments are opaque.
 */
const MsoSpacerLeft = () => createStaticVNode(
  `<!--[if mso]><i style="mso-font-width: ${msoPx.value}; mso-text-raise: ${props.msoPb};" hidden>&emsp;</i><![endif]-->`,
  1,
)

const MsoSpacerRight = () => createStaticVNode(
  `<!--[if mso]><i style="mso-font-width: ${msoPx.value};" hidden>&emsp;&#8203;</i><![endif]-->`,
  1,
)

const MsoIconGap = () => createStaticVNode(
  `<!--[if mso]><i style="mso-font-width: 30%;" hidden>&emsp;&#8203;</i><![endif]-->`,
  1,
)
</script>

<template>
  <div :class="alignClass">
    <a
      v-bind="{ ...$attrs, class: undefined, style: undefined }"
      :href="href"
      :style="$attrs.style as any"
      :class="mergedClass"
    >
      <template v-if="!isLink">
        <MsoSpacerLeft v-if="outlookFallback" />
        <template v-if="icon && iconPosition === 'left'">
          <span :style="textSpanStyle">
            <img :src="icon" :width="parsedIconWidth" :alt="iconAlt" style="vertical-align: baseline; max-width: 100%;" :class="iconClass">
          </span>
          <MsoIconGap v-if="outlookFallback" />
        </template>
        <span :style="textSpanStyle"><slot /></span>
        <template v-if="icon && iconPosition === 'right'">
          <MsoIconGap v-if="outlookFallback" />
          <span :style="textSpanStyle">
            <img :src="icon" :width="parsedIconWidth" :alt="iconAlt" style="vertical-align: baseline; max-width: 100%;" :class="iconClass">
          </span>
        </template>
        <MsoSpacerRight v-if="outlookFallback" />
      </template>
      <template v-else>
        <slot />
      </template>
    </a>
  </div>
</template>
