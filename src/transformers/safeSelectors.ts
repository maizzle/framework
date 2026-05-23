import postcss from 'postcss'
import safeParser from 'postcss-safe-parser'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'
import type { CssConfig } from '../types/config.ts'

const DEFAULT_REPLACEMENTS: Record<string, string> = {
  ':': '-',
  '/': '-',
  '%': 'pc',
  '.': '_',
  ',': '_',
  '#': '_',
  '[': '',
  ']': '',
  '(': '',
  ')': '',
  '{': '',
  '}': '',
  '!': '-i',
  '&': 'and-',
  '<': 'lt-',
  '=': 'eq-',
  '>': 'gt-',
  '|': 'or-',
  '@': 'at-',
  '?': 'q-',
  '\\': '-',
  '"': '-',
  "'": '-',
  '*': '-',
  '+': '-',
  ';': '-',
  '^': '-',
  '`': '-',
  '~': '-',
  '$': '-',
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Replace escaped special characters in CSS selectors.
 *
 * Tailwind generates selectors like `.sm\:text-base`. This function
 * replaces the `\:` with `-` (or whatever the configured replacement is)
 * so the selector becomes `.sm-text-base`, which is safe for email clients.
 */
function processCssSelectors(css: string, replacements: Record<string, string>): string {
  // Matches \<char> in CSS selectors — e.g. \: \/ \. \[ etc.
  const selectorRegex = new RegExp(
    `\\\\(${Object.keys(replacements).map(escapeForRegex).join('|')})`,
    'g',
  )

  return postcss([
    (root: postcss.Root) => {
      root.walkRules((rule: postcss.Rule) => {
        rule.selector = rule.selector
          .replace(selectorRegex, (matched, char, offset, str) => {
            // Yahoo Mail wraps content in a class literally named `&`, so
            // the selector `.\&` must be preserved. Detect it as a `\&`
            // that follows a `.` and ends the class atom (space, combinator,
            // comma, `{`, or end-of-string).
            if (char === '&' && str[offset - 1] === '.') {
              const next = str[offset + 2]
              if (next === undefined || /[\s,{>~+)]/.test(next)) return matched
            }
            return replacements[char] ?? matched
          })
          // Handle CSS unicode escape for comma (\2c  → _)
          .replaceAll('\\2c ', '_')
      })
    },
  ]).process(css, { parser: safeParser }).css
}

/**
 * Replace unsafe special characters in a class attribute value.
 *
 * Splits on whitespace and replaces each char from the replacements map
 * in each class token individually.
 */
function processClassAttr(classStr: string, replacements: Record<string, string>): string {
  return classStr
    .split(/\s+/)
    .filter(Boolean)
    .map((cls) => {
      for (const [from, to] of Object.entries(replacements)) {
        cls = cls.split(from).join(to)
      }
      return cls
    })
    .join(' ')
}

/**
 * Safe selectors transformer.
 *
 * Replaces unsafe characters (`:`, `/`, `[`, `]`, etc.) in:
 * - CSS selectors inside `<style>` tags
 * - HTML `class` attributes
 *
 * This makes Tailwind utility classes like `sm:text-base` safe for
 * email clients that cannot handle escaped characters in class names.
 *
 * Enabled by default. Disable by setting `css.safe` to `false`.
 * Customize replacements by passing a `Record<string, string>` — user
 * values are merged on top of the defaults.
 *
 * @param html   HTML string to transform.
 * @param config CSS config (see {@link CssConfig}).
 * @returns      The transformed HTML string.
 *
 * @example
 * import { safeSelectors } from '@maizzle/framework'
 *
 * const out = safeSelectors('<div class="sm:text-base"></div>')
 */
export function safeSelectors(html: string, config: CssConfig = {}): string {
  return serialize(safeSelectorsDom(parse(html), config))
}

/**
 * DOM-form of {@link safeSelectors} used by the internal transformer pipeline.
 * Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function safeSelectorsDom(dom: ChildNode[], config: CssConfig = {}): ChildNode[] {
  const option = config.safe ?? true

  if (!option) return dom

  const replacements: Record<string, string> =
    option && typeof option === 'object'
      ? { ...DEFAULT_REPLACEMENTS, ...option }
      : DEFAULT_REPLACEMENTS

  walk(dom, (node) => {
    const el = node as Element

    // Process CSS selectors inside <style> tags
    if (el.name === 'style' && el.children?.length) {
      const text = el.children.find((c) => c.type === 'text') as any
      if (text?.data?.trim()) {
        text.data = processCssSelectors(text.data, replacements)
      }
    }

    // Replace special chars in class attributes
    if ('attribs' in el && el.attribs?.class) {
      el.attribs.class = processClassAttr(el.attribs.class, replacements)
    }
  })

  return dom
}
