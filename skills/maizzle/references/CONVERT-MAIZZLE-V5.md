# Converting Maizzle 5 to Maizzle 6

Migrate Maizzle 5 projects (PostHTML + Tailwind v3 + YAML frontmatter) to Maizzle 6 (Vue SFC SSR + Tailwind v4 CSS-first + `defineConfig()`). v6 is a complete rewrite — prefer scaffolding fresh with `npx maizzle new` and porting over.

## Project Layout

| Maizzle 5 | Maizzle 6 |
|---|---|
| `emails/*.html` | `emails/*.vue` (or `*.md` for prose) |
| `components/*.html` (kebab-case) | `components/*.vue` (PascalCase filenames) |
| `layouts/*.html` | `components/*.vue` (no separate `layouts/` dir) |
| `tailwind.config.js` | _(deleted)_ — `@theme {}` in `<style>` |
| `config.js` / `config.production.js` | `maizzle.config.ts` / `production.config.ts` |

Tag resolution: `<x-card.header>` → `components/card/header.vue` → auto-imports as `<CardHeader>` (kebab-to-PascalCase, `directoryAsNamespace` + `collapseSamePrefixes`).

## Expressions

PostHTML expressions are gone. Use Vue's template syntax:

| Maizzle 5 (PostHTML) | Maizzle 6 (Vue) |
|---|---|
| `{{ page.name }}` | `{{ name }}` |
| `{{{ unsafe }}}` | `<span v-html="unsafe" />` |
| `@{{ keep }}` | `<span v-pre>{{ keep }}</span>` or `<Raw>{{ keep }}</Raw>` |
| `<if condition="x">` | `<div v-if="x">` |
| `<elseif condition="y">` | `<div v-else-if="y">` |
| `<else>` | `<div v-else>` |
| `<each loop="item in items">` | `<div v-for="item in items" :key="item.id">` |
| `<switch>` / `<case n="x">` | `v-if` / `v-else-if` chain |
| `<scope with="...">` | child component, or destructure in `<script setup>` |
| `<yield />` | `<slot />` |
| `<block name="x">` (defines slot) | `<slot name="x" />` |
| `<block name="x">` (fills slot) | `<template #x>...</template>` |

ESP / mail-merge syntax (`{{ mailchimp_var }}`, `*|MERGE|*`, etc.) that you need preserved verbatim: wrap in `<Raw>` or use `v-pre` on the parent.

## Components

PostHTML components → Vue components. Definition: wrap body in `<template>`, replace `<yield />` with `<slot />`. Usage: `<x-card>` → `<Card>`. `<component src="...">` / `<module href="...">` → auto-imported PascalCased tag; `locals="..."` → `v-bind="..."`.

Sizing/styling moved from props to Tailwind classes:

| Maizzle 5 | Maizzle 6 |
|---|---|
| `<x-divider height="2px" space-y="32px" color="#e2e8f0" />` | `<Hr class="h-0.5 my-8 bg-slate-200" />` |
| `<x-spacer height="32px" />` | `<Spacer class="h-8" />` |

For Outlook fine-tuning of spacer height: `mso-line-height-alt-*` utility.

## `.vue` Templates: No Frontmatter

`.vue` templates have **no frontmatter**. Move it into `<script setup>` via `defineConfig()`:

```diff
- ---
- title: Welcome
- preheader: Thanks for signing up
- css:
-   inline: false
- ---
+ <script setup>
+   defineConfig({
+     title: 'Welcome',
+     css: { inline: false },
+   })
+   usePreheader('Thanks for signing up')
+ </script>
```

Prefer dedicated composables for common cases: `usePreheader`, `usePlaintext`, `useBaseUrl`, `useUrlQuery`, `useDoctype`, `useTransformers`, `useHead`. See `references/COMPOSABLES.md`.

`{{ page.x }}` no longer exists — values are just local bindings in `<script setup>`.

## `.md` Templates: Frontmatter Still Works

`.md` templates **keep YAML frontmatter** — it's parsed automatically and head keys (`title`, `description`, `meta`) are injected via `@unhead/vue`. `.md` files also support `<script setup>` at the top.

```md
---
title: Product Update
layout: MarketingLayout
---

<script setup>
  usePreheader('We shipped some new features')
</script>

# Hello

<Button href="https://example.com">Read more</Button>
```

Special frontmatter keys for `.md`:
- `layout: ComponentName` — wrap with a custom layout (default: built-in `MarkdownLayout`).
- `layout: false` — no wrapping.
- The whole frontmatter object is passed as `frontmatter` prop to the wrapping layout. `MarkdownLayout` reads `lang`, `dir`, `ariaLabel`, etc. from it.

## `config.js` → `maizzle.config.ts`

```ts
import { defineConfig } from '@maizzle/framework'

export default defineConfig({
  content: ['emails/**/*.{vue,md}'],
  output: { path: 'dist' },
})
```

`maizzle.config.ts` is optional — v6 ships sensible defaults. Full key reference: `references/CONFIGURATION.md`. Breaking changes only:

**`build` wrapper flattened** — move its children to the root:

```diff
- export default {
-   build: {
-     content: ['emails/**/*.html'],
-     output: { path: 'build_production' },
-   },
- }
+ export default defineConfig({
+   content: ['emails/**/*.{vue,md}'],
+   output: { path: 'dist' },
+ })
```

**CSS / HTML defaults flipped to ON** — `css.inline`, `css.purge`, `css.shorthand`, `html.format` (was `prettify`) are now enabled by default. Disable explicitly if a v5 project depended on them being off.

**Removed keys** — delete from config; v6 handles or replaces:
- `posthtml.*`, `expressions.*` — PostHTML is gone.
- `components.*` — keep only `components.source` (was `components.folders`).
- `outlook` — use the `<Outlook>` component.
- `build.tailwind.config` — Tailwind config moves to `@theme {}` in CSS.

**Renamed keys**:

| Maizzle 5 | Maizzle 6 |
|---|---|
| `attributes.add` | `html.attributes.add` |
| `attributes.remove` | `html.attributes.remove` |
| `prettify` | `html.format` |
| `minify` | `html.minify` |
| `components.folders` | `components.source` |

**`plaintext` shape changed** — string shorthand and `output.*` nesting are gone:

```diff
- plaintext: 'dist/brand/plaintext'
+ plaintext: { destination: 'dist/brand/plaintext' }

- plaintext: { output: { path: '...', extension: 'rtxt' } }
+ plaintext: { destination: '...', extension: 'rtxt' }

- plaintext: { ignoreTags: ['br'] }
+ plaintext: { options: { ignoreTags: ['br'] } }
```

Per-template plaintext: `usePlaintext()` in `<script setup>` instead of frontmatter `plaintext: true`.

**`<fetch>` removed** — use `fetch()` in `<script setup>`:

```diff
- <fetch url="https://api.example.com/news" as="items">
-   <p v-for="item in items">{{ item.title }}</p>
- </fetch>
+ <script setup>
+   const items = await fetch('https://api.example.com/news').then(r => r.json())
+ </script>
+
+ <template>
+   <Text v-for="item in items" :key="item.id">{{ item.title }}</Text>
+ </template>
```

**Env configs** — `config.production.js` → `production.config.ts`, selected with `-c`:

```diff
- "build:prod": "maizzle build production"
+ "build:prod": "maizzle build -c production.config.ts"
```

## Tailwind v3 → v4

Delete `tailwind.config.js`. Replace `tailwindcss-preset-email` with `@maizzle/tailwindcss`. Port `theme.extend.*` to a `@theme {}` block:

```vue
<Head>
  <style>
    @import "@maizzle/tailwindcss";
    @theme {
      --color-brand: #4f46e5;
      --font-display: "Inter", sans-serif;
    }
  </style>
</Head>
```

Token naming: `colors.brand` → `--color-brand`, `fontFamily.display` → `--font-display`, `spacing.lg` → `--spacing-lg`. Built-in `<Layout>` already imports `@maizzle/tailwindcss` — the `<style>` block is only needed for `@theme` customisation or when not using `<Layout>`. Full Tailwind story: `references/STYLING.md`.

## Events

Event handlers register at the root of the config; signatures changed.

**`afterTransformers` → `afterTransform`**:

```diff
- afterTransformers({ html, matter, config }) { ... }
+ afterTransform({ html, template, config }) { ... }
```

**`matter` argument removed** — v6 has no frontmatter on `.vue` files. Per-template config lives on the resolved `config` arg.

**`beforeRender` operates on SFC source**:

```diff
- beforeRender({ html }) {
-   return html.replace('FOO', 'BAR')
- }
+ beforeRender({ template }) {
+   return template.source.replace('FOO', 'BAR')
+ }
```

**`template` arg added** to `beforeRender`, `afterRender`, `afterTransform`:

```ts
interface TemplateInfo {
  source: string         // raw Vue SFC source
  path: ParsedPath       // path.parse(absolutePath) result
}
```

**`config.build.current` gone** — use `template.path` in handlers, or `useCurrentTemplate()` inside an SFC.
