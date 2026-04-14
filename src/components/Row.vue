<script setup lang="ts">
import { Comment, computed, createStaticVNode, inject, provide, useAttrs, useSlots, Fragment } from 'vue'
import type { ComputedRef, VNode } from 'vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /** Override the inherited container width. */
  width: {
    type: [String, Number],
    default: null
  },
  /** Override the auto-detected column count. */
  cols: {
    type: Number,
    default: null
  }
})

const slots = useSlots()

function countChildren(vnodes: VNode[]): number {
  let count = 0

  for (const vnode of vnodes) {
    if (vnode.type === Fragment && Array.isArray(vnode.children)) {
      count += countChildren(vnode.children as VNode[])
    } else if (vnode.type !== Comment && typeof vnode.type !== 'symbol') {
      count++
    }
  }

  return count
}

const columnCount = computed(() => {
  if (props.cols) return props.cols

  const children = slots.default?.() ?? []
  return countChildren(children) || 1
})

const containerWidth = inject<ComputedRef<string | number> | null>('containerWidth', null)

const rowWidth = computed(() => props.width ?? containerWidth?.value ?? '37.5em')

function divideValue(value: string | number, divisor: number): string {
  if (typeof value === 'number') {
    return `${parseFloat((value / divisor).toFixed(2))}px`
  }

  const num = Number.parseFloat(value)
  const unit = value.replace(String(num), '') || 'px'

  return `${parseFloat((num / divisor).toFixed(2))}${unit}`
}

provide('columnMinWidth', computed(() => divideValue(rowWidth.value, columnCount.value)))
provide('columnMsoWidth', computed(() => `${Math.round(100 / columnCount.value)}%`))

const MsoBefore = () => createStaticVNode(
  '<!--[if mso]><table role="none" cellpadding="0" cellspacing="0" width="100%"><tr><![endif]-->',
  1
)

const MsoAfter = () => createStaticVNode(
  '<!--[if mso]></tr></table><![endif]-->',
  1
)
</script>

<template>
  <MsoBefore />
  <div v-bind="attrs" style="font-size: 0;">
    <slot />
  </div>
  <MsoAfter />
</template>
