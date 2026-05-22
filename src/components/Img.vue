<script setup lang="ts">
import { computed, createStaticVNode, useAttrs, type PropType } from 'vue'
import { outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'

type AspectRatio = '1:1' | '4:3' | '3:2' | '16:9' | '21:9' | '2:1' | '3:4' | '9:16' | (string & {})
type BackgroundPosition =
  | 'top' | 'right' | 'bottom' | 'left' | 'center'
  | 'top left' | 'top right' | 'top center'
  | 'bottom left' | 'bottom right' | 'bottom center'
  | 'center left' | 'center right' | 'center center'
  | (string & {})
type BackgroundSize = 'cover' | 'contain' | 'auto' | (string & {})

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
  },
  /**
   * Aspect ratio for cropped images.
   *
   * Accepts colon or slash form: `'16:9'`, `'16/9'`, `'4:3'`, `'1:1'`, etc.
   *
   * Alternatively, set a Tailwind aspect class on the component:
   * `aspect-square`, `aspect-video`, `aspect-[16/9]`, `aspect-3/2`. The
   * prop wins when both are provided.
   *
   * @example '16:9'
   * @example '4:3'
   * @example '1:1'
   */
  aspect: {
    type: String as PropType<AspectRatio>,
    default: ''
  },
  /**
   * CSS `background-position` for the cropped image fill.
   *
   * @default 'center'
   * @example 'top'
   * @example 'top left'
   * @example '20% 30%'
   */
  position: {
    type: String as PropType<BackgroundPosition>,
    default: 'center'
  },
  /**
   * CSS `background-size` for the cropped image fill.
   *
   * @default 'cover'
   * @example 'contain'
   * @example 'auto'
   */
  size: {
    type: String as PropType<BackgroundSize>,
    default: 'cover'
  },
  /**
   * Toggle Outlook (MSO) and VML fallback markup for this image.
   *
   * Only relevant in cropped mode (`aspect`). When `false`, the VML
   * `<v:rect>` shape is skipped and the modern padding-hack div renders
   * to all clients including Outlook (which will show an empty area).
   *
   * @default true
   */
  outlookFallback: outlookFallbackProp,
})

const outlookFallback = useOutlookFallback(props.outlookFallback)

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

const ASPECT_KEYWORDS: Record<string, string> = {
  'aspect-square': '1/1',
  'aspect-video': '16/9',
}

function normalizeClass(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(normalizeClass).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ')
  }
  return ''
}

/**
 * Pull Tailwind `aspect-*` tokens out of the inherited class list. Returns
 * both the derived ratio (first match wins) and the cleaned class string
 * so the aspect token isn't duplicated on the wrapper.
 */
const parsedClass = computed(() => {
  const tokens = normalizeClass(attrs.class).split(/\s+/).filter(Boolean)
  let ratio: string | null = null
  const rest: string[] = []
  for (const t of tokens) {
    if (ASPECT_KEYWORDS[t]) {
      if (!ratio) ratio = ASPECT_KEYWORDS[t]
      continue
    }
    const m = t.match(/^aspect-(?:\[(\d+(?:\.\d+)?)[/:](\d+(?:\.\d+)?)\]|(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?))$/)
    if (m) {
      if (!ratio) ratio = `${m[1] ?? m[3]}/${m[2] ?? m[4]}`
      continue
    }
    rest.push(t)
  }
  return { ratio, className: rest.join(' ') }
})

const resolvedAspect = computed(() => props.aspect || parsedClass.value.ratio || '')

const ratio = computed(() => {
  if (!resolvedAspect.value) return null
  const [w, h] = resolvedAspect.value.split(/[:/]/).map(Number)
  if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h)) return null
  const pct = ((h / w) * 100).toFixed(4).replace(/\.?0+$/, '')
  return { w, h, paddingBottom: `${pct}%` }
})

const isCropped = computed(() => ratio.value !== null)

const motionType = computed(() => mimeFromExtension(props.motionSrc ?? ''))

const imgWidth = computed(() => Number.parseInt(String(props.width), 10))

const heightPx = computed(() =>
  ratio.value && Number.isFinite(imgWidth.value)
    ? Math.round((imgWidth.value * ratio.value.h) / ratio.value.w)
    : null
)

const usePicture = computed(() => !isCropped.value && (props.darkSrc || props.motionSrc))

/**
 * Escape characters that break Tailwind's `bg-[url('...')]` arbitrary value
 * (the closing `']`, braces, spaces) and the `url()` wrapper itself (quotes,
 * parens). Targeted replace so already-encoded URLs aren't double-encoded.
 *
 * Only used for the dark/motion variant classes — those have to be Tailwind
 * arbitrary classes so they compile to `@media` rules. The base background
 * image is set inline via `:style` to avoid the CSS pipeline rewriting it.
 */
const escapeForClass = (url: string) => url
  .replace(/'/g, '%27')
  .replace(/\(/g, '%28')
  .replace(/\)/g, '%29')
  .replace(/ /g, '%20')
  .replace(/\]/g, '%5D')
  .replace(/\}/g, '%7D')

/** Escape a URL for safe use inside `url('...')` in an inline style. */
const escapeForCssUrl = (s: string) => s
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")

const escapeAttr = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const vmlAspect = computed(() => {
  if (props.size === 'cover') return 'atleast'
  if (props.size === 'contain') return 'atmost'
  return ''
})

const VmlRect = () => {
  if (!isCropped.value || !heightPx.value || !Number.isFinite(imgWidth.value)) return null
  const aspectAttr = vmlAspect.value ? ` aspect="${vmlAspect.value}"` : ''
  const altAttr = props.alt ? ` alt="${escapeAttr(props.alt)}"` : ''
  return createStaticVNode(
    `<!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false"${altAttr} style="width:${imgWidth.value}px;height:${heightPx.value}px;"><v:fill type="frame" src="${escapeAttr(props.src)}"${aspectAttr} /></v:rect><![endif]-->`,
    1
  )
}

const NotMsoBefore = () => createStaticVNode('<!--[if !mso]><!-->', 1)
const NotMsoAfter = () => createStaticVNode('<!--<![endif]-->', 1)

const imgStyle = 'max-width: 100%; vertical-align: middle;'
</script>

<template>
  <template v-if="isCropped">
    <VmlRect v-if="outlookFallback" />
    <NotMsoBefore v-if="outlookFallback" />
    <div
      v-bind="{ ...attrs, class: undefined }"
      role="img"
      :aria-label="alt || undefined"
      :class="['overflow-hidden table', parsedClass.className]"
      :style="`width: ${imgWidth}px; max-width: 100%;`"
    >
      <div
        :class="[
          'table-cell w-full h-0 bg-no-repeat',
          darkSrc ? `dark:bg-[url('${escapeForClass(darkSrc)}')]!` : '',
          motionSrc ? `motion-safe:bg-[url('${escapeForClass(motionSrc)}')]!` : '',
        ]"
        :style="{
          paddingBottom: ratio!.paddingBottom,
          backgroundImage: `url('${escapeForCssUrl(src)}')`,
          backgroundSize: size,
          backgroundPosition: position,
        }"
      />
    </div>
    <NotMsoAfter v-if="outlookFallback" />
  </template>
  <picture v-else-if="usePicture">
    <source v-if="darkSrc" :srcset="darkSrc" media="(prefers-color-scheme: dark)">
    <source v-if="motionSrc" :srcset="motionSrc" :type="motionType || undefined" media="(prefers-reduced-motion: no-preference)">
    <img v-bind="attrs" :src="src" :alt="alt" :width="imgWidth" :style="imgStyle">
  </picture>
  <img v-else v-bind="attrs" :src="src" :alt="alt" :width="imgWidth" :style="imgStyle">
</template>
