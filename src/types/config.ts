export interface UrlQueryOptions {
  tags?: string[]
  attributes?: string[]
  strict?: boolean
  qs?: Record<string, unknown>
}

export type UrlQuery = Record<string, unknown> & {
  _options?: UrlQueryOptions
}

export interface UrlConfig {
  query?: UrlQuery
  base?: string | {
    url?: string
    tags?: string[] | Record<string, Record<string, string | boolean>>
    attributes?: Record<string, string>
    styleTag?: boolean
    inlineCss?: boolean
  }
}

export interface CssConfig {
  base?: string
  purge?: boolean | Record<string, unknown>
  inline?: boolean | {
    attributeToStyle?: boolean | string[]
    removeStyleTags?: boolean
    removeInlinedSelectors?: boolean
    preferUnitlessValues?: boolean
    safelist?: string[]
    styleToAttribute?: Record<string, string>
    applyWidthAttributes?: boolean
    applyHeightAttributes?: boolean
    widthElements?: string[]
    heightElements?: string[]
    excludedProperties?: string[]
    codeBlocks?: Record<string, { start: string; end: string }>
    customCSS?: string
    [key: string]: unknown
  }
  media?: boolean | {
    sort?: 'mobile-first' | 'desktop-first' | ((a: string, b: string) => number)
  }
  preferUnitless?: boolean
  resolveCalc?: boolean
  resolveProps?: boolean
  safe?: boolean | Record<string, string>
  sixHex?: boolean
  shorthand?: boolean | { tags?: string[] }
  removeDeclarations?: Record<string, import('../plugins/postcss/removeDeclarations.ts').RemoveValue>
  exclude?: string[]
}

export interface AttributesConfig {
  add?: false | Record<string, Record<string, string | boolean | number>>
  remove?: Array<string | { name: string; value?: string | RegExp }>
}

export type EntitiesConfig = boolean | Record<string, string>

export interface PostcssConfig {
  /** Selector prefixes to strip from compiled CSS (e.g. ':host', ':lang'). */
  removeSelectors?: string[]
  /** At-rule names to strip from compiled CSS (e.g. '@layer', '@property'). */
  removeAtRules?: string[]
  [key: string]: unknown
}

export interface HtmlConfig {
  attributes?: AttributesConfig
  decodeEntities?: EntitiesConfig
  format?: boolean | import('oxfmt').FormatOptions
  minify?: boolean | Record<string, unknown>
}

export interface MaizzleConfig {
  /**
   * Root directory for the Maizzle email project.
   *
   * When set, relative paths for `content`, `static.source`, component
   * auto-import directories, `.d.ts` output, and `css.base` are all
   * resolved relative to this directory.
   *
   * Defaults to `process.cwd()`.
   *
   * @example
   * // In a Laravel app where emails live under resources/js/emails:
   * maizzle({
   *   root: 'resources/js/emails',
   *   content: ['./**\/*.vue'],
   * })
   */
  root?: string
  markdown?: import('unplugin-vue-markdown/types').Options
  content?: string[]
  output?: {
    path?: string
    extension?: string
  }
  static?: {
    source?: string[]
    destination?: string
  }
  components?: {
    root?: string | string[]
  }
  server?: {
    port?: number
    watch?: string[]
  }
  css?: CssConfig
  plaintext?: boolean | string | Record<string, unknown>
  postcss?: PostcssConfig
  useTransformers?: boolean
  replaceStrings?: Record<string, string>
  url?: UrlConfig
  html?: HtmlConfig

  // Events
  beforeCreate?: (params: { config: MaizzleConfig }) => void | Promise<void>
  beforeRender?: (params: { config: MaizzleConfig; template: string }) => string | void | Promise<string | void>
  afterRender?: (params: { config: MaizzleConfig; template: string; html: string }) => string | void | Promise<string | void>
  afterTransform?: (params: { config: MaizzleConfig; template: string; html: string }) => string | void | Promise<string | void>
  afterBuild?: (params: { files: string[]; config: MaizzleConfig }) => void | Promise<void>

  // Allow arbitrary user data
  [key: string]: any
}
