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
| `<Html>` | `<Html>` | Same. Or use `<Layout>` for full document setup. |
| `<Tailwind config={...}>` | _(remove)_ | Maizzle compiles Tailwind via `@import "@maizzle/tailwindcss"` in `<style>`. |
| `<Head />` | `<Head>` | When not using `<Layout>`, contains `<style>@import "@maizzle/tailwindcss";</style>`. |
| `<Body>` | `<Body>` | Or `<Layout body-class="...">`. |
| `<Preview>text</Preview>` | `<Preheader>text</Preheader>` | Auto-teleported to body start; can sit anywhere. |
| `<Container>` | `<Container>` | Optional `width` prop pins both div max-width and MSO table width. Without it: `max-w-150 mx-auto` (600px), MSO width auto-derived. |
| `<Section>` | `<Section>` | MSO `<table>` wrapped automatically. |
| `<Row>` | `<Row>` | Same. |
| `<Column class="w-1/2">` | `<Column class="w-1/2 xs:w-full">` | Without explicit width classes, Column auto-calculates `min-width` from nearest sized ancestor and stacks naturally. |
| `<Heading as="h2">` | `<Heading level="2">` | Prop is `level` (number 1-6), not `as`. Default `level=1`. Has built-in `m-0`. |
| `<Text>` | `<Text>` | Supports `as="span"`. |
| `<Button href="..." className="... block text-center no-underline box-border">` | `<Button href="..." class="...">` | Drop `box-border block text-center no-underline` — handled internally. Use `class` for colors. Variants: `solid` (default), `outline`, `ghost`, `link`. Optional `align`, `icon`, `icon-position`. |
| `<Link>` | `<Link>` | Defaults to `no-underline`. |
| `<Img src="..." width="150">` | `<Img src="..." width="150">` | `width` is required. Adds `dark-src` and `motion-src` for variant images via `<picture>`. |
| `<Hr>` | `<Hr>` | Maizzle's `<Hr>` is a styled `<div>` with default 1px gray bg + 24px vertical margin. Override with Tailwind classes (`bg-gray-200 my-8`) or props: `height`, `space-y`, `space-x`, `top`, `bottom`, `left`, `right`. Drop React Email's `border-solid border-*`. |
| `<CodeBlock code language="js" theme={dracula}>` | `<CodeBlock code="..." language="js" theme="github-light">` | Theme is a Shiki theme name (string), not an imported object. |
| `<CodeInline>` | `<CodeInline>` | Same. |
| `<Markdown>{content}</Markdown>` | `<Markdown>content</Markdown>` | Also accepts `src` for `.md` files. |
| `<Font fontFamily webFont>` | _(use `<link>` in `<Head>`)_ | No `<Font>` component. `<Layout>` includes Inter by default. |

## Maizzle-Only Components & Features

| Component | Purpose |
|---|---|
| `<Layout>` | Full document scaffold: `html` + `head` (charset/viewport/format-detection meta, MSO font reset, Tailwind import, Inter font, color-scheme meta) + `body` + `<div role="article">`. Replaces the `Html > Tailwind > Head + Body` chain. Props: `lang`, `dir`, `body-class`, `aria-label`, `double-head`, `outlook-fallback`. |
| `<Spacer>` | Vertical or horizontal spacer. Props: `type` (`vertical`/`horizontal`), `height`, `width` (default 16), `mso-height`. Horizontal renders MSO-safe `mso-font-width` `<i>`. |
| `<WithUrl>` | Scoped URL rewriting (base URL, UTM params) for descendant `href`/`src` attributes. |
| `<NoWidows>` | Prevents orphaned last words in text. |
| `<Outlook>` / `<NotOutlook>` | Render content only in (or only outside) Outlook. Outlook supports version filtering. |
| `<OutlookBg>` | VML background images for Outlook. |
| `<Overlap>` | Faux absolute positioning with VML fallback. |
| `<Plaintext>` / `<NotPlaintext>` | Show content only in the plaintext output (or hide it from plaintext). |
| `<QrCode value="...">` | Inline table-based QR code. Props: `value`, `ecc` (`L`/`M`/`Q`/`H`), `border`, `alt`. Sized via `size-*`/`w-*`/`h-*` Tailwind classes. |
| `<Raw>` | Pass content through verbatim — `{{ }}` and other Vue/ESP syntax is not parsed. |
| `<Preheader spaces="150">` | Hidden preview text + filler. Auto-teleports to `body:start`. |
| `<Img dark-src motion-src>` | `<picture>` with dark-mode and reduced-motion variants. |
| Responsive variants | `sm:` (≤600px), `xs:` (≤430px). |
| Dark mode | `dark:` via `prefers-color-scheme`. |
| Client variants | `gmail:`, `outlook-mac:`, `apple-mail:`, `yahoo:`, etc. |
| `defineConfig()` | Per-template config overrides in `<script setup>`. |
| `useEvent()` | Template-level lifecycle hooks (afterRender, afterTransform, etc.). |

## Conversion Steps

### 1. File format

`.tsx` default-export function → `.vue` SFC with `<script setup>` and `<template>`.

### 2. Remove React Email boilerplate

- Drop all imports — Maizzle's components and composables auto-import.
- Drop `<Tailwind>` and `pixelBasedPreset` — not needed.
- Drop the `export default function` wrapper.
- `Welcome.PreviewProps = {...}` → `defineProps({...})` with defaults.

### 3. Document structure

Recommended — let `<Layout>` set everything up:

```vue
<template>
  <Layout lang="en" body-class="bg-gray-100">
    <!-- content -->
  </Layout>
</template>
```

React Email-like with `<Tailwind>`:

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

Manual control with `<Html>`/`<Head>`/`<Body>`:

```vue
<template>
  <Html lang="en">
    <Head>
      <style>@import "@maizzle/tailwindcss";</style>
    </Head>
    <Body class="bg-gray-100">
      <!-- content -->
    </Body>
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

<Section v-for="(item, i) in items" :key="i">
  <Text>{{ item.name }}</Text>
</Section>
```

### 6. Styling

`className` → `class`. Tailwind utilities are mostly identical (Maizzle uses Tailwind v4).

Drop email-workaround classes Maizzle handles internally:
- `box-border`, `block text-center no-underline` on `<Button>`
- `border-solid border-*` on `<Hr>`

Customize Tailwind theme inline:

```vue
<Head>
  <style>
    @import "@maizzle/tailwindcss";
    @theme {
      --color-brand: #007bff;
    }
  </style>
</Head>
```

### 7. Images

Drop manual `baseURL` concatenation. Use `url.base` in `maizzle.config.ts` or `<WithUrl>`. Place files in `public/`.

```vue
<Img src="/logo.png" alt="Logo" width="150" />
```

```ts
// maizzle.config.ts
export default defineConfig({
  url: { base: 'https://cdn.example.com/emails/' }
})
```

### 8. Dividers

```vue
<Hr class="bg-gray-200 my-5" />
<!-- or with props -->
<Hr space-y="20px" />
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
            <Text className="text-base leading-7 text-gray-800 my-4">
              A reset was requested for <strong>{email}</strong>.
            </Text>
            <Text className="text-base leading-7 text-gray-800 my-4">
              This link expires in {expiryHours} hour{expiryHours > 1 ? 's' : ''}.
            </Text>
            <Button
              href={resetUrl}
              className="bg-red-600 text-white px-7 py-3.5 rounded block text-center font-bold my-6 no-underline box-border"
            >
              Reset Password
            </Button>
            <Hr className="border-solid border-gray-200 my-6" />
            <Text className="text-sm text-gray-500 leading-5 my-2">
              If you didn't request this, ignore this email.
            </Text>
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
        <Text class="leading-7 text-gray-800">
          A reset was requested for <strong>{{ email }}</strong>.
        </Text>
        <Text class="leading-7 text-gray-800">
          This link expires in {{ expiryHours }} hour{{ expiryHours > 1 ? 's' : '' }}.
        </Text>
        <Button :href="resetUrl" class="bg-red-600 text-white font-bold rounded my-6">
          Reset Password
        </Button>
        <Hr class="bg-gray-200 my-6" />
        <Text class="text-sm text-gray-500">
          If you didn't request this, ignore this email.
        </Text>
      </Section>
    </Container>
  </Layout>
</template>
```

## Common Pitfalls

1. Using `as="h2"` on `<Heading>` — it's `level="2"`.
2. Keeping `box-border` / `block text-center no-underline` on `<Button>` — internal.
3. Forgetting `xs:w-full` on Columns when you want mobile stacking with explicit widths.
4. Manual `baseURL` concatenation for images — use `url.base` or `<WithUrl>`.
5. Forgetting `:` for dynamic props (`:href="resetUrl"`, not `href={resetUrl}` or `href="resetUrl"`).
6. `{variable}` instead of `{{ variable }}`.
7. Not converting `PreviewProps` to `defineProps`.
8. Setting Button color via a non-existent `bg-color` prop — use Tailwind classes (`class="bg-red-600 text-white"`) or override via inline `style`.
