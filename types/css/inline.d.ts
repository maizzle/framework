export type AttributeToStyleSupportedAttributes =
  | 'width'
  | 'height'
  | 'bgcolor'
  | 'background'
  | 'align'
  | 'valign';

export default interface InlineCSSConfig {
  /**
   * Which CSS properties should be duplicated as what HTML attributes.
   *
   * @default {}
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       styleToAttribute: {
   *         'background-color': 'bgcolor',
   *       }
   *     }
   *   }
   * }
   * ```
  */
  styleToAttribute?: Record<string, string>;

  /**
   * Duplicate HTML attributes to inline CSS.
   *
   * @default false
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       attributeToStyle: ['width', 'bgcolor', 'background']
   *     }
   *   }
   * }
   * ```
  */
  attributeToStyle?: boolean | AttributeToStyleSupportedAttributes[];

  /**
   * Use any CSS pixel widths to create `width` attributes on elements set in `widthElements`.
   *
   * @default true
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       applyWidthAttributes: true,
   *     }
   *   }
   * }
   * ```
  */
  applyWidthAttributes?: boolean;

  /**
   * Use any CSS pixel widths to create `height` attributes on elements set in `heightElements`.
   *
   * @default true
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       applyHeightAttributes: true,
   *     }
   *   }
   * }
   * ```
  */
  applyHeightAttributes?: boolean;

  /**
   * Prefer HTML `width` and `height` attributes over inline CSS.
   * The inline CSS `width` and `height` will be removed.
   *
   * Applies to elements set in `widthElements` and `heightElements`.
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       useAttributeSizes: true
   *     }
   *   }
   * }
   * ```
  */
  useAttributeSizes?: boolean;

  /**
   * Array of CSS property names that should be excluded from the CSS inlining process.
   *
   * @default []
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       excludedProperties: ['padding', 'padding-left']
   *     }
   *   }
   * }
   * ```
  */
  excludedProperties?: string[];

  /**
   * Fenced code blocks that should be ignored during CSS inlining.
   *
   * @default
   * {
   *   EJS: { start: '<%', end: '%>' },
   *   HBS: { start: '{{', end: '}}' }
   * }
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       codeBlocks: {
   *         EJS: { start: '<%', end: '%>' },
   *         HBS: { start: '{{', end: '}}' },
   *       }
   *     }
   *   }
   * }
   * ```
  */
  codeBlocks?: Record<string, { start: string; end: string }>;

  /**
   * Provide your own CSS to be inlined. Must be vanilla or pre-compiled CSS.
   *
   * Existing `<style>` in your HTML tags will be ignored and their contents won't be inlined.
   *
   * @default false
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       customCSS: `.custom-class { color: red }`
   *     }
   *   }
   * }
   * ```
   */
  customCSS?: string | false;

  /**
   * Remove inlined CSS selectors from the `<style>` tag.
   *
   * @default true
   *
   * @example
   * ```
   * export default {
   *   css: {
   *    inline: {
   *      removeInlinedSelectors: true
   *    }
   * }
   * ```
   */
  removeInlinedSelectors?: boolean;

  /**
   * Prefer unitless CSS values
   *
   * @default true
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       preferUnitless: true
   *     }
   *   }
   * }
   * ```
   */
  preferUnitlessValues?: boolean;

  /**
   * Array of CSS selectors that should be preserved after inlining.
   *
   * @default [] // array of email-client targeting selectors
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     inline: {
   *       safelist: ['.line', '.bg-red-200']
   *     }
   *   }
   * }
   * ```
  */
  safelist?: string[];
}
