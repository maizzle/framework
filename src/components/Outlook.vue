<script lang="ts">
import { computed, createStaticVNode } from 'vue'

const VERSION_MAP = {
  2003: 11,
  2007: 12,
  2010: 14,
  2013: 15,
  2016: 16,
  2019: 16
}

const toMso = (v: string) => VERSION_MAP[v]

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
    only: String,
    /**
     * Render content in all Outlook versions except the specified one(s).
     *
     * Comma-separated list of years.
     *
     * @example '2007'
     * @example '2007,2010'
     */
    not: String,
    /**
     * Render content in Outlook versions lower than the specified year.
     *
     * @example '2013'
     */
    lt: String,
    /**
     * Render content in Outlook versions lower than or equal to the specified year.
     *
     * @example '2013'
     */
    lte: String,
    /**
     * Render content in Outlook versions greater than the specified year.
     *
     * @example '2010'
     */
    gt: String,
    /**
     * Render content in Outlook versions greater than or equal to the specified year.
     *
     * @example '2010'
     */
    gte: String
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

    const start = computed(() => `<!--[if ${condition.value}]>`)
    const end = `<![endif]-->`

    return () => [
      createStaticVNode(start.value, 1),
      slots.default?.(),
      createStaticVNode(end, 1),
    ]
  }
}
</script>
