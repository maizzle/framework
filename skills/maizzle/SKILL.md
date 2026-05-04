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

## Installation

Scaffold a new project:

```sh
npx maizzle new [user/repo] [directory]
```

Example:

```sh
npx maizzle new maizzle/maizzle my-project
```

### Existing projects

```sh
npm i @maizzle/framework @maizzle/tailwindcss
```

Add the script to your `package.json`:

```json
{
  "scripts": {
    "dev:emails": "maizzle serve",
    "build:emails": "maizzle build"
  }
}
```

A `.maizzle` folder containing `.d.ts` type definitions for auto-imported composables and components is generated in the project root when you run the development server, make sure to include it in `tsconfig.json`.

## Usage

Run the development server:

```sh
cd my-project
npm install
npm run dev
```

Works with all package managers (npm, yarn, pnpm, bun), adapt the commands as needed.

Vite dev server runs at `http://localhost:3000` and will automatically reload when a template is updated.

## Basic email template

Structure for a simple email template with Maizzle components:

```vue
<script setup>
  defineConfig({
    name: {
      type: String,
      default: "friend"
    }
  })
</script>
<template>
  <Layout>
    <Container width="600px">
      <Section>
        <Heading level="1" class="text-2xl font-semibold mb-4">
          Welcome, {{ name }}!
        </Heading>
        <Text class="text-gray-700 mb-6">
          Build HTML emails with Vue components and Tailwind CSS.
        </Text>
        <Button
          class="bg-blue-600 text-white px-4 py-2 rounded"
          href="https://maizzle.com"
        >
          Learn more
        </Button>
      </Section>
    </Container>
  </Layout>
</template>
```

## Components

All built-in components are auto-imported, no import statements needed. See `references/COMPONENTS.md` for full props and usage examples.

### Layout & structure

| Component | Description |
|-----------|-------------|
| `<Layout>` | Opinionated wrapper, renders full HTML document structure |
| `<Html>` | The `<html>` element with lang and dir attributes |
| `<Head>` | The `<head>` element, includes default meta tags for email |
| `<Body>` | The `<body>` element with email-safe defaults |
| `<Container>` | Centered wrapper — use `width` prop for fixed width or Tailwind classes like `max-w-xl mx-auto` |
| `<Section>` | Full-width content block with padding |
| `<Row>` | Table row for multi-column layouts |
| `<Column>` | Table cell inside a `<Row>` — auto `min-width` with Container `width` prop, or use Tailwind classes like `w-1/2 xs:w-full` |
| `<Overlap>` | Stacked/overlapping content sections (faux absolute) |

### Content

| Component | Description |
|-----------|-------------|
| `<Heading>` | Heading element (h1-h6) via `level` prop |
| `<Text>` | Paragraph or span text |
| `<Link>` | Anchor element with email-safe defaults |
| `<Button>` | Call-to-action button with bulletproof rendering |
| `<Img>` | Image with dark mode and reduced motion variants |
| `<Hr>` | Horizontal rule / visual separator |
| `<Spacer>` | Vertical or horizontal spacing |
| `<Preheader>` | Hidden preview text shown in inbox list view |

### Code

| Component | Description |
|-----------|-------------|
| `<CodeBlock>` | Syntax-highlighted code block |
| `<CodeInline>` | Inline code snippet |
| `<Markdown>` | Renders Markdown content |

### Utilities

| Component | Description |
|-----------|-------------|
| `<Font>` | Adds a Google Font (or custom font) via `<link>` + `@font-face`, with email-safe fallbacks |
| `<Tailwind>` | Scopes a Tailwind/CSS block to its slot — per-template styles or scoped overrides |
| `<WithUrl>` | Rewrites URLs in children — prepend base URL or append query params (UTM tracking) |
| `<NoWidows>` | Replaces last space with `&nbsp;` to prevent orphaned words |
| `<Outlook>` | Wraps content in Outlook conditional comments (shows only in Outlook) |
| `<NotOutlook>` | Hides content from Outlook |
| `<Vml>` | VML markup for Outlook-specific rendering (background images) |
| `<Raw>` | Emits slot content verbatim — bypasses Vue compilation so `{{ }}` and ESP syntax pass through |

## Behavioral guidelines

### Before writing code

If the user hasn't specified, ask about:

1. **Brand colors** — primary color hex code, dark mode variants if needed
2. **Logo** — file format (PNG/JPG only, SVG and WEBP have poor email client support) and hosted URL
3. **Target width** — default is 600px, but some designs need 700px or narrower for mobile-first

### When editing templates

- Only change what the user asked for. Keep existing structure, components, and styling intact.
- Use Maizzle components (`<Layout>`, `<Container>`, `<Section>`, `<Button>`, etc.) instead of raw HTML tables, unless the user explicitly says so. The components handle email client quirks internally.
- Use Tailwind CSS utility classes for styling, including for responsive or dark mode. Do not write inline styles manually, use arbitrary utilities if needed — the build pipeline inlines CSS from utilities automatically.
- Prefer Tailwind's `text-*`, `bg-*`, `p-*`, `m-*` utilities over custom CSS. Maizzle's Tailwind CSS plugin (`@maizzle/tailwindcss`) includes email-safe defaults.

### Email client constraints

- Outlook 2007-2024 (old) on Windows uses Word as its rendering engine. It does not support `margin`, `padding` on some elements, `border-radius`, `background-image`, or modern CSS. Maizzle components abstract over these limitations.
- Gmail clips emails larger than ~102KB. Keep templates lean — avoid unnecessary nesting and unused components.
- Images must use absolute URLs in production. Use the `url.base` config option or the `<WithUrl>` component to automatically prepend a base URL to relative paths during build.
- Always include `alt` text on images for accessibility and for clients that block images by default.
- Embedded SVGs are not supported in most email clients. Use PNG, JPG or GIF for animated images in this case. SVG as a `<img>` source is supported by most clients (except Gmail).

### Common mistakes to avoid

- Do not use `<div>` directly for layout structure. Use the `<Container>`, `<Section>`, `<Row>` and `<Column>` components, which render email-safe markup.
- Prefer `<Spacer>` over vertical margins for spacing between block elements — Outlook ignores margins on many elements. Margins are fine on text elements (`<p>`, `<Text>`, headings).
- Do not use CSS `flexbox` or `grid` for layouts — poor email client support. `display:flex` can be used for simple horizontal alignment in some cases, but tables are always more reliable.
- Do not use `position: absolute/relative` — not supported in most email clients.
- Do not use custom fonts without a web-safe fallback. Most email clients ignore `@font-face`.
- Do not assume dark mode support. If implementing dark mode, test with `prefers-color-scheme` and provide explicit dark variants via Tailwind's `dark:` modifier.
- `prefers-color-scheme:dark` has limited support, so treat it as progressive enhancement. Gmail/Outlook/Thunderbird and a few others invert colors automatically, with little to no control over the result.

## Static assets and images

### Public folder

Place static files (images, fonts, etc.) in the `public/` directory. During build, they are copied to the output folder:

```
my-project/
├── emails/
├── public/
│   ├── logo.png
│   └── banner.jpg
└── maizzle.config.ts
```

Reference them with absolute paths from root:

```vue
<template>
  <Img src="/logo.png" alt="Logo" width="70" />
</template>
```

### URL rewriting

In production, image paths need to be absolute URLs. Two approaches:

**1. Config-level (global)** — rewrites all relative URLs in the rendered HTML:

```ts
// maizzle.config.ts
export default defineConfig({
  url: {
    base: 'https://cdn.example.com/emails/',
  }
})
```

Result: `/logo.png` becomes `https://cdn.example.com/emails/logo.png`

**2. Component-level (scoped)** — rewrites URLs only in children:

```vue
<template>
  <WithUrl base="https://cdn.example.com/emails/">
    <Img src="/logo.png" alt="Logo" />
  </WithUrl>
</template>
```

Both approaches skip absolute URLs, data URIs, and fragment links.

### UTM tracking and query parameters

Append query parameters to URLs globally via config:

```ts
export default defineConfig({
  url: {
    query: {
      utm_source: 'maizzle',
      utm_medium: 'email',
      utm_campaign: 'welcome',
    }
  }
})
```

Or scoped to specific elements with the `<WithUrl>` component:

```vue
<template>
  <WithUrl parameters="utm_source=email&utm_campaign=welcome">
    <a href="https://example.com">Visit</a>
  </WithUrl>
</template>
```

### Dev vs production

- **Dev server**: paths like `/logo.png` are served as-is from the project root
- **Production build**: URL transformers rewrite paths based on config, and static files are copied to the output directory

## Styling

Maizzle uses Tailwind CSS 4 with full support for its features including media queries, custom properties, and `@variant`. See `references/STYLING.md` for advanced configuration.

### Setup

Import `@maizzle/tailwindcss` inside a `<style>` tag in the template's `<Head>` component:

```vue
<template>
  <Head>
    <style>
      @import "@maizzle/tailwindcss";
    </style>
  </Head>
</template>
```

This is where Tailwind CSS is compiled from — it includes email-safe resets, optimized theme defaults, Outlook (`mso-*`) utilities, and email client-specific variants. Note: the `<Layout>` component has all of this set up by default.

The `tailwind.css` file in the project root exists only for Tailwind CSS IntelliSense in your editor. It is not used by the build pipeline.

### Utility classes

Style templates with Tailwind utility classes — they are compiled, then inlined into `style` attributes during build:

```vue
<template>
  <Heading level="1" class="text-2xl font-semibold text-slate-900 mb-4">
    Hello!
  </Heading>
</template>
```

Use arbitrary values when needed, but stick to Tailwind CSS v4 if possible:

```diff
- w-[600px] text-[#facade]
+ w-150 text-[#facade]
```

### Responsive emails

Maizzle supports `@media` queries for responsive layouts. The `@maizzle/tailwindcss` plugin provides email-specific breakpoints:

- `sm:` — `@media (max-width: 600px)`
- `xs:` — `@media (max-width: 430px)`

```vue
<template>
  <Container class="max-w-xl mx-auto">
    <Row>
      <Column class="w-1/2 xs:w-full">
        <!-- stacks full width on mobile -->
      </Column>
      <Column class="w-1/2 xs:w-full">
        <!-- stacks full width on mobile -->
      </Column>
    </Row>
  </Container>
</template>
```

Media queries are preserved in a `<style>` tag in the `<head>` (they can't be inlined). The build pipeline automatically merges and sorts duplicate media queries.

For more responsive email design patterns, see [PATTERNS.md](references/PATTERNS.md).

### Dark mode

Use Tailwind's `dark:` variant:

```vue
<template>
  <Section class="bg-white dark:bg-gray-800">
    <Heading level="1" class="text-slate-900 dark:text-gray-100">
      Hello!
    </Heading>
  </Section>
</template>
```

Dark mode is progressive enhancement — support varies by email client.

### Email client targeting

Target specific email clients with built-in variants:

```vue
<template>
  <Text class="gmail:text-blue-600 outlook-mac:text-sm apple-mail:leading-6">
    Client-specific styling
  </Text>
</template>
```

Available client variants: `gmail`, `gmail-android`, `gmail-ipad`, `apple-mail`, `ios`, `outlook-mac`, `outlook-android`, `yahoo`, `thunderbird`, `superhuman`, `notion`, `spark`, and others.

### CSS pipeline

The build pipeline processes CSS in this order (see [references/TRANSFORMERS.md](references/TRANSFORMERS.md) for all 17 transformers):

1. **Tailwind compilation** — utilities and variants compiled to CSS
2. **Syntax lowering** — modern CSS (nesting, `oklch()`, logical properties) converted to email-safe equivalents
3. **CSS inlining** — styles moved to inline `style` attributes
4. **Purging** — unused CSS removed
5. **Shorthand** — longhand properties condensed (e.g., `margin-top/right/bottom/left` → `margin`)
6. **Six-hex** — 3-digit hex colors expanded to 6-digit for email clients

### Build configuration

Configure CSS processing in `maizzle.config.ts` (see [references/CONFIGURATION.md](references/CONFIGURATION.md) for all options):

```ts
export default defineConfig({
  css: {
    inline: true,        // inline styles to elements (default: false)
    purge: true,         // remove unused CSS (default: false)
    shorthand: true,     // use shorthand CSS notation (default: false)
    safe: true,          // replace unsafe class names like `:` and `/` (default: true)
    sixHex: true,        // convert 3-digit to 6-digit hex (default: true)
  }
})
```

## Rendering

### Programmatic rendering

Use `render()` to compile a template to HTML outside of the build/dev pipeline:

```ts
import { render } from '@maizzle/framework'

const { html, plaintext } = await render('emails/welcome.vue', {
  config: {
    css: {
      inline: true,
      purge: true,
    },
    plaintext: true,
  }
})
```

`render()` accepts a SFC file path, a raw SFC string, or an imported Vue component. It runs the full pipeline: SSR render and transformers.

### Plaintext generation

To generate a plaintext version of the email, enable it in config:

```ts
export default defineConfig({
  plaintext: true
})
```

Pass an object to customize destination, extension, or `string-strip-html` options:

```ts
export default defineConfig({
  plaintext: {
    destination: 'build_production/plaintext',
    extension: 'txt',
    options: { ignoreTags: ['br'] },
  }
})
```

Or per-template using the `usePlaintext()` composable in `<script setup>` (see [references/COMPOSABLES.md](references/COMPOSABLES.md) for all composables):

```vue
<script setup>
usePlaintext()
</script>
```

The plaintext version strips all HTML and places link URLs on new lines next to their anchor text. It's returned as `plaintext` in the render result and saved as a separate file during build.

## CLI

Run via npx or install globally with `npm i -g maizzle`.

| Command | Description |
|---------|-------------|
| `maizzle new` | Interactive project scaffolding |
| `maizzle new [user/repo] [dir]` | Scaffold from a GitHub starter |
| `maizzle serve` | Start the Vite dev server with HMR |
| `maizzle build` | Production build with all transformers |
| `maizzle make:template [path]` | Scaffold a new email template |
| `maizzle make:layout [path]` | Scaffold a new layout |
| `maizzle make:component [path]` | Scaffold a new component |
| `maizzle make:config [name]` | Scaffold a config file |

Options for `maizzle new`:

- `--install` — auto-install dependencies after scaffolding
- `--pm <manager>` — choose package manager (`npm`, `yarn`, `pnpm`, `bun`)
