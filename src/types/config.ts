import type { InlineConfig } from 'vite'
import type { Plugin, Directive } from 'vue'
import type { Options as MarkdownPluginOptions } from 'unplugin-vue-markdown/types'
import type juice from 'juice'

type JuiceOptions = NonNullable<Parameters<typeof juice>[1]>
import type { TemplateInfo } from '../events/index.ts'

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
   * Strip units from zero values in inlined styles.
   *
   * For example, `padding: 0px 16px` becomes `padding: 0 16px`.
   *
   * @default true
   */
  preferUnitless?: boolean
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
   * Glob patterns or paths excluded from Tailwind's `@source` scanner.
   *
   * Tailwind won't generate utilities for classes used in these files.
   * Useful for ignoring AMP variants or any templates whose classes
   * shouldn't end up in the output CSS.
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
   * Set the whole map to `false` to disable auto-add. Set a selector
   * entry to `false` to skip that selector. Set an individual attribute
   * to `false` to skip just that attribute while keeping the rest.
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
  add?: false | Record<string, false | Record<string, false | string | boolean | number>>
  /**
   * Remove attributes from HTML elements.
   *
   * Empty `style` and `class` attributes are always stripped, regardless
   * of config. Entries added here are appended to those defaults.
   *
   * - String — remove when the attribute's value is empty.
   * - `{ name, value: 'literal' }` — remove when the value matches exactly.
   * - `{ name, value: /regex/ }` — remove when the value matches the regex.
   *
   * @example
   * html: {
   *   attributes: {
   *     remove: [
   *       'data-foo',
   *       { name: 'role', value: 'none' },
   *       { name: 'class', value: /^js-/ },
   *     ],
   *   }
   * }
   */
  remove?: Array<string | { name: string; value?: string | RegExp }>
}

export type EntitiesConfig = boolean | Record<string, string>

/**
 * caniemail.com client family slugs. Maintained manually from
 * https://www.caniemail.com/api/data.json — update this list when caniemail
 * adds new clients.
 */
export type CaniemailClient =
  | 'gmail' | 'outlook' | 'yahoo' | 'apple-mail'
  | 'aol' | 'thunderbird' | 'microsoft' | 'samsung-email'
  | 'sfr' | 'orange' | 'protonmail' | 'hey' | 'mail-ru'
  | 'fastmail' | 'laposte' | 't-online-de' | 'free-fr'
  | 'gmx' | 'web-de' | 'ionos-1and1' | 'rainloop' | 'wp-pl'

export interface ChecksConfig {
  /**
   * Client families to check against. Defaults to the four majors:
   * Gmail, Apple Mail, Outlook, Yahoo. Pass `'all'` to check every client
   * in the caniemail dataset.
   */
  clients?: CaniemailClient[] | 'all'
  /**
   * Filter which severities are reported. Omit to show everything.
   *
   * - `'error'` — only errors (unsupported features, hard lint errors)
   * - `'warning'` — only warnings (partial / unknown support, lint warnings)
   * - `'lint'` — only lint items (both severities, no compat items)
   */
  level?: 'error' | 'warning' | 'lint'
}

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
  format?: boolean | import('oxfmt').FormatConfig
  /**
   * Minify the HTML output.
   *
   * Set to `true` to enable with defaults, or pass `html-crush`
   * options to customize.
   *
   * @see https://codsen.com/os/html-crush
   */
  minify?: boolean | Partial<import('html-crush').Opts>
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
  /**
   * Vue plugins to register on the app instance before rendering.
   *
   * Pass a factory (`() => Plugin[]`) for stateful plugins like vue-i18n
   * or Pinia to get a fresh instance per render — otherwise state leaks
   * across templates (e.g. one template setting `locale.value = 'fr'`
   * affects the next render).
   */
  plugins?: Plugin[] | (() => Plugin[])
  /** Custom Vue directives to register globally. */
  directives?: Record<string, Directive>
  /** Properties added to `app.config.globalProperties`, available in all templates. */
  globalProperties?: Record<string, unknown>
}

/**
 * Per-transformer toggle map for `useTransformers`.
 *
 * - `false` skips the listed transformer.
 * - `true` force-enables it for this run (only meaningful for boolean-driven
 *   transformers: inlineCss, purgeCss, prettify, minify, shorthandCss,
 *   sixHex, safeSelectors, entities). Layers on the matching
 *   `css.*` / `html.*` config slice.
 * - missing keys keep their default behavior.
 *
 * Data-driven transformers (filters, baseURL, urlQuery, addAttributes,
 * removeAttributes, replaceStrings, attributeToStyle) require actual
 * config values — a bare `true` is a no-op for them.
 *
 * Transformers without a toggle (Tailwind, MSO placeholder resolution,
 * column width math, link inlining) always run; they're driven by markup
 * or framework state, not user opt-in.
 */
export interface TransformerToggles {
  safeSelectors?: boolean
  attributeToStyle?: boolean
  inlineCss?: boolean
  removeAttributes?: boolean
  shorthandCss?: boolean
  sixHex?: boolean
  addAttributes?: boolean
  filters?: boolean
  baseURL?: boolean
  urlQuery?: boolean
  purgeCss?: boolean
  entities?: boolean
  replaceStrings?: boolean
  prettify?: boolean
  minify?: boolean
}

/**
 * Plaintext generation options.
 *
 * Control where plaintext files are written, what extension they use,
 * and the options forwarded to `string-strip-html`.
 */
export interface PlaintextConfig {
  /**
   * Output directory for plaintext files. When omitted, files are written
   * next to their HTML counterpart in `build.output.path`.
   */
  destination?: string
  /**
   * File extension for plaintext files (without the leading dot).
   *
   * @default 'txt'
   */
  extension?: string
  /**
   * Options forwarded to `string-strip-html`.
   *
   * @see https://codsen.com/os/string-strip-html
   */
  options?: Partial<import('string-strip-html').Opts>
}

/**
 * Source directory entry for component auto-import.
 *
 * String → folder name becomes a namespace prefix automatically
 * (e.g. `widgets/Button.vue` → `<WidgetsButton />`).
 *
 * Object → custom prefix overrides the folder-derived name. With
 * `pathPrefix: false`, intermediate subfolders are dropped from the
 * resolved name (useful for icon sets organized by category).
 */
export type ComponentSource =
  | string
  | {
    /** Directory to scan, resolved relative to `cwd`. */
    path: string
    /**
     * Custom prefix prepended to every resolved component name.
     * Empty string disables the auto folder-name prefix.
     */
    prefix?: string
    /**
     * Include intermediate subfolder names in the resolved component
     * name. Defaults to `true`.
     *
     * @example
     * // pathPrefix: true  → icons/social/twitter.vue → <IconSocialTwitter />
     * // pathPrefix: false → icons/social/twitter.vue → <IconTwitter />
     */
    pathPrefix?: boolean
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
  /**
   * Build templates in parallel across worker threads.
   *
   * - omitted (default): parallel when there are more than 50 templates
   * - `true`: always parallel, using min(CPU count − 1, 8) workers
   * - `false`: always sequential
   * - `{ workers, threshold }`: parallel when the template count exceeds
   *   `threshold` (default 50), using `workers` threads (default
   *   min(CPU count − 1, 8)). Set `threshold: 0` to always parallelize.
   *
   * Note: more workers is not faster — each runs a full renderer, so ~8 is the
   * sweet spot and over-provisioning slows builds down.
   *
   * Only applies to file-based configs (the CLI / a config path); an inline
   * config object always builds sequentially. SFC-registered `afterBuild`
   * handlers can't run in a worker — use the config `afterBuild` hook instead.
   */
  parallel?: boolean | { workers?: number; threshold?: number }
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
     * String entries use the folder name as a namespace prefix
     * automatically (e.g. `widgets/Button.vue` → `<WidgetsButton />`).
     * Object entries override that with a custom prefix.
     *
     * @example
     * components: {
     *   source: [
     *     'resources/js/components/email',
     *     { path: 'src/widgets', prefix: 'W' },
     *     { path: 'src/icons', prefix: 'Icon', pathPrefix: false },
     *   ],
     * }
     */
    source?: ComponentSource | ComponentSource[]
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
    /**
     * Configure or disable the Checks tab in the dev UI.
     *
     * Set to `false` to disable checks entirely (the tab is hidden).
     *
     * @example
     * server: {
     *   checks: {
     *     clients: ['gmail', 'outlook', 'apple-mail'],
     *     level: 'error',
     *   }
     * }
     */
    checks?: false | ChecksConfig
  }
  /** Tailwind CSS and email CSS optimization settings. */
  css?: CssConfig
  /**
   * Generate a plaintext version of the email.
   *
   * Set to `true` to enable with defaults, or pass an object to configure
   * destination directory, file extension, and `string-strip-html` options.
   *
   * @default false
   * @example
   * plaintext: {
   *   destination: 'build_production/plaintext',
   *   extension: 'txt',
   *   options: { ignoreTags: ['br'] },
   * }
   */
  plaintext?: boolean | PlaintextConfig
  /** PostCSS processing options. */
  postcss?: PostcssConfig
  /**
   * Enable the transformer pipeline (CSS inlining, purging, shorthand, etc).
   *
   * Pass `false` to skip the entire pipeline. Pass an object to opt out of
   * specific transformers while keeping the rest active — only keys set
   * to `false` are skipped.
   *
   * @default true
   * @example
   * useTransformers: { inlineCss: false, minify: false }
   */
  useTransformers?: boolean | TransformerToggles
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
   * Use this to add custom Vite plugins or other Vite options. The internal
   * SSR server never loads a project `vite.config.{ts,js}` (it runs with
   * `configFile: false`), so pass anything it needs here. These options are
   * merged underneath Maizzle's required settings, which take precedence.
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
   *   // Use a factory for stateful plugins (vue-i18n, Pinia, vue-router)
   *   // so each render gets a fresh instance.
   *   plugins: () => [createI18n({ locale: 'en', messages })],
   *   directives: { focus: vFocus },
   *   globalProperties: { $format: dateFormat },
   * }
   */
  vue?: VueConfig
  /**
   * Props passed to the template's root component when rendering
   * programmatically. Map 1:1 to the template's `defineProps`. Not
   * merged into `useConfig()`.
   *
   * Props not declared via `defineProps` fall through as HTML
   * attributes on the root element, so declare every prop you pass.
   *
   * @example
   * render('./welcome.vue', { props: { name: 'Ava', plan: 'Pro' } })
   */
  props?: Record<string, any>

  // Events

  /** Called before any templates are processed. */
  beforeCreate?: (params: { config: MaizzleConfig }) => void | Promise<void>
  /** Called before each template is rendered. Return a string to replace `template.source`. */
  beforeRender?: (params: { config: MaizzleConfig; template: TemplateInfo }) => string | void | Promise<string | void>
  /** Called after each template is rendered but before transformers run. Return a string to replace the output HTML. */
  afterRender?: (params: { config: MaizzleConfig; template: TemplateInfo; html: string }) => string | void | Promise<string | void>
  /** Called after transformers have run on each template. Return a string to replace the output HTML. */
  afterTransform?: (params: { config: MaizzleConfig; template: TemplateInfo; html: string }) => string | void | Promise<string | void>
  /** Called after all templates have been built. */
  afterBuild?: (params: { files: string[]; config: MaizzleConfig }) => void | Promise<void>

  // Allow arbitrary user data
  [key: string]: any
}
