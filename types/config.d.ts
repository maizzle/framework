import type Events from './events';
import type BuildConfig from './build';
import type MinifyConfig from './minify';
import type PostHTMLConfig from './posthtml';
import type MarkdownConfig from './markdown';
import type { ProcessOptions } from 'postcss';
import type PurgeCSSConfig from './css/purge';
import type PlaintextConfig from './plaintext';
import type CSSInlineConfig from './css/inline';
import type { SpinnerName } from 'cli-spinners';
import type WidowWordsConfig from './widowWords';
import type { CoreBeautifyOptions } from 'js-beautify';
import type { BaseURLConfig } from 'posthtml-base-url';
import type URLParametersConfig from './urlParameters';
import type { PostCssCalcOptions } from 'postcss-calc';
import type { PostHTMLFetchConfig } from 'posthtml-fetch';
import type { Config as TailwindConfig } from 'tailwindcss';
import type { PostHTMLComponents } from 'posthtml-component';
import type { PostHTMLExpressions } from 'posthtml-expressions';

export default interface Config {
  /**
   * Add or remove attributes from elements.
   */
  attributes?: {
    /**
     * Add attributes to specific elements.
     *
     * @default {}
     *
     * @example
     * ```
     * export default {
     *   attributes: {
     *     add: {
     *       table: {
     *         cellpadding: 0,
     *         cellspacing: 0,
     *       }
     *     }
     *   }
     * }
     * ```
     */
    add?: Record<string, Record<string, string | number>>;

    /**
     * Remove attributes from elements.
     *
     * @default {}
     *
     * @example
     * ```
     * export default {
     *   attributes: {
     *     remove: [
     *      {
     *        name: 'width',
     *        value: '100', // or RegExp: /\d/
     *      },
     *     ], // or as array: ['width', 'height']
     *   }
     * }
     * ```
     */
    remove?: Array<string | { name: string; value: string | RegExp }>;
  }

  /**
   * Configure build settings.
   */
  build?: BuildConfig;

  /**
  Define a string that will be prepended to sources and hrefs in your HTML and CSS.

  @example

  Prepend to all sources and hrefs:

  ```
  export default {
    baseURL: 'https://cdn.example.com/'
  }
  ```

  Prepend only to `src` attributes on image tags:

  ```
  export default {
    baseURL: {
      url: 'https://cdn.example.com/',
      tags: ['img'],
    },
  }
  ```
  */
  baseURL?: string | BaseURLConfig;

  /**
   * Configure components.
   */
  components?: PostHTMLComponents;

  /**
   * Configure how CSS is handled.
   */
  css?: {
    /**
     * Configure CSS inlining.
     */
    inline?: CSSInlineConfig;

    /**
     * Configure CSS purging.
     */
    purge?: PurgeCSSConfig;

    /**
     * Resolve CSS `calc()` expressions to their static values.
     */
    resolveCalc?: boolean | PostCssCalcOptions;

    /**
     * Resolve CSS custom properties to their static values.
     */
    resolveProps?: boolean | {
      /**
       * Whether to preserve custom properties in the output.
       *
       * @default false
       */
      preserve?: boolean | 'computed';
      /**
       * Define CSS variables that will be added to :root.
       *
       * @default {}
       */
      variables?: {
        [key: string]: string | {
          /**
           * The value of the CSS variable.
           */
          value: string;
          /**
           * Whether the variable is !important.
           */
          isImportant?: boolean;
        };
      };
      /**
       * Whether to preserve variables injected via JS with the `variables` option.
       *
       * @default true
       */
      preserveInjectedVariables?: boolean;
      /**
       * Whether to preserve `@media` rules order.
       *
       * @default false
       */
      preserveAtRulesOrder?: boolean;
    };

    /**
     * Normalize escaped character class names like `\:` or `\/` by replacing them
     * with email-safe alternatives.
     *
     * @example
     * ```
     * export default {
     *   css: {
     *     safe: {
     *       ':': '__',
     *       '!': 'i-',
     *     }
     *   }
     * }
     * ```
     */
    safe?: boolean | Record<string, string>;

    /**
     * Rewrite longhand CSS inside style attributes with shorthand syntax.
     * Only works with `margin`, `padding` and `border`, and only when
     * all sides are specified.
     *
     * @default []
     *
     * @example
     * ```
     * export default {
     *   css: {
     *     shorthand: {
     *       tags: ['td', 'div'],
     *     } // or shorthand: true
     *   }
     * }
     * ```
     */
    shorthand?: boolean | Record<string, string[]>;

    /**
     * Ensure that all your HEX colors inside `bgcolor` and `color` attributes are defined with six digits.
     *
     * @default true
     *
     * @example
     * ```
     * export default {
     *   css: {
     *     sixHex: false,
     *   }
     * }
     * ```
     */
    sixHex?: boolean;

    /**
     * Use a custom Tailwind CSS configuration object.
     */
    tailwind?: TailwindConfig;
  }

  /**
  Configure [posthtml-expressions](https://github.com/posthtml/posthtml-expressions) options.
  */
  expressions?: PostHTMLExpressions;

  /**
   * Configure the [`<fetch>`](https://maizzle.com/docs/tags#fetch) tag.
   */
  fetch?: PostHTMLFetchConfig;

  /**
   * Transform text inside elements marked with custom attributes.
   * Filters work only on elements that contain only text.
   *
   * @default {}
   *
   * @example
   * ```
   * export default {
   *   filters: {
   *     uppercase: str => str.toUpperCase(),
   *   }
   * }
   * ```
   */
  filters?: boolean | Record<string, (str: string) => string>;

  /**
   * Define variables outside of the `page` object.
   *
   * @default {}
   *
   * @example
   * ```
   * export default {
   *   locals: {
   *     company: {
   *       name: 'Spacely Space Sprockets, Inc.'
   *     }
   *   }
   * }
   * ```
   *
   * `company` can then be used like this:
   *
   * ```
   * <p>{{ company.name }}</p>
   * ```
   */
  locals?: Record<string, any>;

  /**
   * Configure the Markdown parser.
   *
   * @example
   *
   * ```
   * export default {
   *   markdown: {
   *     root: './', // Path relative to which markdown files are imported
   *     encoding: 'utf8', // Encoding for imported Markdown files
   *     markdownit: {}, // Options passed to markdown-it
   *     plugins: [], // Plugins for markdown-it
   *   }
   * }
   * ```
   */
  markdown?: MarkdownConfig;

  /**
   * Minify the compiled HTML email code.
   *
   * @default false
   *
   * @example
   * ```
   * export default {
   *   minify: true,
   * }
   * ```
   */
  minify?: boolean | MinifyConfig;

  /**
  Configure the `posthtml-mso` plugin.
  */
  outlook?: {
    /**
    The tag name to use for Outlook conditional comments.

    @default 'outlook'

    @example
    ```
    export default {
      outlook: {
        tag: 'mso'
      }
    }
    // You now write <mso>...</mso> instead of <outlook>...</outlook>
    ```
    */
    tag?: string;
  };

  /**
   * Configure plaintext generation.
   */
  plaintext?: PlaintextConfig;

  /**
   * PostHTML configuration.
   */
  posthtml?: PostHTMLConfig;

  /**
   * Configure PostCSS
   */
  postcss?: {
    /**
     * Additional PostCSS plugins that you would like to use.
     * @default []
     * @example
     * ```
     * import examplePlugin from 'postcss-example-plugin'
     * export default {
     *   postcss: {
     *     plugins: [
     *       examplePlugin()
     *     ]
     *   }
     * }
     * ```
     */
    plugins?: Array<() => void>;

    /**
     * PostCSS options
     * @default {}
     * @example
     * ```
     * export default {
     *  postcss: {
     *   options: {
     *     map: true
     *   }
     * }
     * ```
     */
    options?: ProcessOptions;
  };

  /**
   * [Pretty print](https://maizzle.com/docs/transformers/prettify) your HTML email code
   * so that it's nicely indented and more human-readable.
   *
   * @default undefined
   *
   * @example
   * ```
   * export default {
   *   prettify: true,
   * }
   * ```
   */
  prettify?: boolean | CoreBeautifyOptions;

  /**
   * Batch-replace strings in your HTML.
   *
   * @default {}
   *
   * @example
   * ```
   * export default {
   *   replaceStrings: {
   *     'replace this exact string': 'with this one',
   *     '\\s?data-src=""': '', // remove empty data-src="" attributes
   *   }
   * }
   * ```
   */
  replaceStrings?: Record<string, string>;

  /**
   * Configure local server settings.
   */
  server?: {
    /**
     * Port to run the local server on.
     *
     * @default 3000
     */
    port?: number;

    /**
     * Enable HMR-like local development.
     * When enabled, Maizzle will watch for changes in your templates
     * and inject them into the browser without a full page reload.
     *
     * @default true
     */
    hmr?: boolean;

    /**
     * Enable synchronized scrolling across browser tabs.
     *
     * @default false
     */
    scrollSync?: boolean;

    /**
     * Paths to watch for changes.
     * When a file in these paths changes, Maizzle will do a full rebuild.
     *
     * @default []
     */
    watch?: string[];

    /**
     * Toggle reporting compiled file size in the console.
     *
     * @default false
     */
    reportFileSize?: boolean;

    /**
     * Type of spinner to show in the console.
     *
     * @default 'circleHalves'
     *
     * @example
     * ```
     * export default {
     *   server: {
     *     spinner: 'bounce'
     *   }
     * }
     * ```
     */
    spinner?: SpinnerName;
  }

  /**
  Configure custom parameters to append to URLs.

  @example
  ```
  module.exports = {
    urlParameters: {
      _options: {
        tags: ['a'],
        qs: {}, // options for the `query-string` library
      },
      utm_source: 'maizzle',
      utm_campaign: 'Campaign Name',
      utm_medium: 'email',
      custom_parameter: 'foo',
      '1stOfApril': 'bar',
    }
  }
  ```
  */
  urlParameters?: URLParametersConfig;

  /**
   * Enable or disable all Transformers.
   *
   * @default true
   *
   * @example
   * ```
   * export default {
   *   useTransformers: false,
   * }
   * ```
  */
  useTransformers?: boolean;

  /**
   * Prevent widow words inside a tag by adding a `&nbsp;` between its last two words.
   *
   * @default
   * {
   *   minWordCount: 3,
   *   attrName: 'prevent-widows'
   * }
   *
   * @example
   * ```
   * export default {
   *   widowWords: {
   *     minWordCount: 5,
   *   },
   * }
   * ```
   */
  widowWords?: WidowWordsConfig;

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
  beforeCreate?: Events['beforeCreate'];

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
  beforeRender?: Events['beforeRender'];

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
  *   afterRender: async ({html, matter, config, posthtml, transform}) => {
  *     // do something...
  *     return html;
  *   }
  * }
  * ```
  */
  afterRender?: Events['afterRender'];

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
  afterTransformers?: Events['afterTransformers'];

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
  afterBuild?: Events['afterBuild'];

  [key: string]: any;
}
