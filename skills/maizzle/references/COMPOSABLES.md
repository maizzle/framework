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

Read the resolved config (global + any per-template `defineConfig` overrides up the tree). Useful inside child components for accessing custom data passed through the config.

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

- `useTransformers(false)` — skip the entire pipeline (CSS inlining, purging, …).
- `useTransformers(true)` (or no arg) — keep everything on.
- `useTransformers({ inlineCss: false, minify: true })` — granular toggle.

Force-enable (`true`) only works for boolean-driven transformers (`inlineCss`, `purgeCss`, `prettify`, `minify`, `shorthandCss`, `sixHex`, `safeSelectors`, `entities`). Data-driven ones (`filters`, `baseURL`, `urlQuery`, `addAttributes`, `removeAttributes`, `replaceStrings`, `attributeToStyle`) need real values.

## useBaseUrl

SFC-scoped equivalent of `config.url.base`.

```vue
<script setup>
useBaseUrl('https://cdn.example.com/emails/')
// or fine-grained:
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

Register lifecycle handlers from `<script setup>`. Config handlers run first, then SFC handlers in registration order. SFC handlers are cleared between template renders, so they only apply to the template that registered them.

Events:

| Event | Receives | Returns |
|---|---|---|
| `beforeCreate` | `{ config }` | — |
| `beforeRender` | `{ config, template }` | string \| void (replace `template.source`) |
| `afterRender` | `{ config, template, html }` | string \| void (replace HTML, before transformers) |
| `afterTransform` | `{ config, template, html }` | string \| void (replace HTML, after transformers) |
| `afterBuild` | `{ files, config }` | — |

`template` is `{ source: string, path: ParsedPath }` — `path` is the result of Node's `path.parse(absolutePath)` (`{ root, dir, base, ext, name }`). Inside `<script setup>`, you can also call `useCurrentTemplate()` to read the same `ParsedPath` directly.

```vue
<script setup>
// Inject content before transformers (still inlined/purged)
useEvent('afterRender', ({ html }) => {
  return html.replace('<body', '<body><div class="bg-blue-500 p-4">Banner</div>')
})

// Tracking pixel after transformers
useEvent('afterTransform', ({ html }) => {
  return html.replace('</body>', '<img src="https://track.example.com/p.gif" width="1" height="1" alt=""></body>')
})
</script>
```

## useDoctype

Override the default `<!DOCTYPE html>`. Maizzle adapts void-element serialization to match: HTML5 emits `<br>` / `<img>`, XHTML emits `<br />` / `<img />`.

```vue
<script setup>
useDoctype('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">')
</script>
```

Common doctypes:

- `<!DOCTYPE html>` — HTML5 (default, recommended).
- `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">`
- `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">`

## usePlaintext

Generate a plaintext version of the current template. With `render()`, the result is returned in the result object; during build, a `.txt` is written next to the HTML.

Options:

- `extension` (string, default `'txt'`) — file extension.
- `destination` (string) — output dir override.
- `options` (object) — forwarded to [`string-strip-html`](https://codsen.com/os/string-strip-html), deep-merged over global `plaintext.options`.

```vue
<script setup>
usePlaintext()
usePlaintext({ extension: 'text', destination: 'dist/plaintext', options: { ignoreTags: ['br'] } })
</script>
```

## usePreheader

Hidden preview text injected at `<body>` start. Script equivalent of the `<Preheader>` component.

Options:

- `fillerCount` (number, default `150`) — `&#8199;&#65279;&#847;` filler pairs that push body text out of the preview area.
- `shyCount` (number, default `150`) — `&shy;` entities.

```vue
<script setup>
usePreheader('Check out our latest deals — up to 50% off everything.')
usePreheader('Short preview.', { fillerCount: 200, shyCount: 200 })
</script>
```

## useHead

Re-export of [`useHead`](https://unhead.unjs.io/docs/head/api/composables/use-head) from `@unhead/vue`. Tags are SSR-rendered into the final HTML.

```vue
<script setup>
useHead({
  title: 'Order Confirmation',
  meta: [{ name: 'color-scheme', content: 'light dark' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap' },
  ],
  htmlAttrs: { lang: 'de' },
  bodyAttrs: { class: 'bg-white' },
})
</script>
```
