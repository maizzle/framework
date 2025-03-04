import type Config from './config';
import type MinifyConfig from './minify';
import type PostHTMLConfig from './posthtml';
import type { RenderOutput } from './render';
import type MarkdownConfig from './markdown';
import type PurgeCSSConfig from './css/purge';
import type PlaintextConfig from './plaintext';
import type CSSInlineConfig from './css/inline';
import type WidowWordsConfig from './widowWords';
import type { BaseURLConfig } from 'posthtml-base-url';
import type { HTMLBeautifyOptions } from 'js-beautify'
import type { Opts as PlaintextOptions } from 'string-strip-html';
import type { URLParametersConfig } from 'posthtml-url-parameters';
import type { AttributeToStyleSupportedAttributes } from './css/inline';

declare namespace MaizzleFramework {
  /**
   * Compile an HTML string with Maizzle.
   *
   * @param {string} html The HTML string to render.
   * @param {Config} [config] A Maizzle configuration object.
   * @returns {Promise<RenderOutput>} The rendered HTML and the Maizzle configuration object.
   */
  function render(html: string, config?: Config): Promise<RenderOutput>;

  /**
   * Normalize escaped character class names like `\:` or `\/` by replacing them with email-safe alternatives.
   *
   * @param {string} html The HTML string to normalize.
   * @param {Record<string, string>} replacements A dictionary of replacements to apply.
   * @returns {string} The normalized HTML string.
   * @see https://maizzle.com/docs/transformers/safe-class-names
   */
  function safeClassNames(html: string, replacements: Record<string, string>): string;

  /**
   * Compile Markdown to HTML.
   *
   * @param {string} input The Markdown string to compile.
   * @param {MarkdownConfig} [options] A configuration object for the Markdown compiler.
   * @param {PostHTMLConfig} [posthtmlOptions] A configuration object for PostHTML.
   * @returns {Promise<string>} The compiled HTML string.
   * @see https://maizzle.com/docs/markdown#api
   */
  function markdown(input: string, options?: MarkdownConfig, posthtmlOptions?: PostHTMLConfig): Promise<string>;

  /**
   * Prevent widow words inside a tag by adding a `&nbsp;` between its last two words.
   *
   * @param {string} html The HTML string to process.
   * @param {WidowWordsConfig} [options] A configuration object for the widow words transformer.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/widows
   */
  function preventWidows(html: string, options?: WidowWordsConfig): string;

  /**
   * Duplicate HTML attributes to inline CSS.
   *
   * @param {string} html The HTML string to process.
   * @param {AttributeToStyleSupportedAttributes[]} attributes An array of attributes to inline.
   * @param {PostHTMLConfig} [posthtmlConfig] A configuration object for PostHTML.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/attribute-to-style
   */
  function attributeToStyle(
    html: string,
    attributes: AttributeToStyleSupportedAttributes[],
    posthtmlConfig?: PostHTMLConfig
  ): string;

  /**
   * Inline CSS styles in an HTML string.
   *
   * @param {string} html The HTML string to process.
   * @param {CSSInlineConfig} [options] A configuration object for the CSS inliner.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/inline-css
   */
  function inlineCSS(html: string, options?: CSSInlineConfig): string;

  /**
   * Rewrite longhand CSS inside style attributes with shorthand syntax.
   * Only works with margin, padding and border, and only when all sides are specified.
   *
   * @param {string} html The HTML string to process.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/shorthand-css
   */
  function shorthandCSS(html: string): string;

  /**
   * Remove unused CSS from `<style>` tags and HTML elements.
   *
   * @param {string} html The HTML string to process.
   * @param {PurgeCSSConfig} [options] A configuration object for `email-comb`.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/remove-unused-css
   */
  function removeUnusedCSS(html: string, options?: PurgeCSSConfig): string;

  /**
   * Remove HTML attributes from an HTML string.
   *
   * @param {string} html The HTML string to process.
   * @param {string[] | Array<{ name: string; value: string | RegExp }>} [options] An array of attribute names to remove, or an array of objects with `name` and `value` properties.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/remove-attributes
   */
  function removeAttributes(
    html: string,
    options?:
    | string[]
    | Array<{
      name: string;
      value: string | RegExp;
    }>
  ): string;

  /**
   * Add attributes to elements in an HTML string.
   *
   * @param {string} html The HTML string to process.
   * @param {Record<string, unknown>} [options] A dictionary of attributes to add.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/add-attributes
   */
  function addAttributes(html: string, options?: Record<string, unknown>): string;

  /**
   * Pretty-print an HTML string.
   *
   * @param {string} html The HTML string to prettify.
   * @param {HTMLBeautifyOptions} [options] A configuration object for `js-beautify`.
   * @returns {string} The prettified HTML string.
   * @see https://maizzle.com/docs/transformers/prettify
   */
  function prettify(html: string, options?: HTMLBeautifyOptions): string;

  /**
   * Prepend a string to sources and hrefs in an HTML string.
   *
   * @param {string} html The HTML string to process.
   * @param {string | BaseURLConfig} [options] A string to prepend to sources and hrefs, or a configuration object for `posthtml-base-url`.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/base-url
   */
  function applyBaseURL(html: string, options?: string | BaseURLConfig): string;

  /**
   * Append parameters to URLs in an HTML string.
   *
   * @param {string} html The HTML string to process.
   * @param {URLParametersConfig} [options] A configuration object for `posthtml-url-parameters`.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/url-parameters
   */
  function addURLParameters(html: string, options?: URLParametersConfig): string;

  /**
   * Ensure that all HEX colors inside `bgcolor` and `color` attributes are defined with six digits.
   *
   * @param {string} html The HTML string to process.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/six-hex
   */
  function sixHEX(html: string): string;

  /**
   * Minify an HTML string, with email client considerations.
   *
   * @param {string} html The HTML string to minify.
   * @param {MinifyConfig} [options] A configuration object for `html-minifier`.
   * @returns {string} The minified HTML string.
   * @see https://maizzle.com/docs/transformers/minify
   */
  function minify(html: string, options?: MinifyConfig): string;

  /**
   * Batch-replace strings in an HTML string.
   *
   * @param {string} html The HTML string to process.
   * @param {Record<string, string>} [replacements] A dictionary of strings to replace.
   * @returns {string} The processed HTML string.
   * @see https://maizzle.com/docs/transformers/replace-strings
   */
  function replaceStrings(html: string, replacements?: Record<string, string>): string;

  /**
   * Generate a plaintext version of an HTML string.
   * @param {string} html - The HTML string to convert to plaintext.
   * @param {Object} [config={}] - Configuration object.
   * @param {PostHTMLConfig} [config.posthtml] - PostHTML options.
   * @param {PlaintextOptions} [config.strip] - Options for `string-strip-html`.
   * @returns {Promise<string>} A string representing the HTML converted to plaintext.
   * @see https://maizzle.com/docs/plaintext
   */
  function generatePlaintext(
    html: string,
    config?: {
      /**
       * Configure PostHTML options.
       */
      posthtml?: PostHTMLConfig
    }
      & PlaintextOptions,
  ): Promise<string>;

  export {
    Config,
    render,
    safeClassNames,
    markdown,
    preventWidows,
    attributeToStyle,
    inlineCSS,
    shorthandCSS,
    removeUnusedCSS,
    removeUnusedCSS as purgeCSS,
    removeAttributes,
    addAttributes,
    prettify,
    applyBaseURL,
    addURLParameters as addUrlParams,
    sixHEX,
    minify,
    replaceStrings,
    generatePlaintext,
  }
}

export = MaizzleFramework;
