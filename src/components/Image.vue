<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /** The image source URL. When motionSrc is used, this becomes the static fallback. */
  src: {
    type: String,
    required: true
  },
  /** Alt text for the image. */
  alt: {
    type: String,
    default: ''
  },
  /** Image source for dark mode. */
  darkSrc: {
    type: String,
    default: null
  },
  /** The width of the image, rendered without units. */
  width: {
    type: [String, Number],
    required: true
  },
  /** Animated image source, shown when user has no reduced motion preference. */
  motionSrc: {
    type: String,
    default: null
  }
})

function mimeFromExtension(src: string): string {
  const ext = src.split('.').pop()?.toLowerCase() ?? ''

  const types: Record<string, string> = {
    apng: 'image/apng',
    avif: 'image/avif',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    jfif: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  }

  return types[ext] ?? ''
}

const motionType = computed(() => mimeFromExtension(props.motionSrc ?? ''))

const imgWidth = computed(() => Number.parseInt(String(props.width), 10))

const usePicture = computed(() => props.darkSrc || props.motionSrc)

const imgStyle = 'max-width: 100%; vertical-align: middle;'
</script>

<template>
  <picture v-if="usePicture">
    <source v-if="darkSrc" :srcset="darkSrc" media="(prefers-color-scheme: dark)">
    <source v-if="motionSrc" :srcset="motionSrc" :type="motionType || undefined" media="(prefers-reduced-motion: no-preference)">
    <img v-bind="attrs" :src="src" :alt="alt" :width="imgWidth" :style="imgStyle">
  </picture>
  <img v-else v-bind="attrs" :src="src" :alt="alt" :width="imgWidth" :style="imgStyle">
</template>
