<script setup lang="ts">
import { useSlots, computed } from 'vue'

const props = defineProps({
  /**
   * Explicit number of filler sequences to render. When omitted, the count
   * is auto-derived to fill our default 200-char inbox preview budget.
   */
  spaces: {
    type: Number,
    default: undefined,
  },
})

const slots = useSlots()

function vnodesToText(nodes: unknown): string {
  if (nodes == null || nodes === false || nodes === true) return ''
  if (typeof nodes === 'string' || typeof nodes === 'number') return String(nodes)
  if (Array.isArray(nodes)) return nodes.map(vnodesToText).join('')
  if (typeof nodes === 'object' && 'children' in (nodes as Record<string, unknown>)) {
    return vnodesToText((nodes as { children: unknown }).children)
  }
  return ''
}

/**
 * Inbox preview budget. Pad with invisible fillers so the client
 * doesn't pull body content into the snippet.
 */
const PREVIEW_LENGTH = 200

const text = computed(() => vnodesToText(slots.default?.()))
const fillerCount = computed(() =>
  props.spaces !== undefined
    ? Math.max(0, props.spaces)
    : Math.max(0, PREVIEW_LENGTH - text.value.length),
)
</script>

<template>
  <Teleport to="body:start">
    <div style="display: none">{{ text }}<template v-for="i in fillerCount" :key="i">&#8199;&#65279;&#847; </template>&nbsp;</div>
  </Teleport>
</template>
