import type { Plugin } from 'postcss';

/**
 * Sort function for media queries.
 * Takes two media query strings and returns a number indicating their relative order.
 */
export type SortFunction = (a: string, b: string) => number;

/**
 * Configuration object for sort-css-media-queries library.
 */
export interface SortConfiguration {
  [key: string]: any;
}

/**
 * Options for the postcss-sort-media-queries plugin.
 */
export interface PostCSSSortMediaQueriesOptions {
  /**
   * Sorting method for media queries.
   *
   * @default 'mobile-first'
   *
   * @example
   * ```
   * // Use built-in mobile-first sorting
   * sort: 'mobile-first'
   *
   * // Use built-in desktop-first sorting
   * sort: 'desktop-first'
   *
   * // Use custom sorting function
   * sort: (a, b) => a.localeCompare(b)
   * ```
   */
  sort?: 'mobile-first' | 'desktop-first' | SortFunction;

  /**
   * Custom configuration object for the sort-css-media-queries library.
   * When provided, it will be used to create a custom sort function.
   *
   * @default false
   *
   * @example
   * ```
   * configuration: {
   *   unitlessMqAlwaysFirst: true,
   *   sort: 'mobile-first'
   * }
   * ```
   */
  configuration?: false | SortConfiguration;

  /**
   * Whether to only process media queries at the top level (direct children of root).
   * When true, nested media queries will be ignored.
   *
   * @default false
   *
   * @example
   * ```
   * onlyTopLevel: true
   * ```
   */
  onlyTopLevel?: boolean;
}

/**
 * PostCSS plugin that sorts CSS media queries.
 *
 * @param options - Plugin configuration options
 * @returns PostCSS plugin instance
 *
 * @example
 * ```
 * import postcss from 'postcss';
 * import sortMediaQueries from 'postcss-sort-media-queries';
 *
 * postcss([
 *   sortMediaQueries({
 *     sort: 'mobile-first',
 *     onlyTopLevel: false
 *   })
 * ])
 * ```
 */
declare function postcssSortMediaQueries(options?: PostCSSSortMediaQueriesOptions): Plugin;

export default postcssSortMediaQueries;
