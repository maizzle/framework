export interface UrlQueryOptions {
  /**
   * CSS selectors for elements to process.
   *
   * @default ['a']
   */
  tags?: string[]
  /**
   * HTML attributes containing URLs to append query params to.
   *
   * @default ['src', 'href', 'poster', 'srcset', 'background']
   */
  attributes?: string[]
  /**
   * When `true`, only appends query params to absolute URLs.
   *
   * @default true
   */
  strict?: boolean
  /**
   * Options forwarded to the `query-string` library for controlling serialization.
   *
   * @default { encode: false }
   */
  qs?: Record<string, unknown>
}

export type UrlQuery = Record<string, unknown> & {
  _options?: UrlQueryOptions
}

export interface UrlConfig {
  /**
   * Append query parameters to URLs in your HTML.
   *
   * @example
   * url: {
   *   query: {
   *     utm_source: 'maizzle',
   *     utm_medium: 'email',
   *   }
   * }
   */
  query?: UrlQuery
  /**
   * Prepend a base URL to relative paths.
   *
   * Pass a string to prepend to all tags, or an object for fine-grained control.
   *
   * @example
   * url: {
   *   base: 'https://cdn.example.com/emails/',
   * }
   */
  base?: string | {
    /** The base URL to prepend. */
    url?: string
    /** Tags or tag-attribute map to process. */
    tags?: string[] | Record<string, Record<string, string | boolean>>
    /** Attributes to process. */
    attributes?: Record<string, string>
    /** Also apply to URLs in `<style>` tags. */
    styleTag?: boolean
    /** Also apply to URLs in inline `style` attributes. */
    inlineCss?: boolean
  }
}

export interface CssConfig {
  /**
   * Base directory for Tailwind CSS `@source` resolution.
   *
   * Automatically set to `root` when `root` is configured.
   */
  base?: string
  /**
   * Remove unused CSS.
   *
   * Set to `true` to enable with defaults, or pass an options object.
   *
   * @default false
   */
  purge?: boolean | Record<string, unknown>
  /**
   * Inline CSS from `<style>` tags into matching HTML elements.
   *
   * Set to `true` to enable with defaults, or pass an options object for fine-grained control.
   *
   * @example
   * css: {
   *   inline: {
   *     removeStyleTags: true,
   *     applyWidthAttributes: true,
   *   }
   * }
   */
  inline?: boolean | {
    /**
     * Convert HTML attributes like `width`, `height`, `bgcolor`, and `valign`
     * to inline CSS styles. Set to `true` for all, or pass an array of attribute names.
     *
     * @default false
     */
    attributeToStyle?: boolean | string[]
    /**
     * Remove `<style>` tags after inlining.
     *
     * @default false
     */
    removeStyleTags?: boolean
    /**
     * Remove selectors from `<style>` tags after they have been inlined.
     *
     * @default true
     */
    removeInlinedSelectors?: boolean
    /**
     * Convert `0px`, `0em` etc. to `0` in inline styles.
     *
     * @default true
     */
    preferUnitlessValues?: boolean
    /**
     * CSS selectors to preserve in `<style>` tags, even after inlining.
     *
     * @default []
     */
    safelist?: string[]
    /**
     * Duplicate CSS properties to HTML attributes.
     *
     * @default {}
     *
     * @example
     * styleToAttribute: {
     *   'background-color': 'bgcolor',
     * }
     */
    styleToAttribute?: Record<string, string>
    /**
     * Add `width` HTML attributes based on inline CSS width values.
     *
     * @default true
     */
    applyWidthAttributes?: boolean
    /**
     * Add `height` HTML attributes based on inline CSS height values.
     *
     * @default true
     */
    applyHeightAttributes?: boolean
    /**
     * Elements that can receive `width` HTML attributes.
     *
     * @default ['img', 'video']
     */
    widthElements?: string[]
    /**
     * Elements that can receive `height` HTML attributes.
     *
     * @default ['img', 'video']
     */
    heightElements?: string[]
    /**
     * CSS properties to exclude from inlining.
     *
     * @default []
     */
    excludedProperties?: string[]
    /**
     * Template language code blocks to preserve during inlining.
     *
     * @default { EJS: { start: '<%', end: '%>' }, HBS: { start: '\{\{', end: '}}' } }
     */
    codeBlocks?: Record<string, { start: string; end: string }>
    /**
     * Additional CSS string to inline alongside `<style>` tag contents.
     */
    customCSS?: string
  }
  /**
   * Merge duplicate `@media` queries and sort them.
   *
   * Enabled by default. Set to `false` to disable, or pass an object to control sort order.
   *
   * @default true
   *
   * @example
   * css: {
   *   media: { sort: 'desktop-first' },
   * }
   */
  media?: boolean | {
    /**
     * Sort order for media queries.
     *
     * @default 'mobile-first'
     */
    sort?: 'mobile-first' | 'desktop-first' | ((a: string, b: string) => number)
  }
  /**
   * Convert unitless CSS values to their unitless equivalents.
   *
   * For example, `line-height: 24px` with a `16px` font becomes `line-height: 1.5`.
   *
   * @default true
   */
  preferUnitless?: boolean
  /**
   * Resolve CSS `calc()` expressions to static values where possible.
   *
   * @default true
   */
  resolveCalc?: boolean
  /**
   * Resolve CSS custom properties (`var()`) to their computed values.
   *
   * @default true
   */
  resolveProps?: boolean
  /**
   * Replace unsafe CSS class names with email-safe equivalents.
   *
   * @default true
   */
  safe?: boolean | Record<string, string>
  /**
   * Rewrite longhand CSS to shorthand where possible.
   *
   * For example, `padding: 10px 20px 10px 20px` becomes `padding: 10px 20px`.
   *
   * @default false
   */
  shorthand?: boolean | { tags?: string[] }
  /**
   * Remove specific CSS declarations by selector.
   *
   * @example
   * css: {
   *   removeDeclarations: {
   *     ':root': '*',
   *   }
   * }
   */
  removeDeclarations?: Record<string, import('../plugins/postcss/removeDeclarations.ts').RemoveValue>
  /**
   * File paths to exclude from CSS processing.
   *
   * @example
   * css: {
   *   exclude: ['emails/amp/**'],
   * }
   */
  exclude?: string[]
}

export interface AttributesConfig {
  /**
   * Add attributes to HTML elements.
   *
   * @example
   * html: {
   *   attributes: {
   *     add: {
   *       table: { cellpadding: 0, cellspacing: 0, role: 'none' },
   *       img: { alt: '' },
   *     }
   *   }
   * }
   */
  add?: false | Record<string, Record<string, string | boolean | number>>
  /**
   * Remove attributes from HTML elements by name or name-value pair.
   *
   * @example
   * html: {
   *   attributes: {
   *     remove: ['data-test', { name: 'class', value: /^js-/ }],
   *   }
   * }
   */
  remove?: Array<string | { name: string; value?: string | RegExp }>
}

export type EntitiesConfig = boolean | Record<string, string>

export interface PostcssConfig {
  /**
   * Selector prefixes to strip from compiled CSS.
   *
   * @default [':host', ':lang']
   *
   * @example
   * postcss: {
   *   removeSelectors: [':host', ':lang', ':root'],
   * }
   */
  removeSelectors?: string[]
  /**
   * At-rule names to strip from compiled CSS.
   *
   * @default ['layer', 'property']
   *
   * @example
   * postcss: {
   *   removeAtRules: ['layer', 'property', 'charset'],
   * }
   */
  removeAtRules?: string[]
}

export interface HtmlConfig {
  /** Configure HTML attribute transformations. */
  attributes?: AttributesConfig
  /**
   * Decode HTML entities.
   *
   * Set to `true` to decode all, or pass a map of entities to decode.
   *
   * @default true
   */
  decodeEntities?: EntitiesConfig
  /**
   * Pretty-print the HTML output.
   *
   * Set to `true` to enable with defaults, or pass options.
   */
  format?: boolean | import('oxfmt').FormatOptions
  /**
   * Minify the HTML output.
   *
   * Set to `true` to enable with defaults, or pass options.
   */
  minify?: boolean | Record<string, unknown>
}

export type FilterFunction = (str: string, value: string) => string
export type FiltersConfig = false | Record<string, FilterFunction>

export interface MaizzleConfig {
  /**
   * Root directory for the Maizzle email project.
   *
   * When set, relative paths for `content`, `static.source`,
   * and `css.base` are all resolved relative to this directory.
   *
   * Defaults to `process.cwd()`.
   *
   * @example
   * maizzle({
   *   root: 'resources/js/emails',
   *   content: ['./**\/*.vue'],
   * })
   */
  root?: string
  /** Options passed to `unplugin-vue-markdown` for Markdown template support. */
  markdown?: import('unplugin-vue-markdown/types').Options
  /**
   * Glob patterns for email template files to process.
   *
   * Resolved relative to `root`.
   *
   * @default ['emails/**\/*.{vue,md}']
   */
  content?: string[]
  /** Output configuration for built email templates. */
  output?: {
    /**
     * Directory to write compiled HTML files to.
     *
     * @default 'dist'
     */
    path?: string
    /**
     * File extension for compiled templates.
     *
     * @default 'html'
     *
     * @example
     * output: {
     *   extension: 'blade.php',
     * }
     */
    extension?: string
  }
  /** Static file copying configuration. */
  static?: {
    /**
     * Glob patterns for static files to copy to the output directory.
     *
     * @default ['public/**\/*.*']
     */
    source?: string[]
    /**
     * Subdirectory in the output folder where static files are placed.
     *
     * @default 'public'
     */
    destination?: string
  }
  /** Component auto-import configuration. */
  components?: {
    /**
     * Additional directories to scan for auto-imported Vue components.
     *
     * Resolved relative to `cwd` (not `root`), so paths outside the
     * email root directory work as expected.
     *
     * @example
     * components: {
     *   source: ['resources/js/components/email'],
     * }
     */
    source?: string | string[]
  }
  /** Dev server configuration. */
  server?: {
    /**
     * Port for the dev server.
     *
     * @default 3000
     */
    port?: number
    /**
     * Additional file paths to watch for changes.
     *
     * @default []
     *
     * @example
     * server: {
     *   watch: ['./tailwind.config.ts'],
     * }
     */
    watch?: string[]
  }
  /** Tailwind CSS and email CSS optimization settings. */
  css?: CssConfig
  /**
   * Generate a plaintext version of the email.
   *
   * Set to `true` to enable, or pass a string path or options object.
   *
   * @default false
   */
  plaintext?: boolean | string | Record<string, unknown>
  /** PostCSS processing options. */
  postcss?: PostcssConfig
  /**
   * Enable the transformer pipeline (CSS inlining, purging, shorthand, etc).
   *
   * @default true
   */
  useTransformers?: boolean
  /**
   * Replace strings in the final HTML output.
   *
   * @example
   * replaceStrings: {
   *   '{{ year }}': new Date().getFullYear().toString(),
   * }
   */
  replaceStrings?: Record<string, string>
  /**
   * Content filters that transform text inside HTML elements using custom attributes.
   *
   * Set to `false` to disable all filters. Pass an object to add custom filters
   * (merged with built-in defaults).
   *
   * @example
   * filters: {
   *   uppercase: str => str.toUpperCase(),
   * }
   */
  filters?: FiltersConfig
  /** URL transformation settings (base URL, query string appending). */
  url?: UrlConfig
  /** HTML post-processing settings (attributes, formatting, minification). */
  html?: HtmlConfig

  // Events

  /** Called before any templates are processed. */
  beforeCreate?: (params: { config: MaizzleConfig }) => void | Promise<void>
  /** Called before each template is rendered. Return a string to replace the template source. */
  beforeRender?: (params: { config: MaizzleConfig; template: string }) => string | void | Promise<string | void>
  /** Called after each template is rendered but before transformers run. Return a string to replace the output HTML. */
  afterRender?: (params: { config: MaizzleConfig; template: string; html: string }) => string | void | Promise<string | void>
  /** Called after transformers have run on each template. Return a string to replace the output HTML. */
  afterTransform?: (params: { config: MaizzleConfig; template: string; html: string }) => string | void | Promise<string | void>
  /** Called after all templates have been built. */
  afterBuild?: (params: { files: string[]; config: MaizzleConfig }) => void | Promise<void>

  // Allow arbitrary user data
  [key: string]: any
}
