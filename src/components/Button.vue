<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { twMerge } from 'tailwind-merge'
import Outlook from './Outlook.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /** The URL the button links to. */
  href: String,
  type: {
    type: String,
    default: 'solid'
  },
  align: {
    type: String,
    default: null
  },
  bgColor: {
    type: String,
    default: '#4338ca'
  },
  color: {
    type: String,
    default: null
  },
  msoPt: {
    type: String,
    default: '16px'
  },
  msoPb: {
    type: String,
    default: '31px'
  },
  icon: {
    type: String,
    default: null
  },
  iconWidth: {
    type: [String, Number],
    default: 12
  },
  iconPosition: {
    type: String,
    default: 'right'
  },
  iconClass: {
    type: String,
    default: ''
  }
})

const parsedIconWidth = computed(() => parseInt(String(props.iconWidth), 10))

const alignClass = computed(() => ({
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
})[props.align] || '')

const textColor = computed(() => {
  if (props.color) return props.color

  return props.type === 'solid' ? '#fffffe' : props.bgColor
})

const styles = computed(() => {
  if (props.type === 'link') {
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

  if (props.type === 'outline') {
    base.push(
      'background-color: transparent;',
      `border: 1px solid ${props.bgColor};`,
    )
  } else if (props.type === 'ghost') {
    base.push('background-color: transparent;')
  } else {
    base.push(`background-color: ${props.bgColor};`)
  }

  return base.join('')
})

const isLink = computed(() => props.type === 'link')

const defaultClasses = computed(() => {
  if (props.type === 'ghost') return 'hover:bg-indigo-50'
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
