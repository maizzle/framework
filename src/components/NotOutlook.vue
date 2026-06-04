<script lang="ts">
import { createStaticVNode } from 'vue'

const START = '<!--[if !mso]><!-->'
const END = '<!--<![endif]-->'

export default {
  name: 'NotOutlook',
  setup(_, { slots }) {
    return () => [
      createStaticVNode(START, 1),
      slots.default?.(),
      createStaticVNode(END, 1),
    ]
  }
}
</script>
