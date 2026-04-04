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
    only: String,
    not: String,
    lt: String,
    lte: String,
    gt: String,
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
