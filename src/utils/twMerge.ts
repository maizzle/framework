import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Custom utilities from `@maizzle/tailwindcss` that tailwind-merge does
 * not know about. Each becomes its own class group, so two classes from
 * the same utility (e.g. `mso-hide-all mso-hide-none`) resolve to the
 * last one, and `text-underline-*` stops being mistaken for a text
 * color and cancelling `text-{color}` (or vice versa).
 */
const utilities = [
  'text-underline',
  'text-underline-style',
  'text-underline-color',
  'mso-ansi-font-size',
  'mso-bidi-font-size',
  'mso-ansi-font-style',
  'mso-bidi-font-style',
  'mso-ansi-font-weight',
  'mso-bidi-font-weight',
  'mso-ascii-font-family',
  'mso-bidi-font-family',
  'mso-arabic-font-family',
  'mso-bidi-flag',
  'mso-highlight',
  'mso-generic-font-family',
  'mso-font-alt',
  'mso-element-frame-width',
  'mso-element-frame-height',
  'mso-element',
  'mso-element-wrap',
  'mso-element-left',
  'mso-element-top',
  'mso-hide',
  'mso-color-alt',
  'mso-line-height-rule',
  'mso-line-height-alt',
  'mso-text-raise',
  'mso-padding-alt',
  'mso-padding-top-alt',
  'mso-padding-right-alt',
  'mso-padding-bottom-alt',
  'mso-padding-left-alt',
  'mso-margin-alt',
  'mso-margin-top-alt',
  'mso-margin-right-alt',
  'mso-margin-bottom-alt',
  'mso-margin-left-alt',
  'mso-para-margin',
  'mso-para-margin-top',
  'mso-para-margin-right',
  'mso-para-margin-bottom',
  'mso-para-margin-left',
  'mso-text-indent-alt',
  'mso-table-tspace',
  'mso-table-rspace',
  'mso-table-bspace',
  'mso-table-lspace',
  'mso-font-width',
  'mso-shading',
  'mso-shadow-color',
  'mso-element-frame-vspace',
  'mso-element-frame-hspace',
  'mso-border-alt',
  'mso-border-between',
  'mso-border-bottom-alt',
  'mso-border-left-alt',
  'mso-border-right-alt',
  'mso-border-top-alt',
  'mso-border-between-width',
  'mso-border-width-alt',
  'mso-border-bottom-width-alt',
  'mso-border-left-width-alt',
  'mso-border-right-width-alt',
  'mso-border-top-width-alt',
  'mso-border-bottom-source',
  'mso-border-left-source',
  'mso-border-right-source',
  'mso-border-top-source',
  'mso-border-shadow',
  'mso-border-effect',
] as const

const sides = ['top', 'right', 'bottom', 'left'] as const

export const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      ...Object.fromEntries(utilities.map((name) => [name, [{ [name]: [() => true] }]])),
      'prose-size': [{ prose: ['sm', 'base', 'lg', 'xl'] }],
    },
    conflictingClassGroups: {
      'mso-padding-alt': sides.map((s) => `mso-padding-${s}-alt`),
      'mso-margin-alt': sides.map((s) => `mso-margin-${s}-alt`),
      'mso-para-margin': sides.map((s) => `mso-para-margin-${s}`),
      'mso-border-alt': sides.map((s) => `mso-border-${s}-alt`),
      'mso-border-width-alt': sides.map((s) => `mso-border-${s}-width-alt`),
    },
  },
})
