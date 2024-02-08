import type {AttributeToStyleSupportedAttributes} from './inlineCss';
import type {Options as BrowserSyncConfig} from 'browser-sync';
import type BaseURLConfig from './baseURL';
import type BuildConfig from './build';
import type ComponentsConfig from './components';
import type Config from './config';
import type ExpressionsConfig from './expressions';
import type InlineCSSConfig from './inlineCss';
import type LayoutsConfig from './layouts';
import type MarkdownConfig from './markdown';
import type MinifyConfig from './minify';
import type PlaintextConfig from './plaintext';
import type PostHTMLConfig from './posthtml';
import type RenderOptions from './render';
import type {RenderOutput} from './render';
import type RemoveUnusedCSSConfig from './removeUnusedCss';
import type TailwindConfig from './tailwind';
import type TemplatesConfig from './templates';
import type URLParametersConfig from './urlParameters';
import type WidowWordsConfig from './widowWords';

import type {CoreBeautifyOptions} from 'js-beautify';
import type {Options as MarkdownItOptions} from 'markdown-it';

declare namespace MaizzleFramework {
  /**
  Compile an HTML string with Maizzle.

  @param {string} html The HTML string to render.
  @param {RenderOptions} [options] Options to pass to the renderer.
  */
  function render(html: string, options?: RenderOptions): Promise<RenderOutput>;

  /**
  Normalize escaped character class names like `\:` or `\/` by replacing them with email-safe alternatives.

  @param {string} html The HTML string to render.
  @param {object} replacements Customize replacements strategy.
   */
  function safeClassNames(html: string, replacements: Record<string, string>): string;

  /**
  Compile Markdown to HTML.

  @param {string} input String to compile with Markdown.
  @param {Options} [options] markdown-it options.
   */
  function markdown(input: string, options?: MarkdownItOptions): string;

  /**
  Prevent widow words inside a tag by adding a `&nbsp;` between its last two words.

  @param {string} html The HTML string to render.
  @param {WidowWordsConfig} [options] Options to pass to the transformer.
  */
  function preventWidows(html: string, options?: WidowWordsConfig): string;

  /**
  Duplicate HTML attributes to inline CSS.

  @param {string} html The HTML string to render.
  @param {AttributeToStyleSupportedAttributes} [options] Options to pass to the transformer.
  */
  function attributeToStyle(
    html: string,
    options?: AttributeToStyleSupportedAttributes[]
  ): string;

  /**
  Inline CSS styles from `<style>` tags found in `<head>`.

  @param {string} html The HTML string to render.
  @param {InlineCSSConfig} [options] Options to pass to the transformer.
  */
  function inlineCSS(html: string, options?: InlineCSSConfig): string;

  /**
  Rewrite longhand CSS inside style attributes with shorthand syntax.
  Only works with margin, padding and border, and only when all sides are specified.

  @param {string} html The HTML string to render.
  */
  function shorthandCSS(html: string): string;

  /**
  Remove unused CSS from `<style>` tags and HTML elements.

  @param {string} html The HTML string to use.
  @param {RemoveUnusedCSSConfig} [options] Options to pass to the transformer.
  */
  function removeUnusedCSS(html: string, options?: RemoveUnusedCSSConfig): string;

  /**
  Automatically remove HTML attributes.
  @param {string} html The HTML string to use.
  @param options Either an array of attribute names, or an array of objects with `name` and `value` properties.
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
  Add attributes to elements in your HTML.

  @param {string} html The HTML string to use.
  @param {object} options Attributes to add.
  */
  function addAttributes(html: string, options?: Record<string, unknown>): string;

  /**
  Pretty print HTML code so that it's nicely indented and more human-readable.
  @param {string} html The HTML string to prettify.
  @param {CoreBeautifyOptions} [options] Options to pass to the prettifier.
  */
  function prettify(html: string, options?: CoreBeautifyOptions): string;

  /**
  Prepend a string to sources and hrefs in an HTML string.

  @param {string} html The HTML string to use.
  @param {BaseURLConfig} [options] Options to pass to the transformer.
  */
  function applyBaseURL(html: string, options?: string | BaseURLConfig): string;

  /**
  Append parameters to URLs in an HTML string.
  @param {string} html The HTML string to use.
  @param {URLParametersConfig} [options] Options to pass to the transformer.
  */
  function addURLParameters(html: string, options?: URLParametersConfig): string;

  /**
  Ensure that all your HEX colors inside `bgcolor` and `color` attributes are defined with six digits.

  @param {string} html The HTML string to use.
  */
  function ensureSixHex(html: string): string;

  /**
  Minify a string of HTML code.

  @param {string} html The HTML string to minify.
  @param {MinifyConfig} [options] Options to pass to the minifier.
  */
  function minify(html: string, options?: MinifyConfig): string;

  /**
  Batch-replace strings in an HTML string.

  @param {string} html The HTML string to use.
  @param {object} replacements Strings to find and replace.
  */
  function replaceStrings(html: string, replacements?: Record<string, string>): string;

  /**
  Generate a plaintext version of an HTML string.

  @param {string} html The HTML string to use.
  @param {PlaintextConfig} [options] Options to pass to the plaintext generator.
  */
  function plaintext(html: string, options?: PlaintextConfig): Promise<{
    html: string;
    plaintext: string;
    destination: string;
  }>;

  export {
    AttributeToStyleSupportedAttributes,
    BaseURLConfig,
    BrowserSyncConfig,
    BuildConfig,
    ComponentsConfig,
    Config,
    ExpressionsConfig,
    InlineCSSConfig,
    LayoutsConfig,
    MarkdownConfig,
    MinifyConfig,
    PlaintextConfig,
    PostHTMLConfig,
    RemoveUnusedCSSConfig,
    RenderOptions,
    RenderOutput,
    TailwindConfig,
    TemplatesConfig,
    URLParametersConfig,
    WidowWordsConfig,
    // Functions
    addAttributes,
    addURLParameters,
    applyBaseURL,
    attributeToStyle,
    ensureSixHex,
    inlineCSS,
    markdown,
    minify,
    plaintext,
    preventWidows,
    prettify,
    removeAttributes,
    removeUnusedCSS,
    render,
    replaceStrings,
    safeClassNames,
    shorthandCSS
  };
}
