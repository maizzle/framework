# Converting React Email to Maizzle

Guide for converting React Email (JSX/TSX) templates and components to Maizzle 6 (Vue SFC) templates.

## Quick Reference

### Syntax Changes

| React Email | Maizzle |
|---|---|
| `className="..."` | `class="..."` |
| `{variable}` | `{{ variable }}` |
| `{condition && <X />}` | `<X v-if="condition" />` |
| `{cond ? <A /> : <B />}` | `<A v-if="cond" />` `<B v-else />` |
| `{items.map(i => <X />)}` | `<X v-for="i in items" />` |
| `<Component prop={value}>` | `<Component :prop="value">` |
| `style={{ color: 'red' }}` | `class="text-red-500"` or `style="color: red"` |
| Self-closing `<Component />` | `<Component />` (same in Vue 3) |
| `<>...</>` (Fragment) | `<template>...</template>` (or just remove) |

### Component Mapping

| React Email | Maizzle | Notes |
|---|---|---|
| `<Html lang="en">` | `<Html lang="en">` | Same API. Or use `<Layout lang="en">` for full document setup. |
| `<Tailwind config={...}>` | _(not needed)_ | Maizzle compiles Tailwind automatically via `@import "@maizzle/tailwindcss"` in `<style>`. Remove entirely. |
| `<Head />` | `<Head>` | Must contain `<style>@import "@maizzle/tailwindcss";</style>` when not using `<Layout>`. |
| `<Body className="...">` | `<Body class="...">` | Same. Or use `<Layout body-class="...">`. |
| `<Preview>text</Preview>` | `<Preheader>text</Preheader>` | Different name. Can be placed anywhere, even outside `<Layout>` or `<Html>`, or as a direct child of `<template>` in SFC (teleported to body start automatically). |
| `<Container className="max-w-xl mx-auto p-5">` | `<Container class="max-w-xl mx-auto p-5">` | Two modes: use `width` prop for fixed width with auto column min-widths (stacks without media queries), or use Tailwind classes for class-based control. MSO table defaults to 600px when no `width` prop. |
| `<Section>` | `<Section>` | Same concept. Maizzle wraps in MSO table automatically. |
| `<Row>` | `<Row>` | Same concept. |
| `<Column className="w-1/2">` | `<Column class="w-1/2 xs:w-full">` | Two modes: with Container `width` prop, columns auto-calculate `min-width` and stack naturally. Without it, use Tailwind classes like `w-1/2 xs:w-full` to control width and stacking via media query. |
| `<Heading as="h1" className="...">` | `<Heading level="1" class="...">` | Prop is `level` (number) not `as` (string). |
| `<Heading as="h2">` | `<Heading level="2">` | Same pattern for all levels. |
| `<Text className="...">` | `<Text class="...">` | Same. Supports `as="span"` prop too. |
| `<Button href="..." className="... box-border">` | `<Button href="..." class="...">` | Remove `box-border`. Remove `block text-center no-underline` too, handled internally. |
| `<Link href="...">` | `<Link href="...">` | Same. Maizzle defaults to `no-underline`. |
| `<Img src="..." alt="..." width="150">` | `<Img src="..." alt="..." width="150">` | Same name. Maizzle also supports `dark-src` and `motion-src` props. |
| `<Hr className="border-solid border-gray-200 my-5">` | `<Divider />` | Use Maizzle's `<Divider>` with props: `color`, `height`, `space-y`. Prefer Tailwind classes i.e. `my-5` over `space-y` when possible. No need for `border-solid` classes. |
| `<CodeBlock code={code} language="js" theme={dracula}>` | `<CodeBlock code="..." language="js" theme="github-light">` | Theme is a string name (Shiki theme), not an imported object. |
| `<CodeInline>code</CodeInline>` | `<CodeInline>code</CodeInline>` | Same. |
| `<Markdown>{content}</Markdown>` | `<Markdown>content</Markdown>` | Same concept. Maizzle also supports `src` prop for loading .md files. |
| `<Font fontFamily="..." webFont={...}>` | _(use `<link>` in Head)_ | No Font component. Add `<link>` tags directly in `<Head>` or use `<Layout>` which includes Inter by default. |

### What Maizzle Has That React Email Doesn't

| Component/Feature | Purpose |
|---|---|
| `<Layout>` | Full document wrapper with all email-safe defaults, meta tags, Outlook namespaces, font loading, and Tailwind setup. Replaces the `Html > Tailwind > Head + Body` boilerplate. |
| `<Spacer>` | Vertical/horizontal spacing with Outlook `mso-line-height-alt` support. |
| `<WithUrl>` | Scoped URL rewriting (base URL, UTM params) on all children. |
| `<NoWidows>` | Prevents orphaned last words in text. |
| `<Outlook>` / `<NotOutlook>` | Conditional content for Outlook versions. |
| `<OutlookBg>` | VML background images for Outlook. |
| `<Overlap>` | Faux absolute positioning with VML fallback. |
| `<Img dark-src="...">` | Dark mode image variant via `<picture>`. |
| `<Img motion-src="...">` | Reduced motion image variant. |
| Responsive: `sm:`, `xs:` | Email-specific breakpoints that work. React Email warns against using responsive utilities. |
| Dark mode: `dark:` | Progressive enhancement via `prefers-color-scheme`. React Email doesn't support this. |
| Client variants | `gmail:`, `outlook-mac:`, `apple-mail:`, `yahoo:`, etc. for client-specific styling. |
| `defineConfig()` | Per-template config overrides in `<script setup>`. |
| `useEvent()` | Template-level lifecycle hooks (afterRender, afterTransform, etc.). |

## Conversion Steps

### Step 1: Convert File Format

React Email uses `.tsx` files with a default export function. Maizzle uses `.vue` SFCs.

**React Email:**
```tsx
import { Html, Head, Body, Container, Heading, Text, Button, Tailwind, pixelBasedPreset } from 'react-email';

interface WelcomeProps {
  name: string;
  url: string;
}

export default function Welcome({ name, url }: WelcomeProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl p-5 bg-white">
            <Heading as="h1" className="text-2xl font-bold text-gray-800">
              Welcome, {name}!
            </Heading>
            <Text className="text-base text-gray-700">
              Click below to get started.
            </Text>
            <Button
              href={url}
              className="bg-blue-600 text-white px-5 py-3 rounded block text-center no-underline box-border"
            >
              Get Started
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

Welcome.PreviewProps = {
  name: 'John',
  url: 'https://example.com'
} satisfies WelcomeProps;
```

**Maizzle:**
```vue
<script setup>
const props = defineProps({
  name: {
    type: String,
    default: 'John',
  },
  url: {
    type: String,
    default: 'https://example.com',
  },
})
</script>

<template>
  <Layout>
    <Container>
      <Section class="p-5 bg-white">
        <Heading class="text-2xl font-bold text-gray-800">
          Welcome, {{ name }}!
        </Heading>
        <Text class="text-gray-700">
          Click below to get started.
        </Text>
        <Button href="url" class="bg-blue-600 text-white px-5 py-3 rounded">
          Get Started
        </Button>
      </Section>
    </Container>
  </Layout>
</template>
```

### Step 2: Remove React Email Boilerplate

1. **Remove all imports** — Maizzle components and composables are auto-imported.
2. **Remove the `<Tailwind>` wrapper** — Maizzle compiles Tailwind automatically. The `<Layout>` component includes `@import "@maizzle/tailwindcss"` by default.
3. **Remove `pixelBasedPreset`** — Maizzle's Tailwind plugin (`@maizzle/tailwindcss`) handles email-safe defaults natively.
4. **Remove the function wrapper** — Vue SFCs don't need `export default function`.
5. **Remove `PreviewProps`** — Use `defineProps()` with defaults in `<script setup>` instead.

### Step 3: Convert Document Structure

**Use `<Layout>` for simplicity** (recommended):

Replace the entire `Html > Tailwind > Head + Body` chain with `<Layout>`:

```vue
<template>
  <Layout lang="en" body-class="bg-gray-100">
    <!-- email content goes here -->
  </Layout>
</template>
```

`<Layout>` includes:
- `<html>` with lang, dir, Outlook namespaces
- `<head>` with charset, viewport, format-detection meta tags
- Tailwind CSS via `@import "@maizzle/tailwindcss"`
- Outlook MSO font reset
- Inter font from Google Fonts
- Accessible `<div role="article">` wrapper inside `<body>`

**Use `Html > Head > Body` for manual control**:

```vue
<template>
  <Html lang="en">
    <Head>
      <style>
        @import "@maizzle/tailwindcss";
      </style>
    </Head>
    <Body class="bg-gray-100">
      <!-- content -->
    </Body>
  </Html>
</template>
```

**Note:** When using `<Html>`, you must include the Tailwind import in `<Head>` manually. With `<Layout>`, it's included by default.

### Step 4: Convert Props and Dynamic Content

**React Email props → Vue `defineProps`:**

```tsx
// React Email
interface Props {
  name: string;
  items: Product[];
  showFooter?: boolean;
}

export default function Email({ name, items, showFooter = true }: Props) {
  return <Text>Hello {name}</Text>;
}
```

```vue
<!-- Maizzle -->
<script setup>
const props = defineProps({
  name: String,
  items: Array,
  showFooter: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <Text>Hello {{ name }}</Text>
</template>
```

### Step 5: Convert JSX Control Flow

**Conditionals:**

```tsx
// React Email
{isVip && <Text>VIP member</Text>}
{status === 'active' ? <Text>Active</Text> : <Text>Inactive</Text>}
```

```vue
<!-- Maizzle -->
<Text v-if="isVip">VIP member</Text>
<Text v-if="status === 'active'">Active</Text>
<Text v-else>Inactive</Text>
```

**Loops:**

```tsx
// React Email
{items.map((item, index) => (
  <Section key={index}>
    <Row>
      <Column><Text>{item.name}</Text></Column>
      <Column><Text>${item.price}</Text></Column>
    </Row>
  </Section>
))}
```

```vue
<!-- Maizzle -->
<Section v-for="(item, index) in items" :key="index">
  <Row>
    <Column><Text>{{ item.name }}</Text></Column>
    <Column><Text>${{ item.price }}</Text></Column>
  </Row>
</Section>
```

### Step 6: Convert Styling

**`className` → `class`:**

All `className` attributes become `class`. The Tailwind utility classes themselves are mostly the same — Maizzle uses Tailwind CSS 4.

**Remove email workaround classes:**

Maizzle components handle email client quirks internally. Remove:
- `box-border` on `<Button>`
- `block text-center no-underline` on `<Button>`
- `border-solid` on `<Divider>` (use the `<Divider>` component instead)

**Tailwind config customization:**

React Email passes config via `<Tailwind config={...}>`. In Maizzle, customize Tailwind in the project's CSS:

```vue
<Head>
  <style>
    @import "@maizzle/tailwindcss";

    @theme {
      --color-brand: #007bff;
      --color-accent: #28a745;
    }
  </style>
</Head>
```

Or in a separate `tailwind.css` file and import it.

**Responsive design:**

React Email warns against responsive utilities. Maizzle supports them:
- `sm:` — `@media (max-width: 600px)`
- `xs:` — `@media (max-width: 430px)`

```vue
<Column class="w-1/2 xs:w-full">
  <!-- 50% on desktop, full width on mobile -->
</Column>
```

**Dark mode:**

React Email doesn't support `dark:` variants. Maizzle does:

```vue
<Section class="bg-white dark:bg-gray-900">
  <Text class="text-gray-800 dark:text-gray-100">
    Works in supporting clients
  </Text>
</Section>
```

### Step 7: Convert Images

```tsx
// React Email
const baseURL = process.env.NODE_ENV === "production"
  ? "https://cdn.example.com" : "";

<Img src={`${baseURL}/static/logo.png`} alt="Logo" width="150" height="50" />
```

```vue
<!-- Maizzle -->
<Img src="/logo.png" alt="Logo" width="150" />
```

In Maizzle, use the `url.base` config option or `<WithUrl>` for production URL rewriting — no need for manual `baseURL` concatenation:

```ts
// maizzle.config.ts
export default defineConfig({
  url: {
    base: 'https://cdn.example.com/emails/',
  }
})
```

Place images in the `public/` folder (not `static/`).

### Step 8: Convert Dividers

```tsx
// React Email
<Hr className="border-solid border-gray-200 my-5" />
```

```vue
<!-- Maizzle -->
<Divider color="#e5e7eb" space-y="20px" />
<!-- or with Tailwind classes -->
<Divider class="bg-gray-200 my-5" />
```

### Step 9: Handle Preview/Preheader

```tsx
// React Email — must be first element inside <Body>
<Body>
  <Preview>Preview text here</Preview>
  <Container>...</Container>
</Body>
```

```vue
<!-- Maizzle — can be placed anywhere, auto-teleported to body start -->
<template>
  <Preheader>Preview text here</Preheader>
  <Layout>
    <Container>...</Container>
  </Layout>
</template>

<!-- Or programmatically in script setup -->
<script setup>
usePreheader('Preview text here')
</script>
```

## Full Conversion Examples

### Password Reset

**React Email:**
```tsx
import {
  Html, Head, Preview, Body, Container, Heading, Text, Button, Hr, Tailwind, pixelBasedPreset
} from 'react-email';

interface PasswordResetProps {
  resetUrl: string;
  email: string;
  expiryHours?: number;
}

export default function PasswordReset({ resetUrl, email, expiryHours = 1 }: PasswordResetProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="bg-gray-100 font-sans">
          <Preview>Reset your password - Action required</Preview>
          <Container className="mx-auto py-10 px-5 max-w-xl bg-white">
            <Heading className="text-2xl font-bold text-gray-800 mb-5">
              Reset Your Password
            </Heading>
            <Text className="text-base leading-7 text-gray-800 my-4">
              A password reset was requested for: <strong>{email}</strong>
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

PasswordReset.PreviewProps = {
  resetUrl: 'https://example.com/reset/abc123',
  email: 'user@example.com',
  expiryHours: 1
} as PasswordResetProps;
```

**Maizzle:**
```vue
<script setup>
const props = defineProps({
  resetUrl: {
    type: String,
    default: 'https://example.com/reset/abc123',
  },
  email: {
    type: String,
    default: 'user@example.com',
  },
  expiryHours: {
    type: Number,
    default: 1,
  },
})
</script>

<template>
  <Layout>
    <Preheader>Reset your password - Action required</Preheader>
    <Container class="max-w-xl mx-auto">
      <Section class="py-10 px-5 bg-white">
        <Heading class="text-2xl font-bold text-gray-800 mb-5">
          Reset Your Password
        </Heading>
        <Text class="leading-7 text-gray-800">
          A password reset was requested for: <strong>{{ email }}</strong>
        </Text>
        <Text class="leading-7 text-gray-800">
          This link expires in {{ expiryHours }} hour{{ expiryHours > 1 ? 's' : '' }}.
        </Text>
        <Button
          :href="resetUrl"
          bg-color="#dc2626"
          class="font-bold my-6 rounded"
        >
          Reset Password
        </Button>
        <Divider class="bg-gray-200" />
        <Text class="text-sm text-gray-500 leading-5">
          If you didn't request this, ignore this email.
        </Text>
      </Section>
    </Container>
  </Layout>
</template>
```

### Order Confirmation

**React Email:**
```tsx
import {
  Html, Head, Preview, Body, Container, Section, Row, Column,
  Heading, Text, Img, Hr, Tailwind, pixelBasedPreset
} from 'react-email';

interface Product {
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface OrderProps {
  orderNumber: string;
  items: Product[];
  total: number;
}

export default function Order({ orderNumber, items, total }: OrderProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="bg-gray-100 font-sans">
          <Preview>Order #{orderNumber} confirmed</Preview>
          <Container className="mx-auto py-10 px-5 max-w-xl">
            <Heading className="text-3xl font-bold text-gray-800 mb-2">
              Order Confirmed
            </Heading>
            <Section className="bg-gray-50 p-4 rounded mb-6">
              <Text className="text-xs text-gray-500 uppercase mb-1">Order Number</Text>
              <Text className="text-base font-bold text-gray-800 m-0">#{orderNumber}</Text>
            </Section>
            {items.map((item, i) => (
              <Section key={i} className="mb-4">
                <Row>
                  <Column className="w-20 align-top">
                    <Img src={item.image} alt={item.name} width="80" height="80" className="rounded" />
                  </Column>
                  <Column className="align-top pl-4">
                    <Text className="text-base font-bold text-gray-800 m-0">{item.name}</Text>
                    <Text className="text-sm text-gray-500 m-0">
                      Qty: {item.quantity} x ${item.price.toFixed(2)}
                    </Text>
                  </Column>
                  <Column className="w-24 text-right align-top">
                    <Text className="text-base font-bold text-gray-800 m-0">
                      ${(item.quantity * item.price).toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              </Section>
            ))}
            <Hr className="border-solid border-gray-200 my-6" />
            <Row>
              <Column><Text className="text-lg font-bold text-gray-800">Total</Text></Column>
              <Column className="text-right">
                <Text className="text-lg font-bold text-gray-800">${total.toFixed(2)}</Text>
              </Column>
            </Row>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

**Maizzle:**
```vue
<script setup>
const props = defineProps({
  orderNumber: {
    type: String,
    default: '10234',
  },
  items: {
    type: Array,
    default: () => [
      { name: 'Vintage Macintosh', price: 499, quantity: 1, image: 'https://placehold.co/80x80' },
      { name: 'Mechanical Keyboard', price: 149.99, quantity: 2, image: 'https://placehold.co/80x80' },
    ],
  },
  total: {
    type: Number,
    default: 798.98,
  },
})
</script>

<template>
  <Layout>
    <Preheader>Order #{{ orderNumber }} confirmed</Preheader>
    <Container width="576px">
      <Heading class="text-3xl font-bold text-gray-800 mb-2">
        Order Confirmed
      </Heading>
      <Section class="bg-gray-50 p-4 rounded mb-6">
        <Text class="text-xs text-gray-500 uppercase mb-1">Order Number</Text>
        <Text class="font-bold text-gray-800 m-0">#{{ orderNumber }}</Text>
      </Section>
      <Section>
        <Row v-for="(item, i) in items" :key="i" class="mb-4">
          <Column width="80px">
            <Img :src="item.image" :alt="item.name" width="80" class="rounded" />
          </Column>
          <Column>
            <Section class="pl-4">
              <Text class="font-bold text-gray-800 m-0">{{ item.name }}</Text>
              <Text class="text-sm text-gray-500 m-0">
                Qty: {{ item.quantity }} x ${{ item.price.toFixed(2) }}
              </Text>
            </Section>
          </Column>
          <Column width="96px" class="text-right xs:block xs:text-left">
            <Text class="font-bold text-gray-800 m-0">
              ${{ (item.quantity * item.price).toFixed(2) }}
            </Text>
          </Column>
        </Row>
      </Section>
      <Divider class="bg-gray-200" />
      <Row>
        <Column>
          <Text class="text-lg font-bold text-gray-800">Total</Text>
        </Column>
        <Column class="text-right">
          <Text class="text-lg font-bold text-gray-800">${{ total.toFixed(2) }}</Text>
        </Column>
      </Row>
    </Container>
  </Layout>
</template>
```

### Newsletter with Multi-Column Layout

**React Email:**
```tsx
import {
  Html, Head, Preview, Body, Container, Section, Row, Column,
  Heading, Text, Img, Button, Hr, Link, Tailwind, pixelBasedPreset
} from 'react-email';

interface Article {
  title: string;
  excerpt: string;
  image: string;
  url: string;
}

interface NewsletterProps {
  articles: Article[];
  unsubscribeUrl: string;
}

export default function Newsletter({ articles, unsubscribeUrl }: NewsletterProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="bg-white font-sans">
          <Preview>Your weekly roundup</Preview>
          <Container className="mx-auto max-w-xl">
            <Section className="pt-10 px-5 pb-5 text-center">
              <Img src="https://via.placeholder.com/150x50" alt="Logo" width="150" height="50" />
            </Section>
            <Heading className="text-3xl font-bold text-gray-900 mx-5 text-center">
              This Week's Highlights
            </Heading>
            <Hr className="border-solid border-gray-200 mx-5 my-8" />
            {articles.slice(1, 3).length > 0 && (
              <Section className="px-5 mb-6">
                <Row>
                  {articles.slice(1, 3).map((article, i) => (
                    <Column key={i} className="w-1/2 align-top px-1">
                      <Img src={article.image} alt={article.title} width="280" className="w-full rounded mb-3" />
                      <Heading as="h3" className="text-lg font-bold text-gray-900 my-3">
                        {article.title}
                      </Heading>
                      <Text className="text-sm text-gray-500 my-2">{article.excerpt}</Text>
                      <Link href={article.url} className="text-sm text-blue-600 font-semibold">
                        Read article
                      </Link>
                    </Column>
                  ))}
                </Row>
              </Section>
            )}
            <Section className="bg-gray-50 p-8 text-center">
              <Text className="text-sm text-gray-500">You subscribed to our newsletter.</Text>
              <Link href={unsubscribeUrl} className="text-sm text-blue-600 underline">Unsubscribe</Link>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

**Maizzle:**
```vue
<script setup>
const props = defineProps({
  articles: {
    type: Array,
    default: () => [
      { title: 'React Server Components', excerpt: 'A deep dive into RSC.', image: 'https://via.placeholder.com/280x140', url: 'https://example.com/1' },
      { title: 'Accessible Web Apps', excerpt: 'Best practices for a11y.', image: 'https://via.placeholder.com/280x140', url: 'https://example.com/2' },
    ],
  },
  unsubscribeUrl: {
    type: String,
    default: 'https://example.com/unsubscribe',
  },
})
</script>

<template>
  <Layout>
    <Preheader>Your weekly roundup</Preheader>
    <Container class="max-w-xl mx-auto">
      <Section class="pt-10 px-5 pb-5 text-center">
        <Img src="/logo.png" alt="Logo" width="150" />
      </Section>

      <Heading class="text-3xl font-bold text-gray-900 mx-5 text-center">
        This Week's Highlights
      </Heading>

      <Divider class="bg-gray-200 mx-5" space-y="32px" />

      <Section v-if="articles.length > 0" class="px-5 mb-6">
        <Row>
          <Column v-for="(article, i) in articles.slice(0, 2)" :key="i" class="w-1/2 xs:w-full">
            <Img :src="article.image" :alt="article.title" width="280" class="w-full rounded mb-3" />
            <Heading level="3" class="text-lg font-bold text-gray-900 my-3">
              {{ article.title }}
            </Heading>
            <Text class="text-sm text-gray-500 my-2">{{ article.excerpt }}</Text>
            <Link :href="article.url" class="text-sm text-blue-600 underline font-semibold">
              Read article
            </Link>
          </Column>
        </Row>
      </Section>

      <Section class="bg-gray-50 p-8 text-center">
        <Text class="text-sm text-gray-500">You subscribed to our newsletter.</Text>
        <Link :href="unsubscribeUrl" class="text-sm text-blue-600 underline">Unsubscribe</Link>
      </Section>
    </Container>
  </Layout>
</template>
```

## Common Pitfalls

1. **Forgetting to remove `<Tailwind>`** — Maizzle handles CSS compilation automatically. The `<Tailwind>` wrapper doesn't exist.

2. **Using `as` instead of `level` on Heading** — React Email uses `as="h2"`, Maizzle uses `level="2"`.

3. **`<Img>` is the same** — Both React Email and Maizzle use `<Img>`. No rename needed.

4. **Using `Hr` instead of `Divider`** — React Email's `<Hr>` maps to Maizzle's `<Divider>`, which has a richer API.

5. **Keeping `box-border` on Button** — Maizzle's Button handles Outlook padding with MSO spacers internally. The class is unnecessary.

6. **Not adding `xs:w-full` on Columns in Tailwind mode** — When using Container without a `width` prop, columns don't auto-calculate `min-width`. Use `w-1/2 xs:w-full` to control width and ensure mobile stacking.

7. **Manual `baseURL` concatenation for images** — Use Maizzle's `url.base` config or `<WithUrl>` component instead.

8. **Not binding dynamic props** — In Vue, dynamic values need `:prop="value"` (with colon). Static strings use `prop="value"` (no colon). Forgetting the colon is a common mistake: `:href="resetUrl"` not `href={resetUrl}`.

9. **Using `{variable}` instead of `{{ variable }}`** — JSX uses single braces, Vue templates use double mustache braces.

10. **Not converting `PreviewProps` to `defineProps`** — React Email's preview data pattern needs to become Vue's `defineProps` with default values.
