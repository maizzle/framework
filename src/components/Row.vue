<script lang="ts">
const warnedLocations = new Set<string>()
</script>

<script setup lang="ts">
import { Comment, Text, computed, createStaticVNode, provide, useAttrs, useSlots, Fragment } from 'vue'
import type { VNode } from 'vue'
import { twMerge } from 'tailwind-merge'
import Column from './Column.vue'
import { hasWidthInStyle, hasWidthUtility, normalizeToPixels, outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Explicit row width.
   *
   * Used as the width source for column min-width calculation.
   * When not set, the nearest sized ancestor (`Container`, `Section`,
   * outer `Column`, or this row's own width class/inline style) is
   * used instead.
   */
  width: {
    type: [String, Number],
    default: null
  },
  /**
   * Override the auto-detected column count.
   *
   * By default, the number of direct child elements is used.
   * Set this when the auto-detection doesn't match your layout
   * (e.g. when using `v-if` or `v-for`).
   */
  cols: {
    type: Number,
    default: null
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

function hasColumnChild(vnodes: VNode[]): boolean {
  for (const vnode of vnodes) {
    if (vnode.type === Fragment && Array.isArray(vnode.children)) {
      if (hasColumnChild(vnode.children as VNode[])) return true
    } else if (vnode.type === Column) {
      return true
    } else if (
      typeof vnode.type === 'object'
      && vnode.type !== null
      && '__name' in vnode.type
      && (vnode.type as { __name?: string }).__name === 'Column'
    ) {
      return true
    }
  }
  return false
}

function hasMeaningfulContent(vnodes: VNode[]): boolean {
  for (const vnode of vnodes) {
    if (vnode.type === Comment) continue
    if (vnode.type === Fragment && Array.isArray(vnode.children)) {
      if (hasMeaningfulContent(vnode.children as VNode[])) return true
      continue
    }
    if (vnode.type === Text) {
      if (typeof vnode.children === 'string' && vnode.children.trim()) return true
      continue
    }
    if (typeof vnode.type === 'symbol') continue
    return true
  }
  return false
}

const columnCount = computed(() => {
  if (props.cols) return props.cols

  const children = slots.default?.() ?? []
  return countChildren(children) || 1
})

provide('columnCount', columnCount)

const userStyle = computed(() => {
  const s = attrs.style
  if (!s) return ''
  return typeof s === 'object'
    ? Object.entries(s).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')
    : String(s)
})

const userHasWidth = computed(() => {
  const cls = (attrs.class as string) ?? ''
  return hasWidthUtility(cls) || hasWidthInStyle(userStyle.value)
})

const colWidthSource = computed(() => {
  if (props.width != null) return normalizeToPixels(props.width)
  if (userHasWidth.value) return ''
  return null
})

const restAttrs = computed(() => {
  const { style: _, class: __, 'data-maizzle-loc': ___, ...rest } = attrs
  return rest
})

/**
 * `font-size: 0;` removes the whitespace gap between inline-block
 * children. Lives in a class so users can override (e.g. via a custom
 * `text-*`) and twMerge resolves the conflict cleanly instead of the
 * inline declaration silently shadowing the user's class.
 */
const baseClass = 'text-0'
const mergedClass = computed(() => twMerge(baseClass, (attrs.class as string) ?? ''))

const divStyle = computed(() => userStyle.value || undefined)

const MsoBefore = () => createStaticVNode(
  '<!--[if mso]><table role="none" cellpadding="0" cellspacing="0" style="width: 100%"><tr><![endif]-->',
  1
)

const MsoAfter = () => createStaticVNode(
  '<!--[if mso]></tr></table><![endif]-->',
  1
)

const initialChildren = slots.default?.() ?? []
if (hasMeaningfulContent(initialChildren) && !hasColumnChild(initialChildren)) {
  const loc = (attrs['data-maizzle-loc'] as string | undefined) ?? '<unknown location>'
  if (!warnedLocations.has(loc)) {
    warnedLocations.add(loc)
    const display = loc.split('/').pop() ?? loc
    const suffix = outlookFallback ? ' Layout will break in Outlook.' : ''
    console.warn(`[maizzle] <Row> in ${display} has no <Column> inside it.${suffix}`)
  }
}
</script>

<template>
  <MsoBefore v-if="outlookFallback" />
  <div
    v-bind="restAttrs"
    :class="mergedClass"
    :style="divStyle"
    :data-maizzle-cw="colWidthSource"
  >
    <slot />
  </div>
  <MsoAfter v-if="outlookFallback" />
</template>
