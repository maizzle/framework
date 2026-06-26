# Maizzle Composables Reference
All composables auto-import in `<script setup>` — no imports needed.

## defineConfig
Per-template config override. Deep-merged with `maizzle.config.ts`. Also used in the config file as a typed identity function.

```vue
<script setup>
defineConfig({
  css: { inline: false },
  url: { base: 'https://cdn.example.com/emails/' },
})
</script>
```

## useConfig
Read the resolved config (global + per-template `defineConfig` overrides up the tree). Useful inside child components for accessing custom data.

```vue
<script setup>
const config = useConfig()
</script>
<template>
  <Text>&copy; {{ new Date().getFullYear() }} {{ config.company?.name }}</Text>
</template>
```

## useTransformers
Per-template counterpart of the `useTransformers` config option.

- `useTransformers(false)` — skip entire pipeline.
- `useTransformers(true)` (or no arg) — keep all on.
- `useTransformers({ inlineCss: false, minify: true })` — granular toggle.

Force-enable (`true`) only works for boolean-driven transformers (`inlineCss`, `purgeCss`, `prettify`, `minify`, `shorthandCss`, `sixHex`, `safeSelectors`, `entities`). Data-driven ones (`filters`, `baseURL`, `urlQuery`, `addAttributes`, `removeAttributes`, `replaceStrings`, `attributeToStyle`) need real values.

## useBaseUrl
SFC-scoped equivalent of `config.url.base`.

```vue
<script setup>
useBaseUrl('https://cdn.example.com/emails/')
useBaseUrl({ url: 'https://cdn.example.com/', styleTag: true })
</script>
```

## useUrlQuery
SFC-scoped equivalent of `config.url.query`. Common use: per-template UTM params.

```vue
<script setup>
useUrlQuery({
  utm_source: 'maizzle',
  utm_campaign: 'newsletter',
  _options: { tags: ['a', 'img'], strict: false },
})
</script>
```

## useEvent
Register lifecycle handlers from `<script setup>`. Config handlers run first, then SFC handlers in registration order. SFC handlers clear between template renders.

| Event | Receives | Returns |
|---|---|---|
| `beforeCreate` | `{ config }` | — |
| `beforeRender` | `{ config, template }` | string\|void (replaces `template.source`) |
| `afterRender` | `{ config, template, html }` | string\|void (replaces HTML, before transformers) |
| `afterTransform` | `{ config, template, html }` | string\|void (replaces HTML, after transformers) |
| `afterBuild` | `{ files, config }` | — |

`template` is `{ source, path }` — `path` is Node's `path.parse(absolutePath)` (`{ root, dir, base, ext, name }`). Inside SFC `<script setup>`, call `useCurrentTemplate()` to read the same `ParsedPath` directly.

```vue
<script setup>
useEvent('afterRender', ({ html }) =>
  html.replace('<body', '<body><div class="bg-blue-500 p-4">Banner</div>'))

useEvent('afterTransform', ({ html }) =>
  html.replace('</body>', '<img src="https://track.example.com/p.gif" width="1" height="1" alt=""></body>'))
</script>
```

## useCurrentTemplate
Read the `ParsedPath` of the template currently being processed. Returns `undefined` outside per-template scope (`beforeCreate`, `afterBuild`, etc.).

```vue
<script setup>
const file = useCurrentTemplate()
console.log(file?.name) // 'welcome'
</script>
```

## useDoctype
Override the default `<!DOCTYPE html>`. Maizzle adapts void-element serialization: HTML5 → `<br>`/`<img>`, XHTML → `<br />`/`<img />`.

```vue
<script setup>
useDoctype('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">')
</script>
```

Common values: HTML5 (default, recommended), `XHTML 1.0 Transitional`, `HTML 4.01 Transitional`.

## useOutlookFallback
Toggle MSO/VML fallback for the current template subtree (script equivalent of the `outlookFallback` prop on MSO-aware components — see COMPONENTS.md "Conventions").

```vue
<script setup>
useOutlookFallback(false)
</script>
```

Skips ghost tables, VML rectangles, `xmlns:v/o`, mso-only CSS, and Button MSO spacers. Each component's `outlookFallback` prop overrides inheritance for its subtree.

## usePlaintext
Generate a plaintext version of the current template. With `render()`, returned in the result; during build, a `.txt` is written next to the HTML.

Options: `extension` (default `'txt'`), `destination` (output dir override), `options` (forwarded to [`string-strip-html`](https://codsen.com/os/string-strip-html), deep-merged over global `plaintext.options`).

```vue
<script setup>
usePlaintext()
usePlaintext({ extension: 'text', destination: 'dist/plaintext', options: { ignoreTags: ['br'] } })
</script>
```

## usePreheader
Hidden preview text injected at `<body>` start. Script equivalent of `<Preheader>`. Padded with invisible filler sequences (`&#8199;&#65279;&#847;`) so clients don't pull body text into the inbox snippet.

Options: `spaces` (number) — explicit filler count; auto-derived to fill a ~200-char preview budget when omitted.

```vue
<script setup>
usePreheader('Check out our latest deals — up to 50% off everything.')
usePreheader('Short preview.', { spaces: 50 })
</script>
```

## useFont
Register a font for the current template — emits a `<link>` tag in `<head>` and merges a `--font-{slug}` token into the Tailwind compile so a `font-{slug}` utility is generated. Script equivalent of `<Font>`.

Options: `family` (required), `weights` (default `[400]`), `styles` (`('normal'|'italic')[]`, default `['normal']`), `display` (default `'swap'`), `provider` (`'google'`/`'bunny'`, default `'google'`), `url` (pre-built stylesheet URL — overrides `provider`/`weights`/`styles`/`display`), `fallback` (CSS fallback list; default category-aware).

```vue
<script setup>
useFont({ family: 'Roboto', weights: [400, 600], styles: ['normal', 'italic'] })
useFont({ family: 'Acme', url: 'https://cdn.example.com/acme.css' })
</script>
```

Deduplicated by family (first registration wins).

## useHead
Re-export of [`useHead`](https://unhead.unjs.io/docs/head/api/composables/use-head) from `@unhead/vue`. Tags are SSR-rendered into the final HTML.

```vue
<script setup>
useHead({
  title: 'Order Confirmation',
  meta: [{ name: 'color-scheme', content: 'light dark' }],
  link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap' }],
  htmlAttrs: { lang: 'de' },
  bodyAttrs: { class: 'bg-white' },
})
</script>
```
