# Styling Guide

How to style Maizzle email templates. Tailwind utilities first, inline `style="..."` as the escape hatch.

## Default Approach

Maizzle compiles Tailwind v4 from your component classes into a single `<style>` block and (by default) inlines those declarations onto each element via Juice. Write Tailwind utilities the same way you would for the web — Maizzle's own plugin (`@maizzle/tailwindcss`) handles the email-safe bits for you.
```vue
<template>
  <Layout>
    <Container class="max-w-xl">
      <Heading class="text-2xl font-bold text-gray-900 mb-4">Hello</Heading>
      <Text class="text-base text-gray-700">Welcome aboard.</Text>
    </Container>
  </Layout>
</template>
```

`<Layout>` already imports `@maizzle/tailwindcss` and ships email-safe meta tags, MSO font reset, and the Inter font. Reach for explicit `<Html> + <Head> + <Tailwind> + <Body>` only when you need manual control.

Use inline `style="..."` for one-offs the utility system can't express cleanly (specific MSO rules, computed values, third-party templating expressions).

## Email-Client Realities

- **No SVG / no WebP fallback in Outlook**. Use PNG/JPEG, or pair `<NotOutlook>` + `<Outlook>` with a fallback image.
- **No native flex/grid in older Outlook**. Use `<Row>` / `<Column>` (inline-block + MSO `<td>`) for multi-column layouts.
- **Responsive variants**: `sm:`, `xs:` work in many email clients. Use as progressive enhancement.
- **Dark mode**: `dark:` via `prefers-color-scheme`. Little support, progressive enhancement.
- **Client variants**: `gmail:`, `outlook-mac:`, `apple-mail:`, `yahoo:`, etc. for client-specific overrides.
- **`rem` units**: Maizzle converts them to pixels at compile time.

## Layout Defaults

Pin the page width to what you need (default is 600px) and let Maizzle handle the Outlook ghost table.
```vue
<Layout body-class="bg-gray-100">
  <Container class="max-w-xl">
    <!-- 576px max, centered, MSO table sized to match -->
  </Container>
</Layout>
```

## Typography

Use Maizzle's `<Heading>` and `<Text>` components — they reset margins (`m-0` on `<Heading>`, `m-0 my-4 text-base` on `<Text>`) so you can compose spacing from utilities.
```vue
<Heading level="1" class="text-2xl font-bold text-gray-900 mb-4">Order confirmed</Heading>
<Heading level="2" class="text-lg font-semibold text-gray-800 mb-2">Items</Heading>
<Text class="text-base text-gray-700">Thanks for your purchase.</Text>
<Text as="span" class="text-sm text-gray-500">Order #1234</Text>
```

Inter is loaded by `<Layout>`. Register additional families with `<Font>` (or `useFont()` in `<script setup>`):
```vue
<Font family="Roboto" :weights="[400, 600]" />
<Heading class="font-roboto">…</Heading>
```

## Colors & Brand

Define brand tokens once with `@theme` and reference them as semantic Tailwind utilities. Never hardcode hex values in templates.

Per-template `<Tailwind>` block:
```vue
<template>
  <Layout>
    <Tailwind>
      <template #config>
        @import "@maizzle/tailwindcss";

        @theme {
          --color-brand: #4338ca;
          --color-brand-foreground: #ffffff;
          --color-surface: #ffffff;
          --color-muted: #6b7280;
        }
      </template>

      <Container class="max-w-xl bg-surface">
        <Button href="https://example.com" class="bg-brand text-brand-foreground">Confirm</Button>
        <Text class="text-muted">Sent on {{ today }}</Text>
      </Container>
    </Tailwind>
  </Layout>
</template>
```

Project-wide CSS file:
```css
/* tailwind.css */
@import "@maizzle/tailwindcss";

@theme {
  --color-brand: #4338ca;
  --color-brand-foreground: #ffffff;
  --color-surface: #ffffff;
  --color-muted: #6b7280;
}
```

Then:
```vue
<template>
  <Html>
    <Head>
      <style>
        @import "./tailwind.css";
      </style>
    </Head>
    <Body>
      ...
    </Body>
  </Html>
</template>
```

Suggested palette to gather from a user before generating templates, based on Tailwind CSS 4 palette:
- **Primary** — buttons, links, key accents.
- **Secondary** — subheadings, less prominent accents.
- **Body background** — outer wrapper (e.g. `#f4f4f5`).
- **Text** — main body text (e.g. `#1a1a1a`).
- **Muted** — captions, footer (e.g. `#6b7280`).

Keep contrast above WCAG AA (4.5:1 for body text).

## Images

- PNG/JPEG/GIF only.
- Public CDN URL or `public/`-served path. Use absolute URLs in production.
- Always set `alt` and `width` (Maizzle requires `width`, unitless).
- Responsive images: already handled in framework with `class="max-w-full align-middle"`.

## Buttons

`<Button>` already handles MSO padding, font-width spacing, and `text-decoration: none`. Don't add `box-border`. Style colors and shape with utilities; pick a variant for the base look.
```vue
<Button href="https://example.com" class="bg-brand text-white rounded px-6 py-3">Confirm</Button>
<Button href="https://example.com" variant="outline" align="center">Centered outline</Button>
<Button href="https://example.com" variant="link">Plain link</Button>
<Button href="https://example.com" icon="/arrow.png" icon-position="right">Continue</Button>
```

## Spacing & Dividers


- `<Spacer class="leading-8" />` for vertical space. Pass `leading-*` or `h-*`. For Outlook fine-tune use `mso-line-height-alt-*`.
- `<Hr />` for visible separators — defaults `h-px leading-px my-6 bg-slate-300`. Pass `h-*`, `bg-*`, `m*-*` to override:
  ```vue
  <Hr class="bg-gray-200 my-8" />
  <Hr class="h-0.5 bg-indigo-300" />
  ```

## Responsive

Maizzle ships two breakpoints calibrated for inboxes:
- `sm:` — `@media (max-width: 600px)`
- `xs:` — `@media (max-width: 430px)`

See [PATTERNS.md](./PATTERNS.md) for common responsive patterns.

## Dark Mode

Use `dark:` for color-scheme-aware overrides. Outlook desktop on Windows ignores media queries, so dark variants only apply where supported (Apple Mail, modern iOS Mail, some Outlook builds).
```vue
<Body class="bg-white dark:bg-gray-900">
  <Container class="max-w-xl bg-white dark:bg-gray-950">
    <Text class="text-gray-800 dark:text-gray-100">Adapts to system theme.</Text>
  </Container>
</Body>
```

For images that need a dark variant, prefer `<Img dark-src="...">` (renders a `<picture>` with a `prefers-color-scheme` source).

## Footer Pattern

Real-world footer with address, copyright, and unsubscribe with Handlebars syntax to be parsed by the email service provider:
```vue
<Section class="text-center text-sm text-gray-500 mt-8">
  <Raw>
    <Text class="m-0">{{ company.address }}</Text>
  </Raw>
  <Text class="m-0">&copy; {{ new Date().getFullYear() }} <Raw>{{ company.name }}</Raw></Text>
  <Raw>
    <Link href="{{ unsubscribeUrl }}" class="text-gray-500 underline">Unsubscribe</Link>
  </Raw>
</Section>
```

## Production Hygiene

- **Keep output ≤ 102 KB** to avoid Gmail clipping. CSS purge is on by default; minify (`html.minify: true`) for production.
- **Use absolute URLs** for images and links in shipped templates. `<WithUrl>` or `url.base` config rewrite relatives at build time.
- **Reuse, don't repeat**: factor recurring pieces (logos, footers, button presets) into components under `components/` — they auto-import.

## Brand Brief Checklist

Before authoring a new template, offer to collect the following from the user.
- Primary brand color (hex or Tailwind palette) — drives buttons, links, accents.
- Secondary / surface colors (hex, Tailwind) — card backgrounds, borders, muted text.
- Logo — public PNG or JPEG URL.
- Tone — modern / minimal vs. classic / editorial. Affects type scale, density, divider style.
- Typeface preference — system stack, Inter (default), or a Google / Bunny font name.
- Sender details — physical mailing address (CAN-SPAM / GDPR), unsubscribe URL pattern.

Try to use Tailwind as much as possible. Avoid inline styles except for one-off exceptions.
