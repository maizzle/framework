# Maizzle Configuration Reference

Configuration lives in `maizzle.config.ts` at the project root. Use `defineConfig()` for type safety:

```ts
import { defineConfig } from '@maizzle/framework'

export default defineConfig({
  // options...
})
```

**Resolution order** (highest priority last):
1. Built-in defaults
2. `maizzle.config.ts`
3. Per-template `defineConfig()` in `<script setup>` (deep-merged)

Arrays are replaced, not merged: setting `content: ['x']` overrides the default array entirely.

When using Maizzle as a Vite plugin, pass the same config object to `maizzle({ ... })`.

## Defaults Summary

```ts
{
  content: ['emails/**/*.{vue,md}'],
  output: { path: 'dist', extension: 'html' },
  static: { source: ['public/**/*.*'], destination: 'public' },
  server: { port: 3000, watch: [] },
  css: { inline: true, purge: true, shorthand: true, safe: true, preferUnitless: true },
  html: { decodeEntities: true, format: true },
  useTransformers: true,
}
```

## Project Layout

- `root` (string, default `process.cwd()`) — root for `content`, `static.source`, `css.base`. Set when emails live in a subdir of a larger app (Laravel, monorepo, Vite SPA).
- `content` (string[], default `['emails/**/*.{vue,md}']`) — template globs. Negation supported (`'!emails/drafts/**'`). Output preserves directory structure.
- `output.path` (string, default `'dist'`) — output dir.
- `output.extension` (string, default `'html'`) — output file extension (e.g. `'blade.php'`).
- `static.source` (string[], default `['public/**/*.*']`) — static file globs.
- `static.destination` (string, default `'public'`) — static subdir inside output.
- `components.source` (string | string[]) — extra component dirs (relative to `cwd`, not `root`).

```ts
export default defineConfig({
  root: 'resources/emails',
  content: ['**/*.vue', '!**/drafts/**'],
  output: { path: 'dist', extension: 'blade.php' },
  static: { source: ['public/**/*.*'], destination: 'assets' },
  components: { source: ['resources/js/components/email'] },
})
```

## CSS

- `css.inline` (bool | object, default `true`) — Juice options. Inline `<style>` into elements. Common Juice keys: `attributeToStyle`, `excludedProperties`, `applyWidthAttributes`, `removeStyleTags`, `removeInlinedSelectors`, `styleToAttribute`, `widthElements`, `heightElements`, `safelist`, `customCSS`.
- `css.purge` (bool | object, default `true`) — `email-comb` options. `safelist` extends defaults; supports wildcards (`.gmail*`).
- `css.shorthand` (bool | { tags?: string[] }, default `true`) — collapse longhand CSS (e.g. `padding: 10px 20px 10px 20px` → `10px 20px`).
- `css.safe` (bool | Record, default `true`) — replace unsafe class chars (`sm:text-lg` → `sm-text-lg`). Pass a map for custom replacements.
- `css.preferUnitless` (bool, default `true`) — strip units from zero values in inlined styles (`0px` → `0`).
- `css.sixHex` (bool, default `true`) — convert 3-digit HEX to 6-digit in `bgcolor`/`color` attrs.
- `css.media` (bool | { sort? }, default `true`) — merge and sort `@media` queries. `sort: 'mobile-first' | 'desktop-first' | (a, b) => number`.
- `css.removeDeclarations` (Record) — strip CSS declarations by selector. Value of `'*'` removes the whole rule.
- `css.base` (string) — Tailwind `@source` base; auto-set to `root` when `root` is configured.
- `css.exclude` (string[]) — globs excluded from Tailwind's source scanner.

```ts
export default defineConfig({
  css: {
    inline: { styleToAttribute: { 'background-color': 'bgcolor' } },
    purge: { safelist: ['.custom-*', '#outlook'] },
    media: { sort: 'desktop-first' },
    removeDeclarations: { ':root': '*' },
    exclude: ['emails/amp/**'],
  },
})
```

## PostCSS

- `postcss.removeSelectors` (string[], default `[':host', ':lang']`) — strip selector prefixes Tailwind v4 may emit.
- `postcss.removeAtRules` (string[], default `['layer', 'property']`) — strip at-rules emails don't support.

## HTML

- `html.attributes.add` (false | Record, default `{ table: { cellpadding: 0, cellspacing: 0, role: 'none' }, img: { alt: '' } }`) — merged on top of defaults. Set the whole map / a selector / a single attr to `false` to skip.
- `html.attributes.remove` (Array, default `['style', 'class']`) — strip empty `style`/`class` always; entries support `'name'` (when empty), `{ name, value: 'literal' }`, `{ name, value: /regex/ }`.
- `html.decodeEntities` (bool | Record, default `true`) — replace literal characters (nbsp, zwj, mdash, curly quotes, bullets, …) with HTML entities. Pass an object to extend.
- `html.format` (bool | object, default `true`) — pretty-print via `oxfmt`. Defaults: `printWidth: 320`, `htmlWhitespaceSensitivity: 'ignore'`, `embeddedLanguageFormatting: 'off'`. Auto-skipped when `minify` is on.
- `html.minify` (bool | object) — minify via `html-crush`. Useful for Gmail's ~102KB clipping limit.

```ts
export default defineConfig({
  html: {
    attributes: {
      add: { a: { target: '_blank' }, img: { alt: false } },
      remove: ['data-foo', { name: 'class', value: /^js-/ }],
    },
    decodeEntities: { '©': '&copy;', '™': '&trade;' },
    minify: true,
  },
})
```

## URL

- `url.base` (string | object) — prepend a base URL to relative paths. Object form: `{ url, tags?, attributes?, styleTag?, inlineCss? }`.
- `url.query` (Record) — append query parameters. Non-`_options` keys are URL parameters.
- `url.query._options.tags` (string[], default `['a']`) — tags processed.
- `url.query._options.attributes` (string[], default `['src', 'href', 'poster', 'srcset', 'background']`).
- `url.query._options.strict` (bool, default `true`) — only process absolute URLs.
- `url.query._options.qs` (object, default `{ encode: false }`) — query-string library options.

```ts
export default defineConfig({
  url: {
    base: 'https://cdn.example.com/emails/',
    query: {
      utm_source: 'maizzle',
      _options: { tags: ['a', 'img'], strict: false },
    },
  },
})
```

## Markdown

- `markdown.shikiTheme` (Shiki BundledTheme, default `'github-light'`) — syntax-highlight theme for fenced code blocks.
- `markdown.wrapperComponent` (string | (id, raw) => string | null) — component used to wrap each `.md` template. Default resolver returns `'MarkdownLayout'` for entry templates and honors a `layout:` frontmatter key. A user-supplied value (or function returning a name) takes precedence.
- Other `unplugin-vue-markdown` keys pass through (`headEnabled`, `wrapperDiv`, `wrapperClasses`, `markdownOptions`).

```ts
export default defineConfig({
  markdown: {
    shikiTheme: 'github-dark',
    wrapperComponent: (id) => id.includes('/promo/') ? 'PromoLayout' : 'MarkdownLayout',
  },
})
```

## Plaintext

- `plaintext` (bool | object, default `false`) — `true` writes a `.txt` next to each `.html`.
- `plaintext.destination` (string) — alternate output dir (template paths preserved).
- `plaintext.extension` (string, default `'txt'`).
- `plaintext.options` (object) — forwarded to [`string-strip-html`](https://codsen.com/os/string-strip-html).

Per-template opt-in via `usePlaintext()` in `<script setup>` takes precedence.

## Filters

- `filters` (false | Record<string, (str, value) => string>, default `{}`) — content filters applied to text inside elements via attributes. User filters merge on top of built-in defaults. Set to `false` to disable everything.

```html
<div uppercase>hello</div>          <!-- HELLO -->
<div truncate="10">long sentence</div> <!-- long sente... -->
```

```ts
export default defineConfig({
  filters: {
    'big-text': (str) => `<span style="font-size: 24px">${str}</span>`,
  },
})
```

Built-in: `uppercase`, `lowercase`, `capitalize`, `trim`, `lstrip`, `rstrip`, `escape`, `escape-once`, `append`, `prepend`, `plus`, `minus`, `multiply`/`times`, `divide-by`/`divide`, `modulo`, `ceil`, `floor`, `round`, `size`, `slice`, `truncate`, `truncate-words`, `remove`, `remove-first`, `replace`, `replace-first`, `newline-to-br`, `strip-newlines`, `url-decode`, `url-encode`. Multiple filters on the same element run in attribute order.

## replaceStrings

- `replaceStrings` (Record<string, string>) — find/replace on the final HTML after all transformers (matches tags and attributes too). Keys are treated as case-insensitive global regex patterns (`gi` flags added internally) — escape character classes in keys (`\\s` for `\s`).

```ts
export default defineConfig({
  replaceStrings: {
    '{{ year }}': new Date().getFullYear().toString(),
  },
})
```

## useTransformers

- `useTransformers` (bool | object, default `true`) — toggle the transformer pipeline. `false` returns raw Vue SSR output.

Pass an object to toggle individual transformers. Keys: `inlineCss`, `purgeCss`, `safeClassNames`, `shorthandCss`, `sixHex`, `prettify`, `minify`, `addAttributes`, `removeAttributes`, `attributeToStyle`, `baseURL`, `urlQuery`, `entities`, `replaceStrings`, `filters`. Force-enable (`true`) only works for boolean-driven transformers — data-driven ones (`filters`, `baseURL`, `urlQuery`, `addAttributes`, `removeAttributes`, `replaceStrings`, `attributeToStyle`) need actual config values.

Per-template via `useTransformers(false)` or `useTransformers({ inlineCss: false, minify: true })` in `<script setup>`.

```ts
export default defineConfig({
  useTransformers: { inlineCss: false, minify: true },
})
```

## Server

- `server.port` (number, default `3000`).
- `server.watch` (string[]) — extra files to watch (config, data sources).
- `server.email` — "Send test" config in the dev UI. Defaults to Ethereal (free fake SMTP) when omitted.
  - `email.to` (string | string[]).
  - `email.from` (string, default `'Maizzle <maizzle@ethereal.email>'`).
  - `email.subject` (string).
  - `email.transport` (Nodemailer transport options).
- `server.checks` (false | object) — Checks tab in dev UI. `false` hides it.
  - `checks.clients` (slug[] | `'all'`, default `['gmail', 'apple-mail', 'outlook', 'yahoo']`) — caniemail clients to check.
  - `checks.level` (`'error'` | `'warning'` | `'lint'`) — filter severities.

```ts
export default defineConfig({
  server: {
    port: 8080,
    watch: ['./data/products.json'],
    email: {
      to: ['test@example.com'],
      from: 'dev@yourcompany.com',
      transport: { host: 'smtp.mailtrap.io', port: 587, auth: { user: '...', pass: '...' } },
    },
    checks: { clients: ['gmail', 'outlook', 'apple-mail'], level: 'error' },
  },
})
```

## Vite

- `vite` (Vite `InlineConfig`) — merged into Maizzle's internal Vite SSR server. A standalone `vite.config.{ts,js}` in the project root takes precedence.

```ts
import myPlugin from 'vite-plugin-example'
export default defineConfig({ vite: { plugins: [myPlugin()] } })
```

## Vue

- `vue.plugins` (Plugin[]) — Vue plugins (i18n, etc.) registered on the SSR app.
- `vue.directives` (Record<string, Directive>) — global custom directives.
- `vue.globalProperties` (Record) — added to `app.config.globalProperties`, available as `$name` in templates.

```ts
export default defineConfig({
  vue: {
    plugins: [createI18n({ locale: 'en', messages })],
    globalProperties: { $format: (d) => new Intl.DateTimeFormat('en').format(d) },
  },
})
```

## Lifecycle Events

Hooks run during the build. Define at the config level or per-template via `useEvent()`. Config handlers run before SFC handlers; for events that return a value, the return replaces the input for the next handler.

- `beforeCreate({ config })` — once before any templates are processed.
- `beforeRender({ config, template })` — return a string to replace `template.source`.
- `afterRender({ config, template, html })` — after render, before transformers. Return to replace HTML.
- `afterTransform({ config, template, html })` — after transformers. Return to replace HTML.
- `afterBuild({ files, config })` — once after all templates are built.

In per-template events, `template` is `{ source: string, path: ParsedPath }` where `path` is `path.parse(absolutePath)` — `{ root, dir, base, ext, name }`. The same `ParsedPath` is also available via `useCurrentTemplate()` (handy inside SFC `<script setup>`).

```ts
export default defineConfig({
  afterTransform({ html }) {
    return html.replace('</body>', '<img src="https://track.example.com/p.gif" width="1" height="1" alt=""></body>')
  },
})
```

## Arbitrary User Data

Any extra top-level keys are accessible via `useConfig()` and in event handlers.

```ts
export default defineConfig({
  company: { name: 'Acme Inc.' },
})
```

```vue
<script setup>const config = useConfig()</script>
<template><Text>{{ config.company.name }}</Text></template>
```

## Vite Plugin Form

Inside an existing Vite app (e.g. Laravel + Inertia), register `maizzle()` and pass the same config:

```ts
import { defineConfig } from 'vite'
import { maizzle } from '@maizzle/framework'

export default defineConfig({
  plugins: [
    maizzle({
      root: 'resources/js/emails',
      content: ['**/*.vue'],
      output: { path: 'resources/views/emails', extension: 'blade.php' },
    }),
  ],
})
```
