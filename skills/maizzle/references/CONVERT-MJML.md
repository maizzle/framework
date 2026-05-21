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
| Mustache `{{ name }}` (via templating layer) | Vue interpolation `{{ name }}` |
| _(no native conditionals)_ | `v-if` / `v-else-if` / `v-else` |
| _(no native loops)_ | `v-for="item in items" :key="item.id"` |
| _(no native props)_ | `defineProps()` in `<script setup>` |
| `<mj-title>` | `useHead({ title: '...' })` |

## Component Mapping

| MJML | Maizzle | Notes |
|---|---|---|
| `<mjml>` | `<Html>` (or `<Layout>` for full doc setup) | |
| `<mj-head>` | `<Head>` | When not using `<Layout>`, contains `<style>@import "@maizzle/tailwindcss";</style>`. |
| `<mj-title>title</mj-title>` | `useHead({ title: '...' })` | Composable in `<script setup>`. |
| `<mj-preview>text</mj-preview>` | `<Preheader>text</Preheader>` | Auto-teleported to body start. |
| `<mj-body width="600px">` | `<Body>` + `<Container width="600">` | Width lives on `<Container>`, not `<Body>`. |
| `<mj-section>` | `<Section>` | MSO `<table>` wrapped automatically. |
| `<mj-group>` | `<Row>` | Side-by-side, no stacking on mobile. |
| `<mj-column>` | `<Column>` | Width via `class="w-1/2"`; add `xs:w-full` for mobile stacking. Without explicit widths, auto-calculates `min-width` from nearest sized ancestor. |
| `<mj-text>` | `<Text>` | Supports `as="span"`. |
| `<mj-button href="...">` | `<Button href="...">` | VML fallback for Outlook automatic. Variants: `solid`(default)/`outline`/`ghost`/`link`. |
| `<mj-image src="..." width="150px">` | `<Img src="..." width="150">` | `width` required. `dark-src`/`motion-src` for variant images via `<picture>`. |
| `<mj-divider border-color="#ccc">` | `<Hr class="bg-gray-300">` | `<Hr>` is a styled `<div>` (defaults `h-px leading-px my-6 bg-slate-300`). Override `bg-*`/`m*-*`/`h-*`/`leading-*`. |
| `<mj-spacer height="24px">` | `<Spacer class="h-6">` | Vertical sizing via `leading-*` or `h-*`; Outlook fine-tune with `mso-line-height-alt-*`. |
| `<mj-table>` | Plain `<table>` with Tailwind classes | No dedicated wrapper. |
| `<mj-raw>` | `<Raw>` | Verbatim pass-through. |
| `<mj-attributes><mj-all font-family="..." />` | `html.attributes.add` in `maizzle.config.ts` | Or shared Tailwind classes on a `<Layout>` wrapper. |
| `<mj-class name="...">` | Tailwind utility class | Author utilities directly. |
| `<mj-style>` | `<style>` in `<Head>` | Or `@theme { ... }` inside the Tailwind import. |
| `<mj-include path="./header.mjml">` | `<Header />` (in `components/Header.vue`) | Auto-imported. |
| `<mj-font name="..." href="...">` | `<link>` in `<Head>`, or `@font-face` in `<style>` | `<Layout>` includes Inter by default. |
| `<mj-social>`/`<mj-social-element>` | `<Row>` + `<Column>` + `<Img>` | Compose with icons inside columns. |
| `<mj-navbar>`/`<mj-navbar-link>` | `<Row>` + `<Column>` + `<Link>` | Compose manually. |
| `<mj-hero>` | `<Section>` + `<OutlookBg>` for VML fallback | Section bg image + VML fallback. |
| `<mj-carousel>` / `<mj-accordion>` | _(not supported)_ | Interactive content rarely renders. Flatten to stacked sections / hero+button. |

## Maizzle-Only Components & Features

| Component | Purpose |
|---|---|
| `<Layout>` | Full document scaffold (replaces `<mjml> + <mj-head> + <mj-body>`). Props: `lang`, `dir`, `body-class`, `aria-label`, `double-head`, `outlook-fallback`. |
| `<Container>` | Max-width wrapper distinct from `<Section>`. |
| `<Heading level="1">` | Semantic `h1`–`h6` with email-safe defaults. |
| `<Link>` | Anchor defaulting to `no-underline`. |
| `<Tailwind>` | Scope a Tailwind stylesheet (+optional `@theme` config) to a subtree. |
| `<Markdown>` | Render Markdown inline; accepts `src` for `.md` files. |
| `<CodeBlock>` / `<CodeInline>` | Shiki syntax highlighting. |
| `<Outlook>` / `<NotOutlook>` | Render inside (or outside) MSO. Outlook supports version filtering. |
| `<OutlookBg>` | VML background images. |
| `<Overlap>` | Faux absolute positioning with VML fallback. |
| `<NoWidows>` | Prevents orphaned last words. |
| `<WithUrl>` | Scoped URL rewriting (base URL, UTM params). |
| `<Plaintext>` / `<NotPlaintext>` | Plaintext-only or HTML-only routing. |
| `<QrCode value="...">` | Table-based QR. Props: `value`, `ecc`, `border`, `alt`. Sized via `size-*`/`w-*`/`h-*`. |
| Responsive | `sm:` (≤600px), `xs:` (≤430px). MJML auto-stacks; Maizzle gives explicit control. |
| Dark mode | `dark:` via `prefers-color-scheme`. |
| Client variants | `gmail:`, `outlook-mac:`, `apple-mail:`, `yahoo:`, etc. |
| `defineConfig()` | Per-template config overrides. |
| `useEvent()` | Template-level lifecycle hooks. |

## Conversion Steps

### 1. File format

`.mjml` XML → `.vue` SFC with `<script setup>` + `<template>`.

### 2. Document structure

Recommended — `<Layout>` sets everything up:

```vue
<template>
  <Layout lang="en" body-class="bg-gray-100"><!-- content --></Layout>
</template>
```

MJML-like with explicit `<Html>`/`<Head>`/`<Body>` and `<Tailwind>`:

```vue
<template>
  <Html lang="en">
    <Head />
    <Tailwind>
      <Body class="bg-gray-100"><!-- content --></Body>
    </Tailwind>
  </Html>
</template>
```

### 3. Title and preheader

```vue
<script setup>
useHead({ title: 'Welcome to Acme' })
</script>
<template>
  <Layout>
    <Preheader>Let's get you set up.</Preheader>
  </Layout>
</template>
```

### 4. Per-tag defaults

MJML's `<mj-attributes>` block disappears. Three replacements:

- **Style defaults** (font, color, size): Tailwind classes on a wrapper, or `@theme` inside the Tailwind import.
- **HTML attributes** that should land on every rendered tag: [`html.attributes.add`](/docs/development/configuration#html-attributes-add) in config.
- **Component defaults** reused a lot: wrap into a custom component (`components/MyText.vue`).

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

### 5. Sections, columns, widths

```vue
<Section>
  <Row>
    <Column>…</Column>
    <Column>…</Column>
  </Row>
</Section>
```

### 6. Buttons and dividers

Drop MJML's per-tag style attrs; replace with Tailwind classes.

```vue
<Button href="https://example.com" class="bg-blue-600 text-white px-5 py-3 rounded">Verify</Button>
<Hr class="bg-gray-200 my-5" />
```

### 7. Spacer

`<mj-spacer height="32px" />` → `<Spacer class="h-8" />`. For Outlook fine-tuning use `mso-line-height-alt-*`.

### 8. Includes → components

`<mj-include path="./header.mjml" />` → place a component in `components/Header.vue`, then use `<Header />`. Auto-imported.

```vue
<!-- components/Header.vue -->
<template>
  <Section class="py-4">
    <Img src="/logo.png" alt="Acme" width="120" />
  </Section>
</template>
```

### 9. Templating data

MJML files don't take props natively. In Maizzle, `defineProps()` lets the template own its inputs:

```vue
<script setup>
const props = defineProps({
  name: { type: String, default: 'friend' },
  items: { type: Array, default: () => [] },
})
</script>
<template>
  <Text>Hi {{ name }}</Text>
  <Section v-for="item in items" :key="item.id"><Text>{{ item.title }}</Text></Section>
</template>
```

### 10. Compiling

Replace `mjml emails/welcome.mjml -o dist/welcome.html` with `npx maizzle build`, or programmatically:

```ts
import { build, render } from '@maizzle/framework'

const { files } = await build({ content: ['emails/**/*.vue'], output: { path: 'dist' } })
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
        <mj-button href="https://example.com/verify" background-color="#2563eb" color="#ffffff" border-radius="6px" padding="14px 28px">Verify email</mj-button>
        <mj-divider border-color="#e2e8f0" padding="24px 0" />
        <mj-text font-size="13px" color="#94a3b8">If you didn't sign up, ignore this email.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

**Maizzle:**

```vue
<script setup>
const props = defineProps({ name: { type: String, default: 'friend' } })
useHead({ title: 'Welcome to Acme' })
</script>

<template>
  <Layout body-class="bg-slate-100">
    <Preheader>Let's get you set up.</Preheader>
    <Container class="max-w-xl">
      <Section class="bg-white px-6 py-10 text-base leading-6 text-slate-600">
        <Heading level="1" class="text-2xl font-bold text-slate-900 mb-4">Hi {{ name }}</Heading>
        <Text>Thanks for signing up. Click below to verify your email.</Text>
        <Button href="https://example.com/verify" class="bg-blue-600 text-white px-7 py-3.5 rounded-md my-6">Verify email</Button>
        <Hr class="bg-slate-200 my-6" />
        <Text class="text-sm text-slate-400">If you didn't sign up, ignore this email.</Text>
      </Section>
    </Container>
  </Layout>
</template>
```

## Common Pitfalls

1. Treating `<Body>` like `<mj-body width="...">` — width lives on `<Container>`.
2. Setting Button colors via `background-color` attribute — use Tailwind classes (`class="bg-blue-600 text-white"`) or inline `style`.
3. Using `<Heading as="h2">` — prop is `level="2"` (number, not tag name).
4. Re-creating `<mj-attributes>` per template — use a shared `<Layout>` wrapper or `html.attributes.add` config.
5. Putting `<mj-title>` content into a `<title>` tag manually — use `useHead({ title })`.
6. Importing components — auto-imported from `components/`, no `import` statements.
7. Looking for `<mj-social>` / `<mj-navbar>` / `<mj-hero>` / `<mj-carousel>` / `<mj-accordion>` — no direct equivalents; compose with `<Row>` / `<Column>` / `<Img>` / `<OutlookBg>` or drop interactive ones.
8. Keeping `<mj-include>` — replace with a custom Vue component.
9. Mixing Mustache `{{ name }}` with Vue's `{{ name }}` — identical look, different data source (props/composables vs. outer rendering layer). Wrap literal `{{ }}` you want passed through with `<Raw>`.
