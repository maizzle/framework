<script lang="ts">
import { createStaticVNode, type PropType } from 'vue'
import { twMerge } from 'tailwind-merge'
import { encode } from 'uqr'

type Ecc = 'L' | 'M' | 'Q' | 'H'

const escapeAttr = (v: string) =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Parse a Tailwind sizing token's pixel equivalent.
 *
 * Assumes the default v4 spacing scale (1 unit = 0.25rem),
 * which resolves to 4px at the standard 16px root font.
 * Arbitrary values accept `px` and `rem`; other units
 * fall through to the caller's default.
 */
function tokenToPx(token: string): number {
  const seg = token.slice(token.lastIndexOf(':') + 1)
  const m = seg.match(/^(?:size|w|h)-(.+)$/)
  if (!m) return 0
  const v = m[1]
  if (v.startsWith('[') && v.endsWith(']')) {
    const um = v.slice(1, -1).match(/^([\d.]+)(px|rem)?$/)
    if (!um) return 0
    const n = Number.parseFloat(um[1])
    return um[2] === 'rem' ? n * 16 : n
  }
  if (/^\d+(?:\.\d+)?$/.test(v)) return Number.parseFloat(v) * 4
  return 0
}

/**
 * Partition a class string into two buckets:
 *
 * - `sizing` — width/height/size utilities used for cell px math.
 * - `neutral` — everything else; lands on the table verbatim.
 */
function partition(cls: string): { neutral: string[]; sizing: string[] } {
  const neutral: string[] = []
  const sizing: string[] = []
  for (const t of cls.split(/\s+/).filter(Boolean)) {
    const last = t.slice(t.lastIndexOf(':') + 1)
    if (/^(?:size|w|h|min-w|min-h|max-w|max-h)-/.test(last)) sizing.push(t)
    else neutral.push(t)
  }
  return { neutral, sizing }
}

export default {
  name: 'QrCode',
  inheritAttrs: false,
  props: {
    /** Data to encode (URL or arbitrary text). */
    value: {
      type: String,
      required: true,
    },
    /**
     * Error correction level: redundancy that keeps the code
     * scannable when partially obscured (e.g. a logo overlay),
     * at the cost of a larger matrix.
     *
     * - `L` ~7% recovery
     * - `M` ~15% recovery (default, fine for on-screen display)
     * - `Q` ~25% recovery
     * - `H` ~30% recovery
     */
    ecc: {
      type: String as PropType<Ecc>,
      default: 'M',
      validator: (v: string) => ['L', 'M', 'Q', 'H'].includes(v),
    },
    /**
     * Width of the light "quiet zone" around the code, in modules.
     * Spec recommends ≥ 4; 1 is plenty for on-screen scans.
     */
    border: {
      type: Number,
      default: 1,
    },
    /**
     * Accessible label exposed via `aria-label` on the table.
     */
    alt: {
      type: String,
      default: '',
    },
  },
  setup(props, { attrs }) {
    const userClass = String(attrs.class ?? '')
    const { neutral, sizing } = partition(userClass)

    /**
     * Effective pixel size from the user's sizing token, else
     * 120px (= `size-30` on the default v4 spacing scale).
     */
    const sizingToken = sizing[0]
    const effectivePx = sizingToken ? (tokenToPx(sizingToken) || 120) : 120

    const result = encode(props.value, {
      ecc: props.ecc,
      border: props.border,
      boostEcc: true,
    })
    const matrix = result.data
    const dim = matrix.length
    const cellPx = Math.max(1, Math.floor(effectivePx / dim))
    const totalPx = cellPx * dim

    /**
     * Table base classes:
     *
     * - `size-[Npx]` matches the outer to cell math (no stripe).
     * - `[&_td]:*` sizes each cell and zeroes its font-size.
     * - `bg-*` paints the table; light cells stay transparent.
     * - `qr:*` paints dark cells via the registered variant.
     *
     * Defaults and user tokens share each form, so `twMerge`
     * resolves overrides cleanly.
     */
    const baseTable = [
      `size-[${totalPx}px]`,
      `[&_td]:w-[${cellPx}px]`,
      `[&_td]:h-[${cellPx}px]`,
      '[&_td]:text-[0px]',
      'bg-white',
      'dark:bg-gray-950',
      'qr:bg-gray-950',
      'dark:qr:bg-white',
    ]

    const merged = twMerge([...baseTable, ...neutral].join(' '))

    let rows = ''
    for (let y = 0; y < dim; y++) {
      let cells = ''
      const row = matrix[y]
      for (let x = 0; x < dim; x++) {
        cells += row[x] ? '<td class="qd"></td>' : '<td></td>'
      }
      rows += `<tr>${cells}</tr>`
    }

    const altAttr = props.alt ? ` aria-label="${escapeAttr(props.alt)}"` : ''
    const styleAttr = attrs.style ? ` style="${String(attrs.style)}"` : ''
    const html = `<table class="${escapeAttr(merged)}" role="img"${altAttr} cellpadding="0" cellspacing="0" border="0"${styleAttr}>${rows}</table>`

    return () => createStaticVNode(html, 1)
  },
}
</script>
