import type { Opts } from 'email-comb';

export default interface PurgeCSSConfig {
  /**
   * Classes or IDs that you don't want removed.
   *
   * @default []
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     purge: {
   *       safelist: ['.some-class', '.Mso*', '#*'],
   *     }
   *   }
   * }
   * ```
  */
  safelist?: Opts['whitelist'];

  /**
   * Start and end delimiters for computed classes that you don't want removed.
   *
   * @default
   * [
   *   {
   *     heads: '{{',
   *     tails: '}}',
   *   },
   *   {
   *     heads: '{%',
   *     tails: '%}',
   *   }
   * ]
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     purge: {
   *       backend: [
   *         { heads: '[[', tails: ']]' },
   *       ]
   *     }
   *   }
   * }
   * ```
  */
  backend?: Opts['backend'];

  /**
   * Whether to remove `<!-- HTML comments -->`.
   *
   * @default true
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     purge: {
   *       removeHTMLComments: false,
   *     }
   *   }
   * }
   * ```
  */
  removeHTMLComments?: Opts['removeHTMLComments'];

  /**
   * Whether to remove `/* CSS comments *\/`.
   *
   * @default true
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     purge: {
   *       removeCSSComments: false,
   *     }
   *   }
   * }
   * ```
  */
  removeCSSComments?: Opts['removeCSSComments'];

  /**
   * List of strings representing start of a conditional comment that should not be removed.
   *
   * @default
   * ['[if', '[endif']
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     purge: {
   *       doNotRemoveHTMLCommentsWhoseOpeningTagContains: ['[if', '[endif'],
   *     }
   *   }
   * }
   * ```
  */
  doNotRemoveHTMLCommentsWhoseOpeningTagContains?: Opts['doNotRemoveHTMLCommentsWhoseOpeningTagContains'];

  /**
   * Rename all classes and IDs in both your `<style>` tags and your body HTML elements,
   * to be as few characters as possible.
   *
   * @default false
   *
   * @example
   * ```
   * export default {
   *   css: {
   *     purge: {
   *       uglify: true,
   *     }
   *   }
   * }
   * ```
  */
  uglify?: Opts['uglify'];
}
