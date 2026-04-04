<script lang="ts">
import { defineComponent, h, Fragment, createTextVNode, Text as TextVNode } from 'vue'

/**
 * Template syntax patterns whose content must never have widow
 * prevention applied (the expression should stay untouched).
 */
const IGNORED_PATTERNS = [
  { start: '{{',   end: '}}'   }, // Handlebars / Liquid / Nunjucks / Mustache
  { start: '{%',   end: '%}'   }, // Liquid / Nunjucks / Twig / Jinja2
  { start: '<%=',  end: '%>'   }, // EJS / ERB
  { start: '<%',   end: '%>'   }, // EJS / ERB
  { start: '{$',   end: '}'    }, // Smarty
  { start: '<\\?', end: '\\?>' }, // PHP
  { start: '#{',   end: '}'    }, // Pug
]

/**
 * Replace the space before the last word in a text string with a
 * non-breaking space (U+00A0), but only when the string has at
 * least `minWords` words. Template expressions are skipped.
 */
function processText(text: string, minWords: number): string {
  // Split around ignored template expressions so they are never touched
  let parts: string[] = [text]

  for (const { start, end } of IGNORED_PATTERNS) {
    const regex = new RegExp(`(${start}.*?${end})`, 'g')
    parts = parts.flatMap(part => part.split(regex))
  }

  return parts
    .map((part) => {
      // Pass template expressions through unchanged
      for (const { start, end } of IGNORED_PATTERNS) {
        if (new RegExp(`^${start}.*?${end}$`).test(part)) return part
      }

      const trimmedPart = part.trimEnd()
      const wordCount = trimmedPart.trim().split(/\s+/).filter(Boolean).length

      return wordCount >= minWords
        ? trimmedPart.replace(/ ([^ ]+)$/gm, '\u00A0$1') + part.slice(trimmedPart.length)
        : part
    })
    .join('')
}

function processChildren(children: any[], minWords: number): any[] {
  return children.map((child) => {
    if (child == null) return child
    if (typeof child === 'string') {
      return processText(child, minWords)
    }
    return processVNode(child, minWords)
  })
}

/**
 * Recursively walk a VNode tree and apply widow prevention to
 * every text node. Component VNodes are left untouched.
 */
function processVNode(vnode: any, minWords: number): any {
  if (vnode == null || typeof vnode !== 'object') return vnode

  // Text VNode — process the string content
  if (vnode.type === TextVNode) {
    return createTextVNode(processText(vnode.children as string, minWords))
  }

  // Fragment — recurse into children array
  if (vnode.type === Fragment) {
    return h(
      Fragment,
      null,
      Array.isArray(vnode.children)
        ? processChildren(vnode.children, minWords)
        : vnode.children,
    )
  }

  // DOM element — recurse into children, preserve props/attrs
  if (typeof vnode.type === 'string' && vnode.children != null) {
    if (Array.isArray(vnode.children)) {
      return h(vnode.type, vnode.props, processChildren(vnode.children, minWords))
    }
    if (typeof vnode.children === 'string') {
      return h(vnode.type, vnode.props, processText(vnode.children, minWords))
    }
  }

  // Component VNode or anything else — leave untouched
  return vnode
}

export default defineComponent({
  name: 'NoWidows',

  props: {
    /**
     * Minimum number of words required for widow words
     * prevention to apply. Strings with fewer words
     * are ignored.
     * @default 4
     */
    minWords: {
      type: [String, Number],
      default: 4,
    },
  },

  setup(props, { slots }) {
    return () => {
      const minWords = typeof props.minWords === 'string'
        ? parseInt(props.minWords, 10)
        : props.minWords
      return (slots.default?.() ?? []).map((vnode) =>
        processVNode(vnode, minWords),
      )
    }
  },
})
</script>
