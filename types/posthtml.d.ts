import type { Directive } from 'posthtml-parser';
import type { PostHTMLExpressions } from 'posthtml-expressions';

export interface PostHTMLOptions {
  /**
   * Configure the PostHTML parser to process custom directives.
   *
   * @default []
   */
  directives?: Directive[];

  /**
   * Enable `xmlMode` if you're using Maizzle to output XML content, and not actual HTML.
  *
   * @default false
   */
  xmlMode?: boolean;

  /**
   * Decode entities in the HTML.
   *
   * @default false
   */
  decodeEntities?: boolean;

  /**
   * Output all tags in lowercase. Works only when `xmlMode` is disabled.
   *
   * @default false
    */
  lowerCaseTags?: boolean;

  /**
   * Output all attribute names in lowercase.
   *
   * @default false
   */
  lowerCaseAttributeNames?: boolean;

  /**
   * Recognize CDATA sections as text even if the `xmlMode` option is disabled.
   *
   * @default false
   */
  recognizeCDATA?: boolean;

  /**
   * Recognize self-closing tags.
   * Disabling this will cause rendering to stop at the first self-closing custom (non-HTML) tag.
   *
   * @default true
   */
  recognizeSelfClosing?: boolean;

  /**
   * If enabled, AST nodes will have a location property containing the `start` and `end` line and column position of the node.
   *
   * @default false
   */
  sourceLocations?: boolean;

  /**
   * Whether attributes with no values should render exactly as they were written, without `=""` appended.
   *
   * @default true
   */
  recognizeNoValueAttribute?: boolean;

  /**
   * Make PostHTML to treat custom tags as self-closing.
   *
   * @default []
   */
  singleTags?: string[] | RegExp[];

  /**
   * Define the closing format for single tags.
   *
   * @default 'default'
   */
  closingSingleTag?: 'tag' | 'slash';

  /**
   * Whether to quote all attribute values.
   *
   * @default true
   */
  quoteAllAttributes?: boolean;

  /**
   * Replaces quotes in attribute values with `&quote;`.
   *
   * @default true
   */
  replaceQuote?: boolean;

  /**
   * Specify the style of quote around the attribute values.
   *
   * @default 2
   *
   * @example
   *
   * `0` - Quote style is based on attribute values (an alternative for `replaceQuote` option)
   *
   *  ```
   *  <img src="example.jpg" onload='testFunc("test")'>
   *  ```
   *
   *  @example
   *
   *  `1` - Attribute values are wrapped in single quotes
   *
   *  ```
   *  <img src='example.jpg' onload='testFunc("test")'>
   *  ```
   *
   *  @example
   *
   *  `2` - Attribute values are wrapped in double quotes
   *
   *  ```
   *  <img src="example.jpg" onload="testFunc("test")">
   *  ```
   */
  quoteStyle?: 0 | 1 | 2;
}

export default interface PostHTMLConfig {
  /**
  Configure [posthtml-expressions](https://github.com/posthtml/posthtml-expressions) options.
  */
  expressions?: PostHTMLExpressions;

  /**
  Configure PostHTML options.
   */
  options?: PostHTMLOptions;

  /**
   * PostHTML plugins to apply before or after Maizzle's own plugins.
   *
   * @example
   * ```
   * import spaceless from 'posthtml-spaceless'
   * export default {
   *   posthtml: {
   *     plugins: [
   *       spaceless()
   *     ]
   *   }
   * }
   * ```
   */
  plugins?: {
    before: Array<() => void>;
    /**
     * Plugins to apply after Maizzle's own plugins.
     */
    after: Array<() => void>;
  } | (() => void)[];
}
