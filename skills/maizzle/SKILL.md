---
name: maizzle
description: Use when building, editing, or debugging HTML email templates with Maizzle and Tailwind CSS. Triggers on Maizzle projects, email template work, HTML email component usage, email CSS inlining, and email-client compatibility questions.
license: MIT
metadata:
  author: Maizzle
  version: "1.0.0"
  homepage: https://maizzle.com
  source: https://github.com/maizzle/framework
  openclaw:
    install:
      - kind: node
        package: "@maizzle/framework"
        label: Maizzle
    links:
      repository: https://github.com/maizzle/framework
      documentation: https://maizzle.com/docs
---

# Maizzle

Build and send HTML emails that work in all major email clients, with Vue components and Tailwind CSS.

## Install

Scaffold a project (interactive when `[starter]` and `[directory]` are omitted):

```sh
npx maizzle new [user/repo] [directory]
```

Add to an existing project:

```sh
npm i @maizzle/framework
```

```json
// package.json
{ "scripts": { "dev": "maizzle serve", "build": "maizzle build" } }
```

The dev server generates `.maizzle/` (typed `.d.ts` for auto-imported components and composables). Include it in `tsconfig.json`. Works with npm, yarn, pnpm, bun.

## Basic template

```vue
<script setup>
defineConfig({
  name: { type: String, default: 'friend' },
})
</script>

<template>
  <Layout>
    <Container class="max-w-xl">
      <Section>
        <Heading level="1" class="text-2xl font-semibold mb-4">
          Welcome, {{ name }}!
        </Heading>
        <Text class="text-gray-700 mb-6">
          Build HTML emails with Vue and Tailwind.
        </Text>
        <Button class="bg-blue-600 text-white px-4 py-2 rounded" href="https://maizzle.com">
          Learn more
        </Button>
      </Section>
    </Container>
  </Layout>
</template>
```

## Components

All built-in components auto-import. Full props/usage in `references/COMPONENTS.md`; multi-column layout patterns in `references/PATTERNS.md`.

**Document scaffolding** — `<Layout>`, `<Html>`, `<Head>`, `<Body>`, `<Tailwind>`, `<Font>`, `<Preheader>`

**Layout primitives** — `<Container>`, `<Section>`, `<Row>`, `<Column>`

**Content** — `<Heading>`, `<Text>`, `<Link>`, `<Button>`, `<Img>`, `<Hr>`, `<Spacer>`, `<Markdown>`, `<CodeBlock>`, `<CodeInline>`, `<QrCode>`

**Conditionals & escape hatches** — `<Outlook>`, `<NotOutlook>`, `<OutlookBg>`, `<Plaintext>`, `<NotPlaintext>`, `<Raw>`, `<NoWidows>`, `<WithUrl>`

**AMP4Email** — `<amp-*>` tags pass through verbatim (native, no component resolution). `<style amp-custom>` is preserved like `<style embed>` — use `@reference "@maizzle/tailwindcss"` (not `@import`) for `@apply` inside.

## Authoring rules

Surgical edits: change only what was asked. Keep existing structure, components, and class lists intact unless explicitly requested.

Reach for built-in components over raw HTML — they encode email-client quirks. Style with Tailwind utilities; arbitrary values are fine. Don't add `box-border` on `<Button>` (handled internally) or `border-solid border-*` on `<Hr>` (use `bg-*` for color).

Don't add `mso-style` just to repeat padding or background for Outlook. `<Container>`, `<Section>`, and `<Column>` auto-hoist `background-color` and `padding*` from your Tailwind classes onto the MSO `<td>` — set them once via utilities (`bg-* px-* py-*`) and Outlook gets them too. Reserve `mso-style` for genuine Outlook-only overrides. Caveats: hoisting is skipped when the element has a horizontal border (Word renders div padding then, so a `<td>` copy would double-pad), and on `<Column>` it only applies to auto-width columns whose slot resolves to px (a percentage-width column like `w-1/2` won't hoist padding).

What survives across email clients:
- **Outlook desktop on Windows** uses Word as renderer — no `border-radius`, `background-image`, modern CSS, or media queries. Maizzle's components include MSO ghost tables / VML where needed.
- **Gmail clips emails > ~102 KB**. Keep templates lean; minify for production. `<QrCode>` can be heavy.
- **Layout**: no flex/grid in older clients. Use `<Row>` / `<Column>`.
- **Responsive**: `sm:` (≤600px), `xs:` (≤430px) — supported in many clients as progressive enhancement.
- **Dark mode**: `dark:` via `prefers-color-scheme`. Patchy support; treat as enhancement.
- **Images**: PNG/JPEG/GIF in production; `<Img dark-src motion-src>` for variants. Always set `alt` and `width`.
- **Spacing**: prefer `<Spacer>` between block elements (Outlook ignores some margins). Margins are fine on text.
- **Avoid**: `position: absolute/relative`, embedded SVG (Gmail), inline `<style>` blocks for layout.

For brand color/logo gathering, depth styling guidance, dark mode, and footer patterns, see `references/STYLING.md`.

## Static assets & URLs

Place static files in `public/`. Reference them via absolute paths (`/logo.png`). The build copies `public/` to the output dir.

Production rewriting (relative → absolute) happens via `url.base` in config or scoped via `<WithUrl>`:

```ts
// maizzle.config.ts
export default defineConfig({
  url: { base: 'https://cdn.example.com/emails/' },
})
```

```vue
<WithUrl base="https://cdn.example.com/emails/">
  <Img src="/logo.png" alt="Logo" width="120" />
</WithUrl>
```

Both skip absolute URLs, data URIs, protocol-relative, and fragments. UTM/query params: `url.query` globally or `<WithUrl parameters="utm_source=...">` scoped.

## Styling overview

Maizzle uses Tailwind CSS 4 via `@maizzle/tailwindcss` — email-safe resets, MSO utilities, client variants. `<Layout>` already imports it. For manual control:

```vue
<Head>
  <style>@import "@maizzle/tailwindcss";</style>
</Head>
```

Defaults: `css.inline`, `css.purge`, `css.shorthand`, `css.safe`, `css.preferUnitless`, `css.sixHex`, `html.format`, `html.decodeEntities` are all on. `html.minify` is off.

Client variants: `gmail:`, `gmail-android:`, `apple-mail:`, `ios:`, `outlook-mac:`, `outlook-android:`, `yahoo:`, `thunderbird:`, `superhuman:`, `notion:`, `spark:`, …

Full CSS / HTML / pipeline knobs: `references/CONFIGURATION.md` and `references/TRANSFORMERS.md`.

## Programmatic render

```ts
import { render } from '@maizzle/framework'

const { html, plaintext } = await render('emails/welcome.vue', {
  config: { css: { inline: true, purge: true }, plaintext: true },
})
```

Accepts an SFC path, raw SFC string, or imported Vue component. Runs SSR + the full transformer pipeline.

## Plaintext

Enable globally:

```ts
export default defineConfig({ plaintext: true })
```

Or per-template via `usePlaintext()` in `<script setup>`. Customize destination/extension/strip-HTML opts by passing an object. See `references/COMPOSABLES.md`.

## CLI

`npx maizzle …` or install globally with `npm i -g maizzle`. Full command/flag reference: `references/CLI.md`.

## References

- `references/COMPONENTS.md` — every component, props, examples.
- `references/PATTERNS.md` — column / responsive layout patterns.
- `references/STYLING.md` — Tailwind, color tokens, brand brief, authoring principles.
- `references/CONFIGURATION.md` — every config key, defaults, examples.
- `references/COMPOSABLES.md` — `defineConfig`, `useConfig`, `useTransformers`, `useBaseUrl`, `useUrlQuery`, `useEvent`, `useDoctype`, `usePlaintext`, `usePreheader`, `useHead`.
- `references/TRANSFORMERS.md` — pipeline order, per-stage behavior.
- `references/CLI.md` — every CLI command, flags, and usage.
- `references/CONVERT-REACT-EMAIL.md` — porting guide from React Email.
- `references/CONVERT-MAIZZLE-V5.md` — upgrade guide from Maizzle 5 to Maizzle 6.
