import type { InlineConfig } from 'vite'
import type { Plugin, Directive } from 'vue'
import type { Options as MarkdownPluginOptions } from 'unplugin-vue-markdown/types'
import type { Options as JuiceOptions } from 'juice'

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
  inline?: boolean | JuiceOptions & {
    /**
     * Convert HTML attributes like `width`, `height`, `bgcolor`, and `valign`
     * to inline CSS styles. Set to `true` for all, or pass an array of attribute names.
     *
     * @default false
     */
    attributeToStyle?: boolean | string[]
    /**
     * Convert `0px`, `0em` etc. to `0` in inline styles.
     *
     * @default true
     */
    preferUnitlessValues?: boolean
    /**
     * CSS selectors to preserve in `<style>` tags, even after inlining.
     * Mapped to Juice's `preservedSelectors` option.
     *
     * @default []
     */
    safelist?: string[]
    /**
     * Duplicate CSS properties to HTML attributes.
     * Mapped to Juice's static `styleToAttribute` property.
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
     * Elements that can receive `width` HTML attributes.
     * Mapped to Juice's static `widthElements` property.
     *
     * @default ['img', 'video']
     */
    widthElements?: string[]
    /**
     * Elements that can receive `height` HTML attributes.
     * Mapped to Juice's static `heightElements` property.
     *
     * @default ['img', 'video']
     */
    heightElements?: string[]
    /**
     * CSS properties to exclude from inlining.
     * Mapped to Juice's static `excludedProperties` property.
     *
     * @default []
     */
    excludedProperties?: string[]
    /**
     * Template language code blocks to preserve during inlining.
     * Mapped to Juice's static `codeBlocks` property.
     *
     * @default { EJS: { start: '<%', end: '%>' }, HBS: { start: '\{\{', end: '}}' } }
     */
    codeBlocks?: Record<string, { start: string; end: string }>
    /**
     * Additional CSS string to inline alongside `<style>` tag contents.
     * Mapped to Juice's `extraCss` option.
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
   * Convert 3-digit HEX colors to 6-digit in `bgcolor` and `color` attributes.
   *
   * Some email clients don't support shorthand HEX like `#fff`.
   *
   * @default true
   */
  sixHex?: boolean
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

export interface MarkdownConfig extends MarkdownPluginOptions {
  /**
   * The shiki theme to use for syntax highlighting in Markdown fenced code blocks.
   *
   * @default 'github-light'
   */
  shikiTheme?: import('shiki').BundledTheme
}

export interface VueConfig {
  /** Vue plugins to register on the app instance before rendering. */
  plugins?: Plugin[]
  /** Custom Vue directives to register globally. */
  directives?: Record<string, Directive>
  /** Properties added to `app.config.globalProperties`, available in all templates. */
  globalProperties?: Record<string, unknown>
}

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
  /** Options for Markdown template support, extending `unplugin-vue-markdown`. */
  markdown?: MarkdownConfig
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
    /**
     * Email sending configuration for the "Send test" feature in the dev UI.
     *
     * When not configured, falls back to Ethereal (free fake SMTP — emails
     * are captured and viewable via a URL, never actually delivered).
     *
     * @example
     * server: {
     *   email: {
     *     to: ['test@example.com'],
     *     from: 'dev@maizzle.test',
     *     transport: {
     *       host: 'smtp.mailtrap.io',
     *       port: 587,
     *       auth: { user: '...', pass: '...' },
     *     },
     *   },
     * }
     */
    email?: {
      /** Default recipient(s). */
      to?: string | string[]
      /** Sender address. @default 'Maizzle <maizzle@ethereal.email>' */
      from?: string
      /** Default subject line. */
      subject?: string
      /** Nodemailer transport options (SMTP, SES, etc.). Omit to use Ethereal. */
      transport?: Record<string, unknown>
    }
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
  /**
   * Vite configuration options passed to the internal Vite SSR server.
   *
   * Use this to add custom Vite plugins or other Vite options.
   * If a `vite.config.{ts,js}` file exists in the project root, it takes
   * precedence and this option is used as a fallback.
   *
   * @example
   * vite: {
   *   plugins: [myPlugin()],
   * }
   */
  vite?: InlineConfig
  /**
   * Vue app customization options.
   *
   * Register plugins, directives, or global properties on the
   * internal Vue app instance used for SSR rendering.
   *
   * @example
   * vue: {
   *   plugins: [createI18n({ locale: 'en', messages })],
   *   directives: { focus: vFocus },
   *   globalProperties: { $format: dateFormat },
   * }
   */
  vue?: VueConfig

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
