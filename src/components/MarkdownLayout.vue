<script setup lang="ts">
import type { PropType } from 'vue'
import Layout from './Layout.vue'
import Container from './Container.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  /**
   * Frontmatter object — wired in automatically when this layout
   * wraps a `.md` template (the default behavior, or via the
   * `layout: MarkdownLayout` frontmatter key).
   *
   * Keys matching `Layout`'s props (`lang`, `dir`, `bodyClass`,
   * `doubleHead`, `ariaLabel`, `outlookFallback`) flow through to
   * the wrapped `Layout`. Missing keys fall back to `Layout`'s
   * own defaults.
   */
  frontmatter: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => ({})
  },
})
</script>

<template>
  <Layout
    :lang="props.frontmatter.lang as string | undefined"
    :dir="props.frontmatter.dir as 'ltr' | 'rtl' | undefined"
    :body-class="props.frontmatter.bodyClass as string | undefined"
    :double-head="props.frontmatter.doubleHead as boolean | string | undefined"
    :aria-label="props.frontmatter.ariaLabel as string | undefined"
    :outlook-fallback="props.frontmatter.outlookFallback as boolean | undefined"
  >
    <Container class="max-w-xl">
      <slot />
    </Container>
  </Layout>
</template>
