# Maizzle Composables Reference

All composables are auto-imported. No import statements needed in `<script setup>`.

## Available Composables

- `defineConfig()` — define or override Maizzle config per-template
- `useConfig()` — read the resolved Maizzle config
- `useDoctype()` — set a custom doctype for the template
- `usePlaintext()` — enable plaintext generation for the template
- `usePreheader()` — set the preview/preheader text programmatically
- `useEvent()` — register event handlers from within a template

---

## defineConfig

Define or override Maizzle config for the current template. Merges with the global `maizzle.config.ts` config and provides the result to child components.

Also used in `maizzle.config.ts` as a typed identity function.

```vue
<script setup>
// Override config for this template
defineConfig({
  css: {
    inline: true,
    purge: true,
    shorthand: true,
  },
  url: {
    base: 'https://cdn.example.com/emails/',
  },
})
</script>
```

In `maizzle.config.ts`:

```ts
import { defineConfig } from '@maizzle/framework'

export default defineConfig({
  css: {
    inline: true,
    purge: true,
  },
})
```

---

## useConfig

Read the resolved Maizzle config. Returns the merged config (global + any per-template overrides from `defineConfig()`).

```vue
<script setup>
const config = useConfig()
// Access any config value
const baseUrl = config.url?.base
</script>
```

---

## useDoctype

Set a custom doctype for the current template. By default, Maizzle uses `<!DOCTYPE html>`.

```vue
<script setup>
// HTML 4.01 Transitional (some email senders require this)
useDoctype('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">')
</script>
```

---

## usePlaintext

Enable plaintext generation for the current template. The plaintext version strips all HTML and places link URLs next to their anchor text.

Options:
- `extension` (String, optional) — file extension for the plaintext file
- `destination` (String, optional) — custom output path

```vue
<script setup>
// Default plaintext
usePlaintext()

// Custom extension
usePlaintext({ extension: 'text' })

// Custom destination
usePlaintext({ destination: '/custom/path' })
</script>
```

---

## usePreheader

Set the preview/preheader text programmatically. Injects a hidden `<div>` at the start of `<body>` with the text, followed by filler characters. Alternative to using the `<Preheader>` component.

Options:
- `fillerCount` (Number, default: `150`) — number of filler pairs
- `shyCount` (Number, default: `150`) — number of `&shy;` entities

```vue
<script setup>
usePreheader('Thanks for signing up!')

// Custom filler counts
usePreheader('Welcome!', { fillerCount: 200, shyCount: 200 })
</script>
```

---

## useEvent

Register event handlers from within a template's `<script setup>`. Handlers run after config-level handlers, in registration order.

Available events:

- `beforeCreate` — runs before the template is created. Receives `{ config }`.
- `beforeRender` — runs before SSR render. Receives `{ config, template }`. Return a string to replace the template.
- `afterRender` — runs after SSR render, before transformers. Receives `{ config, template, html }`. Return a string to replace the HTML.
- `afterTransform` — runs after all transformers. Receives `{ config, template, html }`. Return a string to replace the HTML.
- `afterBuild` — runs after all templates are built. Receives `{ files, config }`.

```vue
<script setup>
// Modify HTML after rendering
useEvent('afterRender', ({ html }) => {
  return html.replace('{{unsubscribe}}', 'https://example.com/unsubscribe')
})

// Modify HTML after all transformers
useEvent('afterTransform', ({ html }) => {
  return html.replace('</body>', '<script>tracking()<\/script></body>')
})

// Access config before rendering
useEvent('beforeCreate', ({ config }) => {
  console.log('Building with config:', config)
})
</script>
```
