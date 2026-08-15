/**
 * postcss-flatten-gradients
 *
 * Tailwind v4 renders gradients as CSS-variable machinery split across
 * separate utility rules (`bg-linear-*`, `from-*`, `via-*`, `to-*`),
 * combining only on the element that carries every class. Email clients
 * don't support `var()` and Maizzle inlines styles, so the variables
 * never resolve and the gradient renders nothing.
 *
 * Given the per-element gradient combos (computed from the DOM by the
 * tailwindcss transformer), this plugin reads the `--tw-gradient-*`
 * values off the utility rules and emits a single flat rule per combo:
 *
 *   .bg-linear-gradient-to-bl-from-indigo-50-to-indigo-600 {
 *     background-image: linear-gradient(to bottom left,
 *       var(--color-indigo-50), var(--color-indigo-600));
 *   }
 *
 * Colors stay as `var(--color-*)` (or literals) so the downstream
 * resolveProps + lightningcss steps convert them to hex, exactly like
 * every other Tailwind color. The dead utility rules are then removed.
 */

import { Rule } from 'postcss'
import type { Plugin, Root } from 'postcss'

const PLUGIN_NAME = 'postcss-flatten-gradients'

/** A gradient combo found on a DOM element. */
export interface GradientCombo {
  /** Generated class name to emit the flat rule for. */
  className: string
  /** The gradient utility class tokens present on the element. */
  classes: string[]
}

type GradientFn = 'linear' | 'radial' | 'conic'

interface UtilityInfo {
  fn?: GradientFn
  position?: string
  from?: string
  via?: string
  to?: string
  fromPosition?: string
  viaPosition?: string
  toPosition?: string
  /** The source rule, used to anchor the generated rule in the cascade. */
  rule?: Rule
}

const GRADIENT_UTILITY_RE = /^(from|via|to)-|^bg-(linear|radial|conic)\b/
const GENERATED_RE = /^bg-(linear|radial|conic)-gradient-/
/**
 * Color-interpolation method Tailwind appends to the position (e.g.
 * `in oklab`, `in oklch longer hue`). It always trails the direction and
 * is unsupported in email, so strip from `in <space>` to the end.
 */
const INTERP_RE = /(?:^|\s+)in\s+\S.*$/i

/** Turn a single-class selector into its raw class token (`.from-\[\#f00\]` -> `from-[#f00]`). */
function selectorToClass(selector: string): string | null {
  const match = selector.match(/^\.((?:\\.|[^\s,>+~.])+)$/)
  if (!match) return null
  return match[1].replace(/\\(.)/g, '$1')
}

/** Strip the interpolation method so `to top in oklab` becomes `to top`. */
function stripInterpolation(position: string): string {
  return position.replace(INTERP_RE, '').trim()
}

export default (combos: GradientCombo[] = []): Plugin => {
  return {
    postcssPlugin: PLUGIN_NAME,

    Once(root: Root) {
      if (!combos.length) return

      // Index every single-class gradient utility rule by its class token.
      const utilities = new Map<string, UtilityInfo>()

      root.walkRules((rule) => {
        const cls = selectorToClass(rule.selector)
        if (!cls || !GRADIENT_UTILITY_RE.test(cls)) return

        const info = utilities.get(cls) ?? {}

        // Only read declarations directly on the rule, skipping the
        // nested @supports overrides Tailwind adds for oklab.
        rule.each((node) => {
          if (node.type !== 'decl') return
          switch (node.prop) {
            case '--tw-gradient-position':
              info.position = node.value
              break
            case '--tw-gradient-from':
              info.from = node.value
              break
            case '--tw-gradient-via':
              info.via = node.value
              break
            case '--tw-gradient-to':
              info.to = node.value
              break
            case '--tw-gradient-from-position':
              info.fromPosition = node.value
              break
            case '--tw-gradient-via-position':
              info.viaPosition = node.value
              break
            case '--tw-gradient-to-position':
              info.toPosition = node.value
              break
            case 'background-image': {
              const fn = node.value.match(/^(linear|radial|conic)-gradient\(/)
              if (fn) info.fn = fn[1] as GradientFn
              break
            }
          }
        })

        info.rule = rule
        utilities.set(cls, info)
      })

      // Emit one flat rule per combo.
      for (const combo of combos) {
        const fnClass = combo.classes.find(c => /^bg-(linear|radial|conic)\b/.test(c))
        if (!fnClass) continue

        const fnInfo = utilities.get(fnClass)
        const fn = fnInfo?.fn
        if (!fn) continue

        let from: string | undefined
        let via: string | undefined
        let to: string | undefined
        let fromPosition: string | undefined
        let viaPosition: string | undefined
        let toPosition: string | undefined

        for (const cls of combo.classes) {
          const info = utilities.get(cls)
          if (!info) continue
          if (info.from !== undefined) from = info.from
          if (info.via !== undefined) via = info.via
          if (info.to !== undefined) to = info.to
          if (info.fromPosition !== undefined) fromPosition = info.fromPosition
          if (info.viaPosition !== undefined) viaPosition = info.viaPosition
          if (info.toPosition !== undefined) toPosition = info.toPosition
        }

        // Tailwind defaults an unset from/to to transparent (#0000).
        from = from ?? 'transparent'
        to = to ?? 'transparent'

        const direction = fnInfo?.position ? stripInterpolation(fnInfo.position) : ''

        const stops: string[] = []
        stops.push(fromPosition && fromPosition !== '0%' ? `${from} ${fromPosition}` : from)
        if (via !== undefined) {
          stops.push(viaPosition && viaPosition !== '50%' ? `${via} ${viaPosition}` : via)
        }
        stops.push(toPosition && toPosition !== '100%' ? `${to} ${toPosition}` : to)

        const args = direction ? `${direction}, ${stops.join(', ')}` : stops.join(', ')

        const generated = new Rule({ selector: `.${combo.className}` })
        generated.append({ prop: 'background-image', value: `${fn}-gradient(${args})` })

        /**
         * Insert at the position of the source utility rule (still present
         * — removal happens below) so the gradient keeps that rule's place
         * in the cascade. Appending to the root would move it past any
         * later author CSS that should override it.
         */
        const anchor = fnInfo?.rule
        if (anchor?.parent) {
          anchor.before(generated)
        } else {
          root.append(generated)
        }
      }

      // Remove the now-dead gradient utility rules.
      root.walkRules((rule) => {
        const cls = selectorToClass(rule.selector)
        if (cls && !GENERATED_RE.test(cls) && GRADIENT_UTILITY_RE.test(cls)) {
          rule.remove()
        }
      })
    },
  }
}

export const postcss = true
