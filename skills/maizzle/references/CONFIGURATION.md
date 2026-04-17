# Maizzle Configuration Reference

Configuration is defined in `maizzle.config.ts` at the project root, using the `defineConfig()` identity function for type safety.

```ts
import { defineConfig } from '@maizzle/framework'

export default defineConfig({
  // options...
})
```

Per-template overrides are set via `defineConfig()` in `<script setup>` — these merge with the global config.

---

## Content & Output

- `content` (String[], default: `['emails/**/*.{vue,md}']`) — glob patterns for template files. Resolved relative to `root`.
- `root` (String, default: `process.cwd()`) — root directory. `content`, `static.source`, and `css.base` resolve relative to this.
- `output.path` (String, default: `'dist'`) — directory for compiled HTML files.
- `output.extension` (String, default: `'html'`) — file extension for compiled templates (e.g. `'blade.php'`).

```ts
export default defineConfig({
  root: 'resources/emails',
  content: ['**/*.vue'],
  output: {
    path: 'dist',
    extension: 'blade.php',
  },
})
```

---

## Static Files

- `static.source` (String[], default: `['public/**/*.*']`) — glob patterns for static files to copy. Resolved relative to `root`.
- `static.destination` (String, default: `'public'`) — subdirectory in output folder where static files are placed.

```ts
export default defineConfig({
  static: {
    source: ['public/**/*.*', 'assets/**/*.*'],
    destination: 'public',
  },
})
```

---

## Components

- `components.source` (String | String[], optional) — additional directories to scan for auto-imported Vue components. Resolved relative to `cwd` (not `root`), allowing paths outside the email root.

```ts
export default defineConfig({
  components: {
    source: ['resources/js/components/email'],
  },
})
```

---

## Dev Server

- `server.port` (Number, default: `3000`) — dev server port.
- `server.watch` (String[], default: `[]`) — additional file paths to watch for changes.
- `server.email.to` (String | String[], optional) — default recipient(s) for "Send test" feature.
- `server.email.from` (String, default: `'Maizzle <maizzle@ethereal.email>'`) — sender address.
- `server.email.subject` (String, optional) — default subject line.
- `server.email.transport` (Object, optional) — Nodemailer transport options. Omit to use Ethereal (free fake SMTP).

```ts
export default defineConfig({
  server: {
    port: 3000,
    watch: ['./tailwind.config.ts'],
    email: {
      to: ['test@example.com'],
      from: 'dev@maizzle.test',
      transport: {
        host: 'smtp.mailtrap.io',
        port: 587,
        auth: { user: '...', pass: '...' },
      },
    },
  },
})
```

---

## CSS

### Processing Defaults

These are enabled by default and run automatically:

- `css.safe` (Boolean | Record, default: `true`) — replace unsafe CSS class names with email-safe equivalents. Characters like `:`, `/`, `[`, `]` are replaced. Pass a map to customize replacements.
- `css.preferUnitless` (Boolean, default: `true`) — convert unitless CSS values (e.g. `line-height: 24px` with `16px` font becomes `1.5`).
- `css.resolveCalc` (Boolean, default: `true`) — resolve CSS `calc()` expressions to static values.
- `css.resolveProps` (Boolean, default: `true`) — resolve CSS custom properties (`var()`) to computed values.
- `css.sixHex` (Boolean, default: `true`) — convert 3-digit HEX colors to 6-digit in `bgcolor` and `color` attributes.
- `css.base` (String, optional) — base directory for Tailwind CSS `@source` resolution. Auto-set to `root` when `root` is configured.
- `css.exclude` (String[], optional) — file paths to exclude from CSS processing.

### CSS Inlining

- `css.inline` (Boolean | Object, default: `false`) — inline CSS from `<style>` tags into HTML elements. Set to `true` for defaults, or pass a Juice options object.

When passing an object, these additional options are available:

- `css.inline.removeStyleTags` (Boolean, default: `false`) — remove `<style>` tags after inlining.
- `css.inline.removeInlinedSelectors` (Boolean, default: `true`) — remove selectors from preserved styles after inlining.
- `css.inline.applyWidthAttributes` (Boolean, default: `true`) — apply `width` HTML attributes from inlined CSS.
- `css.inline.applyHeightAttributes` (Boolean, default: `true`) — apply `height` HTML attributes from inlined CSS.
- `css.inline.inlineDuplicateProperties` (Boolean, default: `true`) — allow duplicate CSS properties in inline styles.
- `css.inline.attributeToStyle` (Boolean | String[], default: `false`) — convert HTML attributes (`width`, `height`, `bgcolor`, `valign`) to inline CSS. `true` for all, array for specific.
- `css.inline.preferUnitlessValues` (Boolean, default: `true`) — convert `0px`, `0em`, etc. to `0` in inline styles.
- `css.inline.safelist` (String[], default: `[]`) — CSS selectors to preserve in `<style>` tags.
- `css.inline.styleToAttribute` (Record, default: `{}`) — duplicate CSS properties to HTML attributes (e.g. `{ 'background-color': 'bgcolor' }`).
- `css.inline.widthElements` (String[], default: `['img', 'video']`) — elements that can receive `width` HTML attributes.
- `css.inline.heightElements` (String[], default: `['img', 'video']`) — elements that can receive `height` HTML attributes.
- `css.inline.excludedProperties` (String[], default: `[]`) — CSS properties to exclude from inlining.
- `css.inline.codeBlocks` (Record, default: `{ EJS: {...}, HBS: {...} }`) — template language code blocks to preserve.
- `css.inline.customCSS` (String, optional) — additional CSS string to inline alongside `<style>` tags.

```ts
export default defineConfig({
  css: {
    inline: {
      removeStyleTags: true,
      applyWidthAttributes: true,
      styleToAttribute: {
        'background-color': 'bgcolor',
      },
    },
  },
})
```

### CSS Purging

- `css.purge` (Boolean | Object, default: `false`) — remove unused CSS. Set to `true` for defaults, or pass an options object forwarded to `email-comb`.
- `css.purge.safelist` (String[], optional) — selectors to preserve. Appended to built-in email client selectors. Supports wildcards: `*body*`, `.gmail*`, `.apple*`.

```ts
export default defineConfig({
  css: {
    purge: {
      safelist: ['.custom-*', '#outlook'],
    },
  },
})
```

### CSS Shorthand

- `css.shorthand` (Boolean | Object, default: `false`) — rewrite longhand CSS to shorthand (e.g. `padding: 10px 20px 10px 20px` becomes `padding: 10px 20px`).
- `css.shorthand.tags` (String[], optional) — limit shorthand conversion to specific HTML tags.

### Media Query Handling

- `css.media` (Boolean | Object, default: `true`) — merge duplicate `@media` queries and sort them.
- `css.media.sort` (`'mobile-first'` | `'desktop-first'` | Function, default: `'mobile-first'`) — sort order.

### Removing CSS Declarations

- `css.removeDeclarations` (Record, optional) — remove specific CSS declarations by selector. Value of `'*'` removes entire rule, string removes a property, string array removes multiple, object matches property-value pairs.

```ts
export default defineConfig({
  css: {
    removeDeclarations: {
      ':root': '*', // removes entire :root rule
    },
  },
})
```

---

## PostCSS

- `postcss.removeSelectors` (String[], default: `[':host', ':lang']`) — selector prefixes to strip from compiled CSS.
- `postcss.removeAtRules` (String[], default: `['layer', 'property']`) — at-rule names to strip from compiled CSS.

```ts
export default defineConfig({
  postcss: {
    removeSelectors: [':host', ':lang', ':root'],
    removeAtRules: ['layer', 'property', 'charset'],
  },
})
```

---

## HTML

### Attributes

- `html.attributes.add` (false | Record, default: `{ table: { cellpadding: 0, cellspacing: 0, role: 'none' }, img: { alt: '' } }`) — add attributes to HTML elements. Supports tag, class, id, and attribute selectors.
- `html.attributes.remove` (Array, default: `[]`) — remove attributes by name or name-value pair. Empty `style` and `class` attributes are always removed.

```ts
export default defineConfig({
  html: {
    attributes: {
      add: {
        table: { cellpadding: 0, cellspacing: 0, role: 'none' },
        img: { alt: '' },
      },
      remove: ['data-test', { name: 'class', value: /^js-/ }],
    },
  },
})
```

### Entity Decoding

- `html.decodeEntities` (Boolean | Record, default: `true`) — decode HTML entities. `true` decodes all with default map; pass object to customize. Default includes `&zwj;`, `&nbsp;`, `&shy;`, `&mdash;`, `&ldquo;`, etc.

### Formatting

- `html.format` (Boolean | Object, default: `false`) — pretty-print HTML output using `oxfmt`. Default options when `true`: `printWidth: 320`, `htmlWhitespaceSensitivity: 'ignore'`, `embeddedLanguageFormatting: 'off'`.

### Minification

- `html.minify` (Boolean | Object, default: `false`) — minify HTML using `html-crush`. Default: `{ removeLineBreaks: true }`.

```ts
export default defineConfig({
  html: {
    format: true,
    // or
    minify: true,
    decodeEntities: true,
  },
})
```

---

## URL Transformations

### Query String Appending

- `url.query` (Object, optional) — append query parameters to URLs. Non-`_options` keys are URL parameters.
- `url.query._options.tags` (String[], default: `['a']`) — CSS selectors for elements to process.
- `url.query._options.attributes` (String[], default: `['src', 'href', 'poster', 'srcset', 'background']`) — HTML attributes containing URLs.
- `url.query._options.strict` (Boolean, default: `true`) — only append to absolute URLs.

```ts
export default defineConfig({
  url: {
    query: {
      utm_source: 'maizzle',
      utm_medium: 'email',
      _options: {
        tags: ['a'],
        strict: true,
      },
    },
  },
})
```

### Base URL Prepending

- `url.base` (String | Object, optional) — prepend base URL to relative paths. String applies to all tags, object for fine-grained control.
- `url.base.url` (String, optional) — the base URL to prepend.
- `url.base.tags` (String[] | Record, optional) — tags or tag-attribute map to process.
- `url.base.attributes` (Record, optional) — custom attributes and base URLs.
- `url.base.styleTag` (Boolean, default: `true`) — apply to URLs in `<style>` tags.
- `url.base.inlineCss` (Boolean, default: `true`) — apply to URLs in inline `style` attributes.

```ts
export default defineConfig({
  url: {
    base: 'https://cdn.example.com/emails/',
    // or for fine-grained control:
    base: {
      url: 'https://cdn.example.com/emails/',
      tags: ['img', 'source'],
      styleTag: true,
      inlineCss: true,
    },
  },
})
```

---

## String Replacement

- `replaceStrings` (Record, optional) — replace strings in final HTML output. Keys are treated as case-insensitive regex patterns.

```ts
export default defineConfig({
  replaceStrings: {
    '{{ year }}': new Date().getFullYear().toString(),
  },
})
```

---

## Content Filters

- `filters` (false | Record, optional) — content filters that transform text inside HTML elements using custom attributes. `false` disables all filters. User filters are merged with built-in defaults.

Built-in filters: `uppercase`, `lowercase`, `capitalize`, `escape`, `escape-once`, `lstrip`, `rstrip`, `trim`, `remove`, `remove-first`, `replace`, `replace-first`, `slice`, `size`, `truncate`, `truncate-words`, `newline-to-br`, `strip-newlines`, `ceil`, `floor`, `round`, `plus`, `minus`, `multiply`, `times`, `divide`, `divide-by`, `modulo`, `url-encode`, `url-decode`.

Usage in templates:

```html
<p uppercase>hello world</p> <!-- renders: HELLO WORLD -->
<p truncate="10">hello world</p> <!-- renders: hello wo... -->
```

---

## Plaintext

- `plaintext` (Boolean | String | Object, default: `false`) — generate plaintext version. `true` outputs to same directory with `.txt` extension, string path redirects to a directory, object passes options to `string-strip-html`.

```ts
export default defineConfig({
  plaintext: true,
})
```

---

## Markdown

- `markdown` (Object, optional) — options extending `unplugin-vue-markdown`.
- `markdown.shikiTheme` (BundledTheme, default: `'github-light'`) — Shiki theme for syntax highlighting in fenced code blocks.

---

## Framework Behavior

- `useTransformers` (Boolean, default: `true`) — enable the transformer pipeline (CSS inlining, purging, shorthand, etc.).

---

## Vite

- `vite` (InlineConfig, optional) — Vite configuration options passed to internal Vite SSR server. Use for custom Vite plugins. If `vite.config.{ts,js}` exists in project root, it takes precedence.

```ts
export default defineConfig({
  vite: {
    plugins: [myPlugin()],
  },
})
```

---

## Vue

- `vue.plugins` (Plugin[], optional) — Vue plugins to register on the app instance before rendering.
- `vue.directives` (Record, optional) — custom Vue directives to register globally.
- `vue.globalProperties` (Record, optional) — properties added to `app.config.globalProperties`, available in all templates.

```ts
export default defineConfig({
  vue: {
    plugins: [createI18n({ locale: 'en', messages })],
    directives: { focus: vFocus },
    globalProperties: { $format: dateFormat },
  },
})
```

---

## Lifecycle Events

Hooks that run at specific points in the build pipeline. Defined at the config level or per-template via `useEvent()`.

- `beforeCreate({ config })` — before any templates are processed.
- `beforeRender({ config, template })` — before each template is rendered. Return a string to replace template source.
- `afterRender({ config, template, html })` — after rendering, before transformers. Return a string to replace output HTML.
- `afterTransform({ config, template, html })` — after transformers run. Return a string to replace output HTML.
- `afterBuild({ files, config })` — after all templates are built.

```ts
export default defineConfig({
  afterRender({ html }) {
    return html.replace('{{unsubscribe}}', 'https://example.com/unsubscribe')
  },
})
```

---

## Arbitrary User Data

The config object supports arbitrary properties, accessible via `useConfig()` in templates and in event hooks:

```ts
export default defineConfig({
  company: {
    name: 'Acme Inc.',
    address: '123 Main St',
  },
})
```

```vue
<script setup>
const config = useConfig()
</script>

<template>
  <Text>{{ config.company.name }}</Text>
</template>
```

---

## Vite Plugin Usage

When integrating Maizzle into an existing Vite app (e.g. Laravel), register `maizzle()` as a Vite plugin. All Maizzle config options are passed directly to it.

Example from a Laravel + Inertia app's `vite.config.ts`:

```ts
// existing imports...
import { maizzle } from '@maizzle/framework'

export default defineConfig({
  plugins: [
    // Existing plugins...
    maizzle({
      root: 'resources/js/emails',
      content: ['./**/*.vue'],
      output: {
        path: 'resources/views/emails',
        extension: 'blade.php',
      },
      static: {
        source: ['resources/js/emails/images'],
      },
      html: {
        format: true,
      },
      css: {
        safe: true,
        purge: true,
        inline: true,
      },
    }),
  ],
})
```

---

## Defaults Summary

These are the default config values when no overrides are provided:

```ts
{
  content: ['emails/**/*.{vue,md}'],
  output: { path: 'dist', extension: 'html' },
  static: { source: ['public/**/*.*'], destination: 'public' },
  server: { port: 3000, watch: [] },
  css: {
    safe: true,
    preferUnitless: true,
    resolveCalc: true,
    resolveProps: true,
  },
  html: { decodeEntities: true },
  useTransformers: true,
}
```
