<script lang="ts">
import { computed, createStaticVNode, type PropType } from 'vue'

const VERSION_MAP = {
  2003: 11,
  2007: 12,
  2010: 14,
  2013: 15,
  2016: 16,
  2019: 16
}

type Year = `${keyof typeof VERSION_MAP}`
type YearList = Year | (string & {})

const toMso = (v: string) => VERSION_MAP[v as unknown as keyof typeof VERSION_MAP]

const parseList = (value: string) =>
  value
    .split(',')
    .map(v => v.trim())
    .map(toMso)
    .filter(Boolean)

export default {
  name: 'Outlook',
  props: {
    /**
     * Render content only in the specified Outlook version(s).
     *
     * Comma-separated list of years.
     *
     * @example '2013'
     * @example '2013,2016'
     */
    only: String as PropType<YearList>,
    /**
     * Render content in all Outlook versions except the specified one(s).
     *
     * Comma-separated list of years.
     *
     * @example '2007'
     * @example '2007,2010'
     */
    not: String as PropType<YearList>,
    /**
     * Render content in Outlook versions lower than the specified year.
     *
     * @example '2013'
     */
    lt: String as PropType<Year>,
    /**
     * Render content in Outlook versions lower than or equal to the specified year.
     *
     * @example '2013'
     */
    lte: String as PropType<Year>,
    /**
     * Render content in Outlook versions greater than the specified year.
     *
     * @example '2010'
     */
    gt: String as PropType<Year>,
    /**
     * Render content in Outlook versions greater than or equal to the specified year.
     *
     * @example '2010'
     */
    gte: String as PropType<Year>,
    /**
     * Raw HTML inserted at the start of the conditional comment, before the slot.
     *
     * Bypasses Vue's template parser, so unbalanced tags are preserved — useful
     * for MSO ghost tables where the opening `<table><tr><td>` must live inside
     * the conditional comment.
     *
     * @example '<table align="center" width="600"><tr><td>'
     */
    open: {
      type: String,
      default: ''
    },
    /**
     * Raw HTML inserted at the end of the conditional comment, after the slot.
     *
     * Pair with `open` to close ghost-table tags inside the conditional.
     *
     * @example '</td></tr></table>'
     */
    close: {
      type: String,
      default: ''
    }
  },
  setup(props, { slots }) {
    const condition = computed(() => {
      if (props.only) {
        const versions = parseList(props.only)
        if (versions.length === 1) {
          return `mso ${versions[0]}`
        }
        return versions.map(v => `(mso ${v})`).join('|')
      }

      if (props.not) {
        const versions = parseList(props.not)
        if (versions.length === 1) {
          return `!mso ${versions[0]}`
        }
        return `!(${versions.map(v => `mso ${v}`).join('|')})`
      }

      const parts = []

      if (props.lt) parts.push(`lt mso ${toMso(props.lt)}`)
      if (props.lte) parts.push(`lte mso ${toMso(props.lte)}`)
      if (props.gt) parts.push(`gt mso ${toMso(props.gt)}`)
      if (props.gte) parts.push(`gte mso ${toMso(props.gte)}`)

      if (parts.length) {
        return parts.map(p => `(${p})`).join('&')
      }

      return 'mso'
    })

    const start = computed(() => `<!--[if ${condition.value}]>${props.open}`)
    const end = computed(() => `${props.close}<![endif]-->`)

    return () => [
      createStaticVNode(start.value, 1),
      slots.default?.(),
      createStaticVNode(end.value, 1),
    ]
  }
}
</script>
