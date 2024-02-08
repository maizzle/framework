import type BuildConfig from './build';
import type InlineCSSConfig from './inlineCss';
import type RemoveUnusedCSSConfig from './removeUnusedCss';
import type WidowWordsConfig from './widowWords';
import type BaseURLConfig from './baseURL';
import type URLParametersConfig from './urlParameters';
import type {CoreBeautifyOptions} from 'js-beautify';
import type MinifyConfig from './minify';
import type MarkdownConfig from './markdown';

export default interface Config {
  [key: string]: any;

  /**
  Configure build settings.

  @example
  ```
  module.exports = {
    build: {
      templates: TemplatesConfig,
      tailwind: TailwindConfig,
      layouts: LayoutsTypes,
      components: ComponentsConfig,
      posthtml: PostHTMLConfig,
      browsersync: BrowserSyncConfig,
      fail: 'silent' // or 'verbose'
    }
  }
  ```
  */
  build: BuildConfig;

  /**
  Toggle the use of Transformers.

  @default true

  @example
  ```
  module.exports = {
    applyTransformers: false,
  }
  ```
  */
  applyTransformers?: boolean;

  /**
  Configure CSS inlining.

  To enable it with defaults, simply set it to `true`.
  @example
  ```js
  module.exports = {
    inlineCSS: true,
  }
  ```
  */
  inlineCSS?: boolean | InlineCSSConfig;

  /**
  Configure unused CSS purging.

  To enable it with defaults, simply set it to `true`.
  @example
  ```
  module.exports = {
    removeUnusedCSS: true,
  }
  ```
  */
  removeUnusedCSS?: boolean | RemoveUnusedCSSConfig;

  /**
  Automatically remove HTML attributes.

  By default, empty `style` and `class` attributes are removed.

  @default ['style', 'class']

  @example
  ```
  module.exports = {
    removeAttributes: ['data-src']
  }
  ```
  */
  removeAttributes?:
  | string[]
  | Array<{
    name: string;
    value: string | RegExp;
  }>;

  /**
  Prevent widow words inside a tag by adding a `&nbsp;` between its last two words.

  @example
  ```
  module.exports = {
    widowWords: true,
  }
  ```
  */
  widowWords?: WidowWordsConfig;

  /**
  [Add attributes](https://maizzle.com/docs/transformers/add-attributes) to elements in your HTML.

  @default
    {
      table: {
        cellpadding: 0,
        cellspacing: 0,
        role: 'none'
      },
      img: {
        alt: ''
      },
    }
  */
  extraAttributes?: boolean | Record<string, unknown>;

  /**
  Normalize escaped character class names like `\:` or `\/` by replacing them with email-safe alternatives.

  @example
  ```
  module.exports = {
    safeClassNames: {
      ':': '__',
      '!': 'i-',
    }
  }
  ```
  */
  safeClassNames?: boolean | Record<string, string>;

  /**
  Rewrite longhand CSS inside style attributes with shorthand syntax.
  Only works with margin, padding and border, and only when all sides are specified.

  @default []

  @example
  ```
  module.exports = {
    shorthandCSS: true, // or ['td', 'div'] to only apply to those tags
  }
  ```
  */
  shorthandCSS?: boolean | string[];

  /**
  Define a string that will be prepended to sources and hrefs in your HTML and CSS.

  @example

  Prepend to all sources and hrefs:

  ```
  module.exports = {
    baseURL: 'https://cdn.example.com/'
  }
  ```

  Prepend only to `src` attributes on image tags:

  ```
  module.exports = {
    baseURL: {
      url: 'https://cdn.example.com/',
      tags: ['img'],
    },
  }
  ```
  */
  baseURL?: string | BaseURLConfig;

  /**
  Transform text inside elements marked with custom attributes.

  Filters work only on elements that contain only text.

  @default {}

  @example
  ```
  module.exports = {
    filters: {
      uppercase: str => str.toUpperCase()
    }
  }
  ```
  */
  filters: Record<string, unknown>;

  /**
  Define variables outside of the `page` object.

  @default {}

  @example
  ```
  module.exports = {
    locals: {
      company: {
        name: 'Spacely Space Sprockets, Inc.'
      }
    }
  }
  ```

  `company` can be then used like this:

  ```
  <p>{{ company.name }}</p>
  ```
  */
  locals?: Record<string, unknown>;

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
  Ensure that all your HEX colors inside `bgcolor` and `color` attributes are defined with six digits.

  @default true

  @example
  ```
  module.exports = {
    sixHex: false,
  }
  ```
  */
  sixHex?: boolean;

  /**
  [Pretty print](https://maizzle.com/docs/transformers/prettify) your HTML email code so that it's nicely indented and more human-readable.

  @default undefined

  @example
  ```
  module.exports = {
    prettify: true,
  }
  ```
  */
  prettify?: boolean | CoreBeautifyOptions;

  /**
  Minify the compiled HTML email code.

  @default false

  @example
  ```
  module.exports = {
    minify: true,
  }
  ```
  */
  minify?: boolean | MinifyConfig;

  /**
  Configure the Markdown parser.

  @example

  ```
  module.exports = {
    markdown: {
      root: './', // A path relative to which markdown files are imported
      encoding: 'utf8', // Encoding for imported Markdown files
      markdownit: {}, // Options passed to markdown-it
      plugins: [], // Plugins for markdown-it
    }
  }
  ```
  */
  markdown?: MarkdownConfig;

  /**
  Batch-replace strings in your HTML.

  @default {}

  @example
  ```
  module.exports = {
    replaceStrings: {
      'replace this exact string': 'with this one',
      '\\s?data-src=""': '', // remove empty data-src="" attributes
    }
  }
  ```
  */
  replaceStrings?: Record<string, string>;
}
