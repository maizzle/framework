# Converting MJML to Maizzle

Guide for converting MJML templates to Maizzle 6 (Vue SFC) templates.

## Syntax Changes

| MJML | Maizzle |
|---|---|
| `attribute="value"` (style as XML attrs) | `class="..."` (Tailwind) or inline `style="..."` |
| `<mj-attributes>` (per-tag defaults) | `html.attributes.add` in config, or component class defaults |
| `<mj-style>` | `<style>` block in `<Head>` |
| `<mj-include path="./x.mjml" />` | Custom Vue component (`<X />`, auto-imported from `components/`) |
| `<mj-raw>` | `<Raw>` |
| Mustache (`{{ name }}` via templating layer) | Vue interpolation `{{ name }}` |
| _(no native conditionals)_ | `v-if` / `v-else-if` / `v-else` |
| _(no native loops)_ | `v-for="item in items" :key="item.id"` |
| _(no native props)_ | `defineProps()` in `<script setup>` |
| `<mj-title>` | `useHead({ title: '...' })` in `<script setup>` |

## Component Mapping

| MJML | Maizzle | Notes |
|---|---|---|
| `<mjml>` | `<Html>` | Or use `<Layout>` for full document setup. |
| `<mj-head>` | `<Head>` | When not using `<Layout>`, contains `<style>@import "@maizzle/tailwindcss";</style>`. |
| `<mj-title>title</mj-title>` | `useHead({ title: '...' })` | Composable in `<script setup>`. |
| `<mj-preview>text</mj-preview>` | `<Preheader>text</Preheader>` | Auto-teleported to body start; can sit anywhere. |
| `<mj-body width="600px">` | `<Body>` + `<Container width="600">` | `<Body>` is just `<body>`; container width lives on `<Container>`. |
| `<mj-section>` | `<Section>` | MSO `<table>` wrapped automatically. |
| `<mj-group>` | `<Row>` | Side-by-side columns that stay inline (no stacking on mobile). |
| `<mj-column>` | `<Column>` | Width via `class="w-1/2"` etc.; add `xs:w-full` for mobile stacking. Without explicit width classes, Column auto-calculates `min-width` from nearest sized ancestor. |
| `<mj-text>` | `<Text>` | Supports `as="span"`. |
| `<mj-button href="...">` | `<Button href="...">` | Supports VML fallback for Outlook on Windows automatically. Variants: `solid` (default), `outline`, `ghost`, `link`. |
| `<mj-image src="..." width="150px">` | `<Img src="..." width="150">` | `width` is required. Adds `dark-src` and `motion-src` for variant images via `<picture>`. |
| `<mj-divider border-color="#ccc">` | `<Hr class="bg-gray-300">` | Maizzle's `<Hr>` is a styled `<div>` with defaults `h-px leading-px my-6 bg-slate-300`. Override via `bg-*`, `m*-*`, `h-*`/`leading-*`. |
| `<mj-spacer height="24px">` | `<Spacer class="h-6">` | Vertical sizing via `leading-*` or `h-*`; Outlook fine-tune via `mso-line-height-alt-*` utilities. |
| `<mj-table>` | Plain `<table>` with Tailwind classes | No dedicated wrapper — write the table directly. |
| `<mj-raw>` | `<Raw>` | Pass content through verbatim — `{{ }}` and other Vue/ESP syntax is not parsed. |
| `<mj-attributes><mj-all font-family="..." />` | `html.attributes.add` in `maizzle.config.ts` | Or set defaults via Tailwind classes on a `<Layout>` wrapper. |
| `<mj-class name="...">` | Tailwind utility class | Not a thing — just author Tailwind utilities directly. |
| `<mj-style>` | `<style>` in `<Head>` | Or `@theme { ... }` inside the Tailwind import for theme tokens. |
| `<mj-include path="./header.mjml">` | `<Header />` (custom component in `components/Header.vue`) | Auto-imported, no `import` needed. |
| `<mj-font name="..." href="...">` | `<link>` in `<Head>`, or `@font-face` in `<style>` | No `<Font>` component is required; `<Layout>` includes Inter by default. |
| `<mj-social>` / `<mj-social-element>` | Plain `<Row>` + `<Column>` + `<Img>` | No dedicated component — compose with `<Img>` icons inside columns. |
| `<mj-navbar>` / `<mj-navbar-link>` | Plain `<Row>` + `<Column>` + `<Link>` | Compose manually. |
| `<mj-hero>` | `<Section>` + `<OutlookBg>` for VML fallback | Build with a section background image plus VML fallback for Outlook. |
| `<mj-carousel>` | _(not supported)_ | Carousels rely on hover/click which most clients block. Use a single hero image + button. |
| `<mj-accordion>` | _(not supported)_ | Same — interactive content rarely renders. Flatten to stacked sections. |

## Maizzle-Only Components & Features

| Component | Purpose |
|---|---|
| `<Layout>` | Full document scaffold: `html` + `head` (charset/viewport/format-detection meta, MSO font reset, Tailwind import, Inter font, color-scheme meta) + `body` + `<div role="article">`. Replaces `<mjml> + <mj-head> + <mj-body>`. Props: `lang`, `dir`, `body-class`, `aria-label`, `double-head`, `outlook-fallback`. |
| `<Container>` | Max-width wrapper distinct from `<Section>` — handy for centering content blocks. |
| `<Heading level="1">` | Semantic `h1`–`h6` with email-safe defaults. MJML has no semantic heading; people use `<mj-text>` with bigger font sizes. |
| `<Link>` | Anchor with safe defaults (`no-underline`). |
| `<Tailwind>` | Scope a Tailwind stylesheet (and optional `@theme` config) to a subtree. |
| `<Markdown>` | Render Markdown content inline; accepts `src` for `.md` files. |
| `<CodeBlock>` / `<CodeInline>` | Syntax-highlighted code via Shiki. |
| `<Outlook>` / `<NotOutlook>` | Render content only inside (or only outside) Microsoft Outlook (MSO conditional comment). Outlook supports version filtering. |
| `<OutlookBg>` | VML background images for Outlook on Windows (rounded buttons, fills, hero backgrounds). |
| `<Overlap>` | Faux absolute positioning with VML fallback — useful for hero overlays. |
| `<NoWidows>` | Prevents orphaned last words in text by joining the last two with `&nbsp;`. |
| `<WithUrl>` | Scoped URL rewriting (base URL, UTM params) for descendant `href`/`src` attributes. |
| `<Plaintext>` / `<NotPlaintext>` | Show content only in the plaintext output (or hide it from plaintext). |
| `<QrCode value="...">` | Inline table-based QR code. Props: `value`, `ecc` (`L`/`M`/`Q`/`H`), `border`, `alt`. Sized via `size-*`/`w-*`/`h-*`. |
| Responsive variants | `sm:` (≤600px), `xs:` (≤430px). MJML auto-stacks columns on mobile; Maizzle gives you explicit control. |
| Dark mode | `dark:` via `prefers-color-scheme`. |
| Client variants | `gmail:`, `outlook-mac:`, `apple-mail:`, `yahoo:`, etc. |
| `defineConfig()` | Per-template config overrides in `<script setup>`. |
| `useEvent()` | Template-level lifecycle hooks (afterRender, afterTransform, etc.). |

## Conversion Steps

### 1. File format

`.mjml` XML document → `.vue` SFC with `<script setup>` and `<template>`.

### 2. Document structure

Recommended — let `<Layout>` set everything up:

```vue
<template>
  <Layout lang="en" body-class="bg-gray-100">
    <!-- content -->
  </Layout>
</template>
```

MJML-like with explicit `<Html>`/`<Head>`/`<Body>` and `<Tailwind>`:

```vue
<template>
  <Html lang="en">
    <Head />
    <Tailwind>
      <Body class="bg-gray-100">
        <!-- content -->
      </Body>
    </Tailwind>
  </Html>
</template>
```

### 3. Title and preheader

```mjml
<mj-head>
  <mj-title>Welcome to Acme</mj-title>
  <mj-preview>Let's get you set up.</mj-preview>
</mj-head>
```

becomes

```vue
<script setup>
useHead({ title: 'Welcome to Acme' })
</script>

<template>
  <Layout>
    <Preheader>Let's get you set up.</Preheader>
    <!-- ... -->
  </Layout>
</template>
```

### 4. Per-tag defaults

MJML's `<mj-attributes>` block disappears. Three replacements:

- **For style defaults** (font-family, color, font-size): use Tailwind classes on a wrapper, or `@theme` in the Tailwind import:

  ```vue
  <Head>
    <style>
      @import "@maizzle/tailwindcss";
      @theme {
        --color-body: #475569;
        --font-sans: "Helvetica, Arial, sans-serif";
      }
    </style>
  </Head>
  ```

- **For HTML attributes** that need to land on every rendered tag, use [`html.attributes.add`](/docs/development/configuration#html-attributes-add) in `maizzle.config.ts`.

- **Per-component defaults** that you reuse a lot — wrap into a custom component (`components/MyText.vue`) with the defaults baked in.

### 5. Sections, columns, widths

```mjml
<mj-section>
  <mj-column width="50%">…</mj-column>
  <mj-column width="50%">…</mj-column>
</mj-section>
```

```vue
<Section>
  <Row>
    <Column>…</Column>
    <Column>…</Column>
  </Row>
</Section>
```

### 6. Buttons and dividers

Drop MJML's per-tag style attributes; replace with Tailwind classes:

```mjml
<mj-button href="https://example.com" background-color="#2563eb" color="#ffffff" border-radius="4px" padding="12px 20px">
  Verify
</mj-button>
```

```vue
<Button href="https://example.com" class="bg-blue-600 text-white px-5 py-3 rounded">
  Verify
</Button>
```

```mjml
<mj-divider border-color="#e5e7eb" border-width="1px" padding="20px 0" />
```

```vue
<Hr class="bg-gray-200 my-5" />
```

### 7. Spacer

```mjml
<mj-spacer height="32px" />
```

```vue
<Spacer class="h-8" />
```

For Outlook fine-tuning use `mso-line-height-alt-*` utilities.

### 8. Includes → components

`<mj-include path="./header.mjml" />` → place a component in `components/Header.vue`, then use `<Header />`. Auto-imported, no manual `import`.

```vue [components/Header.vue]
<template>
  <Section class="py-4">
    <Img src="/logo.png" alt="Acme" width="120" />
  </Section>
</template>
```

```vue [emails/welcome.vue]
<template>
  <Layout>
    <Header />
    <!-- ... -->
  </Layout>
</template>
```

### 9. Templating data

MJML files don't take props natively — most projects pre-render Mustache/Handlebars upstream. In Maizzle, `defineProps()` lets the template own its inputs:

```vue
<script setup>
const props = defineProps({
  name: { type: String, default: 'friend' },
  items: { type: Array, default: () => [] },
})
</script>

<template>
  <Text>Hi {{ name }}</Text>
  <Section v-for="item in items" :key="item.id">
    <Text>{{ item.title }}</Text>
  </Section>
</template>
```

### 10. Compiling

Replace `mjml emails/welcome.mjml -o dist/welcome.html` with:

```sh
npx maizzle build
```

Or programmatically:

```ts
import { build } from '@maizzle/framework'

const { files } = await build({
  content: ['emails/**/*.vue'],
  output: { path: 'dist' },
})
```

Single template via `render()`:

```ts
import { render } from '@maizzle/framework'

const { html } = await render('emails/welcome.vue', { name: 'Alex' })
```

## Full Example: Welcome Email

**MJML:**

```xml
<mjml>
  <mj-head>
    <mj-title>Welcome to Acme</mj-title>
    <mj-preview>Let's get you set up.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text color="#475569" font-size="16px" line-height="1.5" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f1f5f9">
    <mj-section background-color="#ffffff" padding="40px 24px">
      <mj-column>
        <mj-text font-size="24px" color="#0f172a" font-weight="bold">Hi {{ name }}</mj-text>
        <mj-text>Thanks for signing up. Click below to verify your email.</mj-text>
        <mj-button href="https://example.com/verify" background-color="#2563eb" color="#ffffff" border-radius="6px" padding="14px 28px">
          Verify email
        </mj-button>
        <mj-divider border-color="#e2e8f0" padding="24px 0" />
        <mj-text font-size="13px" color="#94a3b8">
          If you didn't sign up, ignore this email.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

**Maizzle:**

```vue
<script setup>
const props = defineProps({
  name: { type: String, default: 'friend' },
})

useHead({ title: 'Welcome to Acme' })
</script>

<template>
  <Layout body-class="bg-slate-100">
    <Preheader>Let's get you set up.</Preheader>
    <Container class="max-w-xl">
      <Section class="bg-white px-6 py-10 text-base leading-6 text-slate-600">
        <Heading level="1" class="text-2xl font-bold text-slate-900 mb-4">
          Hi {{ name }}
        </Heading>
        <Text>Thanks for signing up. Click below to verify your email.</Text>
        <Button href="https://example.com/verify" class="bg-blue-600 text-white px-7 py-3.5 rounded-md my-6">
          Verify email
        </Button>
        <Hr class="bg-slate-200 my-6" />
        <Text class="text-sm text-slate-400">
          If you didn't sign up, ignore this email.
        </Text>
      </Section>
    </Container>
  </Layout>
</template>
```

## Common Pitfalls

1. Treating `<Body>` like `<mj-body width="...">` — width lives on `<Container>`, not `<Body>`.
2. Setting Button colors via attribute names like `background-color` — use Tailwind classes (`class="bg-blue-600 text-white"`) or inline `style`.
3. Using `<Heading as="h2">` — prop is `level="2"` (number, not tag name).
4. Re-creating `<mj-attributes>` per template instead of a shared `<Layout>` wrapper or `html.attributes.add` config.
5. Putting `<mj-title>` content into a `<title>` tag manually — use the `useHead({ title })` composable instead.
6. Importing components — they're auto-imported from `components/`. Don't write `import` statements.
7. Looking for `<mj-social>` / `<mj-navbar>` / `<mj-hero>` / `<mj-carousel>` / `<mj-accordion>` — there are no direct equivalents. Compose with `<Row>` / `<Column>` / `<Img>` / `<OutlookBg>`, or drop the interactive ones entirely.
8. Keeping `<mj-include>` syntax — replace with a custom Vue component in `components/`.
9. Mixing Mustache (`{{ name }}`) with Vue's `{{ name }}` — they look identical but the data source changes (props/composables instead of an outer rendering layer). Wrap literal `{{ }}` you want passed through with `<Raw>`.
