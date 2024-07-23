import type Config from "./config";
import type {
  safeClassNames,
  markdown,
  preventWidows,
  attributeToStyle,
  inlineCSS,
  shorthandCSS,
  removeUnusedCSS,
  purgeCSS,
  removeAttributes,
  addAttributes,
  prettify,
  applyBaseURL,
  addUrlParams,
  sixHEX,
  minify,
  replaceStrings,
  plaintext,
} from "./index";

type PostHTMLType = (html: string, config: Config) => { html: string; config: Config };

type TransformType = {
  /**
  * Normalize escaped character class names like `\:` or `\/` by replacing them with email-safe alternatives.
  *
  * @param {string} html The HTML string to normalize.
  * @param {Record<string, string>} replacements A dictionary of replacements to apply.
  * @returns {string} The normalized HTML string.
  * @see https://maizzle.com/docs/transformers/safe-class-names
  */
  safeClassNames: typeof safeClassNames;
  /**
  * Compile Markdown to HTML.
  *
  * @param {string} input The Markdown string to compile.
  * @param {MarkdownConfig} [options] A configuration object for the Markdown compiler.
  * @returns {string} The compiled HTML string.
  * @see https://maizzle.com/docs/transformers/markdown
  */
  markdown: typeof markdown;
  /**
  * Prevent widow words inside a tag by adding a `&nbsp;` between its last two words.
  *
  * @param {string} html The HTML string to process.
  * @param {WidowWordsConfig} [options] A configuration object for the widow words transformer.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/widows
  */
  preventWidows: typeof preventWidows;
  /**
  * Duplicate HTML attributes to inline CSS.
  *
  * @param {string} html The HTML string to process.
  * @param {AttributeToStyleSupportedAttributes[]} attributes An array of attributes to inline.
  * @param {PostHTMLConfig} [posthtmlConfig] A configuration object for PostHTML.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/attribute-to-style
  */
  attributeToStyle: typeof attributeToStyle;
  /**
  * Inline CSS styles in an HTML string.
  *
  * @param {string} html The HTML string to process.
  * @param {CSSInlineConfig} [options] A configuration object for the CSS inliner.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/inline-css
  */
  inlineCSS: typeof inlineCSS;
  /**
  * Rewrite longhand CSS inside style attributes with shorthand syntax.
  * Only works with margin, padding and border, and only when all sides are specified.
  *
  * @param {string} html The HTML string to process.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/shorthand-css
  */
  shorthandCSS: typeof shorthandCSS;
  /**
  * Remove unused CSS from `<style>` tags and HTML elements.
  *
  * @param {string} html The HTML string to process.
  * @param {PurgeCSSConfig} [options] A configuration object for `email-comb`.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/remove-unused-css
  */
  removeUnusedCSS: typeof removeUnusedCSS;
  /**
  * Remove HTML attributes from an HTML string.
  *
  * @param {string} html The HTML string to process.
  * @param {string[] | Array<{ name: string; value: string | RegExp }>} [options] An array of attribute names to remove, or an array of objects with `name` and `value` properties.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/remove-attributes
  */
  removeAttributes: typeof removeAttributes;
  /**
  * Add attributes to elements in an HTML string.
  *
  * @param {string} html The HTML string to process.
  * @param {Record<string, unknown>} [options] A dictionary of attributes to add.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/add-attributes
  */
  addAttributes: typeof addAttributes;
  /**
  * Pretty-print an HTML string.
  *
  * @param {string} html The HTML string to prettify.
  * @param {HTMLBeautifyOptions} [options] A configuration object for `js-beautify`.
  * @returns {string} The prettified HTML string.
  * @see https://maizzle.com/docs/transformers/prettify
  */
  prettify: typeof prettify;
  /**
  * Prepend a string to sources and hrefs in an HTML string.
  *
  * @param {string} html The HTML string to process.
  * @param {string | BaseURLConfig} [options] A string to prepend to sources and hrefs, or a configuration object for `posthtml-base-url`.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/base-url
  */
  applyBaseURL: typeof applyBaseURL;
  /**
  * Append parameters to URLs in an HTML string.
  *
  * @param {string} html The HTML string to process.
  * @param {URLParametersConfig} [options] A configuration object for `posthtml-url-parameters`.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/url-parameters
  */
  addUrlParams: typeof addUrlParams;
  /**
  * Ensure that all HEX colors inside `bgcolor` and `color` attributes are defined with six digits.
  *
  * @param {string} html The HTML string to process.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/six-hex
  */
  sixHEX: typeof sixHEX;
  /**
  * Minify an HTML string, with email client considerations.
  *
  * @param {string} html The HTML string to minify.
  * @param {MinifyConfig} [options] A configuration object for `html-minifier`.
  * @returns {string} The minified HTML string.
  * @see https://maizzle.com/docs/transformers/minify
  */
  minify: typeof minify;
  /**
  * Batch-replace strings in an HTML string.
  *
  * @param {string} html The HTML string to process.
  * @param {Record<string, string>} [replacements] A dictionary of strings to replace.
  * @returns {string} The processed HTML string.
  * @see https://maizzle.com/docs/transformers/replace-strings
  */
  replaceStrings: typeof replaceStrings;
  /**
  * Generate a plaintext version of an HTML string.
  * @param {string} html - The HTML string to convert to plaintext.
  * @param {PlaintextConfig} [options] - A configuration object for the plaintext generator.
  * @returns {Promise<string>} The plaintext version of the HTML string.
  * @see https://maizzle.com/docs/plaintext
  */
  plaintext: typeof plaintext;
};

export default interface Events {
  /**
  * Runs after the Environment config has been computed, but before Templates are processed.
  * Exposes the `config` object so you can further customize it.
  *
  * @default undefined
  *
  * @example
  * ```
  * export default {
  *   beforeCreate: async ({config}) => {
  *     // do something with `config`
  *   }
  * }
  * ```
  */
  beforeCreate?: (params: { config: Config }) => void | Promise<void>;

  /**
  * Runs after the Template's config has been computed, but just before it is compiled.
  *
  * Must return the `html` string, otherwise the original will be used.
  *
  * @default undefined
  *
  * @example
  * ```
  * export default {
  *   beforeRender: async ({html, matter, config, posthtml, transform}) => {
  *     // do something...
  *     return html;
  *   }
  * }
  * ```
  */
  beforeRender?: (params: {
    /**
     * The Template's HTML string.
     */
    html: string;
    /**
     * The Template's Front Matter.
     */
    matter: { [key: string]: string };
    /**
     * The Template's computed config.
     */
    config: Config;
    /**
     * A function to process an HTML string with PostHTML.
     *
     * @param {string} html The HTML string to process.
     * @param {Config} config The Maizzle config object.
     */
    posthtml: PostHTMLType;
    /**
     * A collection of Maizzle Transformers.
     */
    transform: TransformType;
  }) => string | Promise<string>;

  /**
  * Runs after the Template has been compiled, but before any Transformers have been applied.
  *
  * Must return the `html` string, otherwise the original will be used.
  *
  * @default undefined
  *
  * @example
  * ```
  * export default {
  *   afterRender: async async ({html, matter, config, posthtml, transform}) => {
  *     // do something...
  *     return html;
  *   }
  * }
  * ```
  */
  afterRender?: (params: {
    /**
     * The Template's HTML string.
     */
    html: string;
    /**
     * The Template's Front Matter.
     */
    matter: { [key: string]: string };
    /**
     * The Template's computed config.
     */
    config: Config;
    /**
    * A function to process an HTML string with PostHTML.
    *
    * @param {string} html The HTML string to process.
    * @param {Config} config The Maizzle config object.
    */
    posthtml: PostHTMLType;
    /**
    * A collection of Maizzle Transformers.
    */
    transform: TransformType;
  }) => string | Promise<string>;

  /**
  * Runs after all Transformers have been applied, just before the final HTML is returned.
  *
  * Must return the `html` string, otherwise the original will be used.
  *
  * @default undefined
  *
  * @example
  * ```
  * export default {
  *   afterTransformers: async ({html, matter, config, posthtml, transform}) => {
  *     // do something...
  *     return html;
  *   }
  * }
  * ```
  */
  afterTransformers?: (params: {
    /**
     * The Template's HTML string.
     */
    html: string;
    /**
     * The Template's Front Matter.
     */
    matter: { [key: string]: string };
    /**
     * The Template's computed config.
     */
    config: Config;
    /**
    * A function to process an HTML string with PostHTML.
    *
    * @param {string} html The HTML string to process.
    * @param {Config} config The Maizzle config object.
    */
    posthtml: PostHTMLType;
    /**
    * A collection of Maizzle Transformers.
    */
    transform: TransformType;
  }) => string | Promise<string>;

  /**
  * Runs after all Templates have been compiled and output to disk.
  * `files` will contain the paths to all the files inside the `build.output.path` directory.
  *
  * @default undefined
  *
  * @example
  * ```
  * export default {
  *   afterBuild: async ({files, config, transform}) => {
  *     // do something...
  *   }
  * }
  * ```
  */
  afterBuild?: (params: {
    /**
     * An array of paths to all the files inside the `build.output.path` directory.
     */
    files: string[];
    /**
     * The Maizzle config object.
     */
    config: Config;
    /**
    * A collection of Maizzle Transformers.
    */
    transform: TransformType;
  }) => string | Promise<string>;
}
