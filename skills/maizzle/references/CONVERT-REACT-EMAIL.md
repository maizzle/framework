# Converting React Email to Maizzle

Guide for converting React Email (JSX/TSX) templates and components to Maizzle 6 (Vue SFC) templates.

## Syntax Changes

| React Email | Maizzle |
|---|---|
| `className="..."` | `class="..."` |
| `{variable}` | `{{ variable }}` |
| `{cond && <X />}` | `<X v-if="cond" />` |
| `{cond ? <A /> : <B />}` | `<A v-if="cond" />` `<B v-else />` |
| `{items.map(i => <X />)}` | `<X v-for="i in items" />` |
| `<Component prop={value}>` | `<Component :prop="value">` |
| `style={{ color: 'red' }}` | `class="text-red-500"` or `style="color: red"` |
| `<>...</>` | `<template>...</template>` (or remove) |

Vue templates need a colon prefix to bind dynamic values (`:href="resetUrl"`); strings without a colon are static.

## Component Mapping

| React Email | Maizzle | Notes |
|---|---|---|
| `<Html>` | `<Html>` | Or `<Layout>` for full document setup. |
| `<Tailwind config={...}>` | _(remove)_ | Maizzle compiles via `@import "@maizzle/tailwindcss"` in `<style>`. |
| `<Head />` | `<Head>` | Without `<Layout>`, contains `<style>@import "@maizzle/tailwindcss";</style>`. |
| `<Body>` | `<Body>` | Or `<Layout body-class="...">`. |
| `<Preview>text</Preview>` | `<Preheader>text</Preheader>` | Auto-teleported to body start. |
| `<Container>` | `<Container>` | Optional `width` prop pins div max-width + MSO table width. Default `max-w-150 mx-auto` (600px). |
| `<Section>` | `<Section>` | MSO `<table>` wrapped automatically. |
| `<Row>` | `<Row>` | |
| `<Column class="w-1/2">` | `<Column class="w-1/2 xs:w-full">` | Without explicit widths, auto-calculates `min-width` from nearest sized ancestor. |
| `<Heading as="h2">` | `<Heading level="2">` | Prop is `level` (1-6), not `as`. Has built-in `m-0`. |
| `<Text>` | `<Text>` | Supports `as="span"`. |
| `<Button href="..." className="... block text-center no-underline box-border">` | `<Button href="..." class="...">` | Drop `box-border block text-center no-underline` — handled internally. Variants: `solid`(default)/`outline`/`ghost`/`link`. Optional `align`, `icon`, `icon-position`. |
| `<Link>` | `<Link>` | Defaults to `no-underline`. |
| `<Img src="..." width="150">` | `<Img src="..." width="150">` | `width` required. Adds `dark-src`/`motion-src` for variant images via `<picture>`. |
| `<Hr>` | `<Hr>` | Styled `<div>` (defaults `h-px leading-px my-6 bg-slate-300`). Override via `bg-*`/`m*-*`/`h-*`/`leading-*`. Drop `border-solid border-*`. |
| `<CodeBlock code language="js" theme={dracula}>` | `<CodeBlock code="..." language="js" theme="github-light">` | Theme is a Shiki theme **name** (string), not imported object. |
| `<CodeInline>` | `<CodeInline>` | Plain by default; opt into Shiki via `theme` prop. |
| `<Markdown>{content}</Markdown>` | `<Markdown>content</Markdown>` | Also accepts `src` for `.md` files. |
| `<Font fontFamily webFont>` | _(use `<link>` in `<Head>`)_ | No `<Font>` component required; `<Layout>` includes Inter by default. |

## Maizzle-Only Components & Features

| Component | Purpose |
|---|---|
| `<Layout>` | Full document scaffold. Replaces `Html > Tailwind > Head + Body`. Props: `lang`, `dir`, `body-class`, `aria-label`, `double-head`, `outlook-fallback`. |
| `<Spacer>` | Vertical/horizontal spacer. Props: `type`, `width` (horizontal-only, default 16). Vertical sizing via `leading-*`/`h-*`; Outlook fine-tune via `mso-line-height-alt-*`. Horizontal renders MSO-safe `mso-font-width` `<i>`. |
| `<WithUrl>` | Scoped URL rewriting (base URL, UTM) for descendant `href`/`src` attrs. |
| `<NoWidows>` | Prevent orphaned last words. |
| `<Outlook>`/`<NotOutlook>` | Render inside/outside Outlook. Outlook supports version filtering + `open`/`close` raw HTML for ghost-table openers. |
| `<OutlookBg>` | VML background images. |
| `<Overlap>` | Faux absolute positioning with VML fallback. |
| `<Plaintext>`/`<NotPlaintext>` | Plaintext-only or HTML-only routing. |
| `<QrCode value="...">` | Table-based QR. Props: `value`, `ecc`, `border`, `alt`. Sized via `size-*`/`w-*`/`h-*`. |
| `<Raw>` | Pass content through verbatim — `{{ }}` and other Vue/ESP syntax not parsed. |
| `<Preheader spaces="150">` | Hidden preview text + filler. Auto-teleports to `body:start`. |
| `<Img dark-src motion-src>` | `<picture>` with dark-mode + reduced-motion variants. |
| Responsive | `sm:` (≤600px), `xs:` (≤430px). |
| Dark mode | `dark:` via `prefers-color-scheme`. |
| Client variants | `gmail:`, `outlook-mac:`, `apple-mail:`, `yahoo:`, etc. |
| `defineConfig()` | Per-template config overrides. |
| `useEvent()` | Template-level lifecycle hooks. |

## Conversion Steps

### 1. File format

`.tsx` default-export function → `.vue` SFC with `<script setup>` + `<template>`.

### 2. Remove React Email boilerplate

- Drop all imports — Maizzle's components and composables auto-import.
- Drop `<Tailwind>` and `pixelBasedPreset` — not needed.
- Drop the `export default function` wrapper.
- `Welcome.PreviewProps = {...}` → `defineProps({...})` with defaults.

### 3. Document structure

Recommended:

```vue
<template>
  <Layout lang="en" body-class="bg-gray-100"><!-- content --></Layout>
</template>
```

React Email-like with `<Tailwind>`:

```vue
<template>
  <Html lang="en">
    <Head />
    <Tailwind><Body class="bg-gray-100"><!-- content --></Body></Tailwind>
  </Html>
</template>
```

Manual control:

```vue
<template>
  <Html lang="en">
    <Head><style>@import "@maizzle/tailwindcss";</style></Head>
    <Body class="bg-gray-100"><!-- content --></Body>
  </Html>
</template>
```

### 4. Props

```vue
<script setup>
const props = defineProps({
  name: String,
  items: Array,
  showFooter: { type: Boolean, default: true },
})
</script>
```

### 5. Control flow

```vue
<Text v-if="isVip">VIP member</Text>
<Text v-if="status === 'active'">Active</Text>
<Text v-else>Inactive</Text>
<Section v-for="(item, i) in items" :key="i"><Text>{{ item.name }}</Text></Section>
```

### 6. Styling

`className` → `class`. Tailwind utilities mostly identical (Maizzle uses Tailwind v4).

Drop email-workaround classes Maizzle handles internally:
- `box-border`, `block text-center no-underline` on `<Button>`
- `border-solid border-*` on `<Hr>`

Customize Tailwind theme inline:

```vue
<Head>
  <style>
    @import "@maizzle/tailwindcss";
    @theme { --color-brand: #007bff; }
  </style>
</Head>
```

### 7. Images

Drop manual `baseURL` concatenation. Use `url.base` in `maizzle.config.ts` or `<WithUrl>`. Place files in `public/`.

```vue
<Img src="/logo.png" alt="Logo" width="150" />
```

```ts
export default defineConfig({ url: { base: 'https://cdn.example.com/emails/' } })
```

### 8. Dividers

```vue
<Hr class="bg-gray-200 my-5" />
<Hr class="h-0.5 bg-blue-300" />
```

### 9. Preheader

`<Preview>` (must be first inside `<Body>`) → `<Preheader>` (anywhere; auto-teleported):

```vue
<template>
  <Preheader>Preview text here</Preheader>
  <Layout>...</Layout>
</template>
```

## Full Example: Password Reset

**React Email:**

```tsx
import {
  Html, Head, Preview, Body, Container, Heading, Text, Button, Hr,
  Tailwind, pixelBasedPreset
} from 'react-email';

interface Props { resetUrl: string; email: string; expiryHours?: number; }

export default function PasswordReset({ resetUrl, email, expiryHours = 1 }: Props) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="bg-gray-100 font-sans">
          <Preview>Reset your password</Preview>
          <Container className="mx-auto py-10 px-5 max-w-xl bg-white">
            <Heading className="text-2xl font-bold text-gray-800 mb-5">Reset Your Password</Heading>
            <Text className="text-base leading-7 text-gray-800 my-4">A reset was requested for <strong>{email}</strong>.</Text>
            <Text className="text-base leading-7 text-gray-800 my-4">This link expires in {expiryHours} hour{expiryHours > 1 ? 's' : ''}.</Text>
            <Button href={resetUrl} className="bg-red-600 text-white px-7 py-3.5 rounded block text-center font-bold my-6 no-underline box-border">Reset Password</Button>
            <Hr className="border-solid border-gray-200 my-6" />
            <Text className="text-sm text-gray-500 leading-5 my-2">If you didn't request this, ignore this email.</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

PasswordReset.PreviewProps = { resetUrl: 'https://...', email: 'a@b.com', expiryHours: 1 };
```

**Maizzle:**

```vue
<script setup>
const props = defineProps({
  resetUrl: { type: String, default: 'https://example.com/reset/abc123' },
  email: { type: String, default: 'user@example.com' },
  expiryHours: { type: Number, default: 1 },
})
</script>

<template>
  <Layout body-class="bg-gray-100">
    <Preheader>Reset your password</Preheader>
    <Container class="max-w-xl">
      <Section class="py-10 px-5 bg-white">
        <Heading class="text-2xl font-bold text-gray-800 mb-5">Reset Your Password</Heading>
        <Text class="leading-7 text-gray-800">A reset was requested for <strong>{{ email }}</strong>.</Text>
        <Text class="leading-7 text-gray-800">This link expires in {{ expiryHours }} hour{{ expiryHours > 1 ? 's' : '' }}.</Text>
        <Button :href="resetUrl" class="bg-red-600 text-white font-bold rounded my-6">Reset Password</Button>
        <Hr class="bg-gray-200 my-6" />
        <Text class="text-sm text-gray-500">If you didn't request this, ignore this email.</Text>
      </Section>
    </Container>
  </Layout>
</template>
```

## Common Pitfalls

1. `<Heading as="h2">` — it's `level="2"`.
2. Keeping `box-border` / `block text-center no-underline` on `<Button>` — internal.
3. Forgetting `xs:w-full` on Columns when you want mobile stacking with explicit widths.
4. Manual `baseURL` concatenation for images — use `url.base` or `<WithUrl>`.
5. Forgetting `:` for dynamic props (`:href="resetUrl"`, not `href={resetUrl}` or `href="resetUrl"`).
6. `{variable}` instead of `{{ variable }}`.
7. Not converting `PreviewProps` to `defineProps`.
8. Setting Button color via a non-existent `bg-color` prop — use Tailwind classes (`class="bg-red-600 text-white"`) or inline `style`.
