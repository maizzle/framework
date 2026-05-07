<script lang="ts">
import { computed, createStaticVNode } from 'vue'
import type { PropType } from 'vue'
import { normalizeToPixels } from './utils.ts'

export default {
  name: 'OutlookBg',
  props: {
    /**
     * Width of the VML rectangle.
     *
     * Accepts a number (treated as pixels) or a string with units.
     *
     * @default '600px'
     */
    width: {
      type: [String, Number],
      default: '600px'
    },
    /**
     * Height of the VML rectangle.
     *
     * Accepts a number (treated as pixels) or a string with units.
     * When not set, the rectangle auto-sizes to fit its content.
     */
    height: {
      type: [String, Number],
      default: null
    },
    /**
     * VML fill type that controls how the background image is rendered.
     *
     * - `frame` — scale to fill the rectangle (default)
     * - `tile` — repeat the image to fill the rectangle
     * - `pattern` — tile at original size
     * - `solid` — solid color fill, no image
     * - `gradient` — linear gradient fill
     * - `gradientradial` — radial gradient fill
     *
     * @default 'frame'
     */
    type: {
      type: String as PropType<'solid' | 'gradient' | 'gradientradial' | 'tile' | 'pattern' | 'frame'>,
      default: 'frame'
    },
    /**
     * Comma-separated dimensions for the fill image.
     *
     * Controls the rendered size of the background image.
     *
     * @example '300px,200px'
     */
    sizes: {
      type: String,
      validator: (v: string) => /^[\d.]+(px|%|em|rem)?(,[\d.]+(px|%|em|rem)?)+$/.test(v.replace(/\s/g, ''))
    },
    /**
     * Fill origin offset as comma-separated fractional values.
     *
     * Controls where the fill image anchors relative to the shape.
     * Values are fractions of the shape's dimensions, where `0,0` is
     * center and `-0.5,-0.5` is the top-left corner.
     *
     * Overridden by `backgroundPosition` if both are set.
     *
     * @example '0,0'
     * @example '-0.5,-0.5'
     */
    origin: {
      type: String,
      validator: (v: string) => /^-?[\d.]+(,-?[\d.]+)+$/.test(v.replace(/\s/g, ''))
    },
    /**
     * Fill position offset as comma-separated fractional values.
     *
     * Controls where the fill image is positioned within the shape.
     * Values are fractions of the shape's dimensions, where `0,0` is
     * center and `0.5,0.5` is the bottom-right corner.
     *
     * Overridden by `backgroundPosition` if both are set.
     *
     * @example '0,0'
     * @example '0.5,0.5'
     */
    position: {
      type: String,
      validator: (v: string) => /^-?[\d.]+(,-?[\d.]+)+$/.test(v.replace(/\s/g, ''))
    },
    /**
     * Background image position as `vertical,horizontal`.
     *
     * First value is the vertical axis: `top`, `center`, or `bottom`.
     * Second value is the horizontal axis: `left`, `center`, or `right`.
     *
     * Convenience prop that maps to VML `origin` and `position` attributes.
     *
     * @example 'top,left'
     * @example 'center,center'
     */
    backgroundPosition: {
      type: String as PropType<
        | 'top,left' | 'top,center' | 'top,right'
        | 'center,left' | 'center,center' | 'center,right'
        | 'bottom,left' | 'bottom,center' | 'bottom,right'
      >,
      validator: (v: string) => /^(top|center|bottom),(left|center|right)$/.test(v.replace(/\s/g, ''))
    },
    /**
     * Aspect ratio constraint for the fill image.
     *
     * - `atleast` — image is at least as large as the shape
     * - `atmost` — image is at most as large as the shape
     */
    aspect: {
      type: String as PropType<'atleast' | 'atmost'>,
    },
    /**
     * Fill color used for `solid` and `gradient` fill types.
     *
     * @example '#ffffff'
     */
    color: String,
    /**
     * Text box inset (padding) as `top,right,bottom,left`.
     *
     * Controls the inner spacing of the `v:textbox` element.
     *
     * @default '0,0,0,0'
     */
    inset: {
      type: String,
      default: '0,0,0,0'
    },
    /**
     * Whether the VML rectangle has a visible border.
     *
     * @default false
     */
    stroke: {
      type: [Boolean, String],
      default: false
    },
    /**
     * Border color for the VML rectangle.
     *
     * Setting this also enables `stroke` automatically.
     *
     * @example '#000000'
     */
    strokecolor: String,
    /**
     * Whether the VML rectangle has a fill.
     *
     * @default true
     */
    fill: {
      type: [Boolean, String],
      default: true
    },
    /**
     * Background color of the VML rectangle.
     *
     * Used as a fallback when the background image cannot be loaded.
     *
     * @default 'none'
     * @example '#3b82f6'
     */
    fillcolor: {
      type: String,
      default: 'none'
    },
    /**
     * URL of the background image.
     *
     * @default 'https://via.placeholder.com/600x400'
     */
    src: {
      type: String,
      default: 'https://via.placeholder.com/600x400'
    }
  },
  setup(props, { slots }) {
    const backgroundPositionMap: Record<string, string> = {
      'top,left': '-0.5,-0.5',
      'top,center': '0,-0.5',
      'top,right': '0.5,-0.5',
      'center,left': '-0.5,0',
      'center,center': '0,0',
      'center,right': '0.5,0',
      'bottom,left': '-0.5,0.5',
      'bottom,center': '0,0.5',
      'bottom,right': '0.5,0.5',
    }

    const resolvedOrigin = computed(() => props.origin ?? (props.backgroundPosition ? backgroundPositionMap[props.backgroundPosition.replace(/\s/g, '')] : undefined))
    const resolvedPosition = computed(() => props.position ?? (props.backgroundPosition ? backgroundPositionMap[props.backgroundPosition.replace(/\s/g, '')] : undefined))

    const before = computed(() => {
      const width = normalizeToPixels(props.width)

      const toBool = (v: boolean | string) => v === true || v === 'true' ? 'true' : 'false'

      const rectAttrs = [
        `fill="${props.fillcolor ? 'true' : toBool(props.fill)}"`,
        `stroke="${props.strokecolor ? 'true' : toBool(props.stroke)}"`,
        `style="width: ${width};${props.height ? ` height: ${normalizeToPixels(props.height)};` : ''}"`,
        props.strokecolor ? `strokecolor="${props.strokecolor}"` : '',
        props.fillcolor ? `fillcolor="${props.fillcolor}"` : ''
      ].filter(Boolean).join(' ')

      const fillAttrs = [
        `type="${props.type}"`,
        `src="${props.src}"`,
        props.sizes ? `sizes="${props.sizes}"` : '',
        props.aspect ? `aspect="${props.aspect}"` : '',
        resolvedOrigin.value ? `origin="${resolvedOrigin.value}"` : '',
        resolvedPosition.value ? `position="${resolvedPosition.value}"` : '',
        props.color ? `color="${props.color}"` : ''
      ].filter(Boolean).join(' ')

      return [
        `<!--[if mso]>`,
        `<v:rect xmlns:v="urn:schemas-microsoft-com:vml" ${rectAttrs}>`,
        `<v:fill ${fillAttrs} />`,
        `<v:textbox inset="${props.inset}" style="mso-fit-shape-to-text: true">`,
        `<div><![endif]-->`
      ].join('')
    })

    const after = computed(() => {
      return `<!--[if mso]></div></v:textbox></v:rect><![endif]-->`
    })

    return () => [
      createStaticVNode(before.value, 1),
      slots.default?.(),
      createStaticVNode(after.value, 1)
    ]
  }
}
</script>
