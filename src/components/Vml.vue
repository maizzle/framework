<script lang="ts">
import { computed, createStaticVNode } from 'vue'
import type { PropType } from 'vue'
import { normalizeToPixels } from './utils.ts'

export default {
  name: 'Vml',
  props: {
    /**
     * VML shape to render.
     *
     * - `rect` (default) — rectangle
     * - `roundrect` — rectangle with rounded corners (`arcsize`)
     * - `oval` — ellipse fitted to width/height
     * - `line` — straight line between `from` and `to`
     *
     * @default 'rect'
     */
    shape: {
      type: String as PropType<'rect' | 'roundrect' | 'oval' | 'line'>,
      default: 'rect',
      validator: (v: string) => ['rect', 'roundrect', 'oval', 'line'].includes(v),
    },
    /**
     * Corner radius for `roundrect`, as a fraction of the shorter side.
     *
     * Range 0–1. Ignored for other shapes.
     *
     * @example '0.1'
     */
    arcsize: {
      type: [String, Number],
    },
    /**
     * Start coordinate for `shape="line"` as `"x,y"`.
     *
     * Required when `shape="line"`. Ignored otherwise.
     *
     * @example '0,0'
     * @example '10pt,10pt'
     */
    from: {
      type: String,
      validator: (v: string) => /^[\d.]+(px|pt|%|em|rem)?,[\d.]+(px|pt|%|em|rem)?$/.test(v.replace(/\s/g, '')),
    },
    /**
     * End coordinate for `shape="line"` as `"x,y"`.
     *
     * Required when `shape="line"`. Ignored otherwise.
     *
     * @example '600,0'
     * @example '100%,0'
     */
    to: {
      type: String,
      validator: (v: string) => /^[\d.]+(px|pt|%|em|rem)?,[\d.]+(px|pt|%|em|rem)?$/.test(v.replace(/\s/g, '')),
    },
    /**
     * Width of the shape. Ignored for `line`.
     *
     * Accepts a number (treated as pixels) or a string with units.
     *
     * @default '600px'
     */
    width: {
      type: [String, Number],
      default: '600px',
    },
    /**
     * Height of the shape. Ignored for `line`.
     *
     * When not set, the shape auto-sizes to fit its content.
     */
    height: {
      type: [String, Number],
      default: null,
    },
    /**
     * VML fill type.
     *
     * - `solid` — solid color fill (default in VML when omitted)
     * - `gradient` — linear gradient
     * - `gradientradial` — radial gradient
     * - `tile` — repeat image to fill
     * - `pattern` — tile at original size
     * - `frame` — scale image to fill
     *
     * Only emitted on `<v:fill>` when set.
     */
    type: {
      type: String as PropType<'solid' | 'gradient' | 'gradientradial' | 'tile' | 'pattern' | 'frame'>,
    },
    /**
     * URL of a fill image.
     *
     * When set, a `<v:fill>` child is emitted with this `src`.
     */
    src: {
      type: String,
    },
    /**
     * Primary fill color on `<v:fill>` (start color for gradients).
     *
     * @example '#3b82f6'
     */
    color: {
      type: String,
    },
    /**
     * Secondary fill color for gradient fills.
     *
     * @example '#1d4ed8'
     */
    color2: {
      type: String,
    },
    /**
     * Gradient direction in degrees (0–360).
     *
     * @example 90
     */
    angle: {
      type: [String, Number],
    },
    /**
     * Gradient midpoint (0–100, percentage of distance from start).
     *
     * @example 50
     */
    focus: {
      type: [String, Number],
    },
    /**
     * Radial gradient focus size as `"x,y"` fractions.
     *
     * @example '0,0'
     */
    focussize: {
      type: String,
      validator: (v: string) => /^-?[\d.]+,-?[\d.]+$/.test(v.replace(/\s/g, '')),
    },
    /**
     * Radial gradient focus position as `"x,y"` fractions.
     *
     * @example '0.5,0.5'
     */
    focusposition: {
      type: String,
      validator: (v: string) => /^-?[\d.]+,-?[\d.]+$/.test(v.replace(/\s/g, '')),
    },
    /**
     * Comma-separated dimensions for the fill image.
     *
     * @example '300px,200px'
     */
    sizes: {
      type: String,
      validator: (v: string) => /^[\d.]+(px|%|em|rem)?(,[\d.]+(px|%|em|rem)?)+$/.test(v.replace(/\s/g, '')),
    },
    /**
     * Fill origin offset as comma-separated fractional values.
     *
     * Overridden by `backgroundPosition` if both are set.
     *
     * @example '-0.5,-0.5'
     */
    origin: {
      type: String,
      validator: (v: string) => /^-?[\d.]+(,-?[\d.]+)+$/.test(v.replace(/\s/g, '')),
    },
    /**
     * Fill position offset as comma-separated fractional values.
     *
     * Overridden by `backgroundPosition` if both are set.
     *
     * @example '0.5,0.5'
     */
    position: {
      type: String,
      validator: (v: string) => /^-?[\d.]+(,-?[\d.]+)+$/.test(v.replace(/\s/g, '')),
    },
    /**
     * Convenience for image positioning. Maps to VML `origin` / `position`.
     *
     * First value is vertical (`top` | `center` | `bottom`).
     * Second value is horizontal (`left` | `center` | `right`).
     *
     * @example 'center,center'
     */
    backgroundPosition: {
      type: String as PropType<
        | 'top,left' | 'top,center' | 'top,right'
        | 'center,left' | 'center,center' | 'center,right'
        | 'bottom,left' | 'bottom,center' | 'bottom,right'
      >,
      validator: (v: string) => /^(top|center|bottom),(left|center|right)$/.test(v.replace(/\s/g, '')),
    },
    /**
     * Aspect ratio constraint for the fill image.
     *
     * - `atleast` — image at least as large as the shape
     * - `atmost` — image at most as large as the shape
     */
    aspect: {
      type: String as PropType<'atleast' | 'atmost'>,
    },
    /**
     * Text box inset (padding) as `top,right,bottom,left`.
     *
     * @default '0,0,0,0'
     */
    inset: {
      type: String,
      default: '0,0,0,0',
    },
    /**
     * Whether the shape has a visible border.
     *
     * @default false (true for `shape="line"`)
     */
    stroke: {
      type: [Boolean, String],
      default: null,
    },
    /**
     * Border color. Setting this enables `stroke` automatically.
     *
     * @example '#000000'
     */
    strokecolor: {
      type: String,
    },
    /**
     * Whether the shape has a fill.
     *
     * @default true (false for `shape="line"`)
     */
    fill: {
      type: [Boolean, String],
      default: null,
    },
    /**
     * Fallback fill color on the shape element itself.
     *
     * Rendered when no `<v:fill>` child is emitted or the fill image
     * cannot be loaded.
     *
     * @example '#3b82f6'
     */
    fillcolor: {
      type: String,
    },
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

    const hasFillChild = computed(() => {
      return props.type !== undefined
        || props.src !== undefined
        || props.color !== undefined
        || props.color2 !== undefined
        || props.angle !== undefined
        || props.focus !== undefined
        || props.focussize !== undefined
        || props.focusposition !== undefined
        || props.sizes !== undefined
        || props.aspect !== undefined
        || resolvedOrigin.value !== undefined
        || resolvedPosition.value !== undefined
    })

    const before = computed(() => {
      const isLine = props.shape === 'line'
      const element = `v:${props.shape}`

      const toBool = (v: boolean | string) => v === true || v === 'true' ? 'true' : 'false'

      const defaultFill = isLine ? false : true
      const defaultStroke = isLine ? true : false
      const fillResolved = props.fill === null ? defaultFill : props.fill
      const strokeResolved = props.stroke === null ? defaultStroke : props.stroke

      const styleParts: string[] = []
      if (!isLine) {
        styleParts.push(`width: ${normalizeToPixels(props.width)}`)
        if (props.height) styleParts.push(`height: ${normalizeToPixels(props.height)}`)
      }

      const shapeAttrs = [
        `fill="${props.fillcolor ? 'true' : toBool(fillResolved)}"`,
        `stroke="${props.strokecolor ? 'true' : toBool(strokeResolved)}"`,
        styleParts.length ? `style="${styleParts.join('; ')};"` : '',
        props.strokecolor ? `strokecolor="${props.strokecolor}"` : '',
        props.fillcolor ? `fillcolor="${props.fillcolor}"` : '',
        props.shape === 'roundrect' && props.arcsize !== undefined ? `arcsize="${props.arcsize}"` : '',
        isLine && props.from ? `from="${props.from}"` : '',
        isLine && props.to ? `to="${props.to}"` : '',
      ].filter(Boolean).join(' ')

      const fillAttrs = hasFillChild.value
        ? [
            props.type ? `type="${props.type}"` : '',
            props.src ? `src="${props.src}"` : '',
            props.color ? `color="${props.color}"` : '',
            props.color2 ? `color2="${props.color2}"` : '',
            props.angle !== undefined ? `angle="${props.angle}"` : '',
            props.focus !== undefined ? `focus="${props.focus}"` : '',
            props.focussize ? `focussize="${props.focussize}"` : '',
            props.focusposition ? `focusposition="${props.focusposition}"` : '',
            props.sizes ? `sizes="${props.sizes}"` : '',
            props.aspect ? `aspect="${props.aspect}"` : '',
            resolvedOrigin.value ? `origin="${resolvedOrigin.value}"` : '',
            resolvedPosition.value ? `position="${resolvedPosition.value}"` : '',
          ].filter(Boolean).join(' ')
        : ''

      const lines = [
        `<!--[if mso]>`,
        `<${element} xmlns:v="urn:schemas-microsoft-com:vml" ${shapeAttrs}>`,
      ]
      if (hasFillChild.value) {
        lines.push(`<v:fill ${fillAttrs} />`)
      }
      lines.push(`<v:textbox inset="${props.inset}" style="mso-fit-shape-to-text: true">`)
      lines.push(`<div><![endif]-->`)
      return lines.join('')
    })

    const after = computed(() => {
      const element = `v:${props.shape}`
      return `<!--[if mso]></div></v:textbox></${element}><![endif]-->`
    })

    return () => [
      createStaticVNode(before.value, 1),
      slots.default?.(),
      createStaticVNode(after.value, 1),
    ]
  },
}
</script>
