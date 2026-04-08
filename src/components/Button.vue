<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { PropType } from 'vue'
import { twMerge } from 'tailwind-merge'
import Outlook from './Outlook.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /** The URL the button links to. */
  href: String,
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
   * Background color for `solid` and `outline` variants.
   * Also used as the text color for `outline` and `ghost` variants when `color` is not set.
   * @default '#4338ca'
   */
  bgColor: {
    type: String,
    default: '#4338ca'
  },
  /**
   * Explicit text color. When omitted, `solid` buttons use `#fffffe`
   * and all other variants fall back to `bgColor`.
   * @default null
   */
  color: {
    type: String,
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
  }
})

const parsedIconWidth = computed(() => parseInt(String(props.iconWidth), 10))

const alignClass = computed(() => props.align ? ({
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
})[props.align] || '' : '')

const textColor = computed(() => {
  if (props.color) return props.color

  return props.variant === 'solid' ? '#fffffe' : props.bgColor
})

const styles = computed(() => {
  if (props.variant === 'link') {
    return [
      'text-decoration: none;',
      `color: ${textColor.value};`,
    ].join('')
  }

  const base = [
    'display: inline-block;',
    'text-decoration: none;',
    'padding: 16px 24px;',
    'font-size: 16px;',
    'line-height: 1;',
    'border-radius: 4px;',
    `color: ${textColor.value};`,
  ]

  if (props.variant === 'outline') {
    base.push(
      'background-color: transparent;',
      `border: 1px solid ${props.bgColor};`,
    )
  } else if (props.variant === 'ghost') {
    base.push('background-color: transparent;')
  } else {
    base.push(`background-color: ${props.bgColor};`)
  }

  return base.join('')
})

const isLink = computed(() => props.variant === 'link')

const defaultClasses = computed(() => {
  if (props.variant === 'ghost') return 'hover:bg-indigo-50'
  return ''
})

const mergedClass = computed(() => twMerge(defaultClasses.value, attrs.class as string))
</script>

<template>
  <div :class="alignClass">
    <a
      v-bind="{ ...$attrs, class: undefined }"
      :href="href"
      :style="styles"
      :class="mergedClass"
    >
      <template v-if="!isLink">
        <Outlook><i class="mso-font-width-[150%]" :style="`mso-text-raise: ${msoPb};`" hidden>&emsp;</i></Outlook>
        <template v-if="icon && iconPosition === 'left'">
          <span :style="`mso-text-raise: ${msoPt}`">
            <img :src="icon" :width="parsedIconWidth" :class="`align-baseline max-w-full ${iconClass}`">
          </span>
          <Outlook><i class="mso-font-width-[30%]" hidden>&emsp;&#8203;</i></Outlook>
        </template>
        <span :class="icon ? (iconPosition === 'right' ? 'mr-2' : 'ml-2') : ''" :style="`mso-text-raise: ${msoPt}`"><slot /></span>
        <template v-if="icon && iconPosition === 'right'">
          <Outlook><i class="mso-font-width-[30%]" hidden>&emsp;&#8203;</i></Outlook>
          <span :style="`mso-text-raise: ${msoPt}`">
            <img :src="icon" :width="parsedIconWidth" :class="`align-baseline max-w-full ${iconClass}`">
          </span>
        </template>
        <Outlook><i class="mso-font-width-[150%]" hidden>&emsp;&#8203;</i></Outlook>
      </template>
      <template v-else>
        <slot />
      </template>
    </a>
  </div>
</template>
