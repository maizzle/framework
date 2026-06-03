# Styling Guide

Tailwind utilities first, inline `style="..."` as the escape hatch.

## Default Approach

Maizzle compiles Tailwind v4 from your component classes into a single `<style>` block and (by default) inlines those declarations onto each element via Juice. Write Tailwind utilities the same way you would for the web — Maizzle's `@maizzle/tailwindcss` plugin handles the email-safe bits.

```vue
<Layout>
  <Container class="max-w-xl">
    <Heading class="text-2xl font-bold text-gray-900 mb-4">Hello</Heading>
    <Text class="text-base text-gray-700">Welcome aboard.</Text>
  </Container>
</Layout>
```

`<Layout>` imports `@maizzle/tailwindcss`, ships email-safe meta tags, MSO font reset, and Inter. Reach for explicit `<Html> + <Head> + <Tailwind> + <Body>` only when you need manual control. Use inline `style="..."` for one-offs the utility system can't express cleanly (specific MSO rules, computed values, third-party templating expressions).

## Email-Client Realities

- **No SVG, no WebP fallback in Outlook**. Use PNG/JPEG, or pair `<NotOutlook>` + `<Outlook>` with a fallback image.
- **No native flex/grid in older Outlook**. Use `<Row>`/`<Column>` (inline-block + MSO `<td>`) for multi-column layouts.
- **Responsive variants** (`sm:`, `xs:`): progressive enhancement; not all clients support media queries.
- **Dark mode** (`dark:`) via `prefers-color-scheme`: limited support; progressive enhancement.
- **Client variants**: `gmail:`, `outlook-mac:`, `apple-mail:`, `yahoo:`, etc.
- **`rem` units**: Maizzle converts to pixels at compile time.

## Layout Defaults

Pin page width to what you need (default 600px) — Maizzle handles the Outlook ghost table.

```vue
<Layout body-class="bg-gray-100">
  <Container class="max-w-xl"><!-- 576px max, centered, MSO table sized to match --></Container>
</Layout>
```

## Typography

`<Heading>` and `<Text>` reset margins (`m-0`) so you compose spacing from utilities.

```vue
<Heading level="1" class="text-2xl font-bold text-gray-900 mb-4">Order confirmed</Heading>
<Heading level="2" class="text-lg font-semibold text-gray-800 mb-2">Items</Heading>
<Text class="text-base text-gray-700">Thanks for your purchase.</Text>
<Text as="span" class="text-sm text-gray-500">Order #1234</Text>
```

### Line height

`text-*` sizes ship a paired `line-height` (`xs`16 `sm`20 `base`24 `lg`28 `xl`28 `2xl`32 `3xl`36 `4xl`40; `5xl`+ = size px). Don't add a `leading-*` that restates it — only to deviate. No paired leading on `text-xxs`/`text-2xs`/`text-2sm`/`text-0` or arbitrary sizes — use the slash form (`text-[32px]/10`).

Inter is loaded by `<Layout>`. Register additional families with `<Font>` (or `useFont()`):

```vue
<Font family="Roboto" :weights="[400, 600]" />
<Heading class="font-roboto">…</Heading>
```

## Colors & Brand

Define brand tokens once with `@theme` and reference them as semantic Tailwind utilities. Never hardcode hex values in templates.

Per-template `<Tailwind>` block:

```vue
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
```

Project-wide `tailwind.css`:

```css
@import "@maizzle/tailwindcss";
@theme {
  --color-brand: #4338ca;
  --color-surface: #ffffff;
  --color-muted: #6b7280;
}
```

```vue
<Html>
  <Head><style>@import "./tailwind.css";</style></Head>
  <Body>...</Body>
</Html>
```

## Images

- PNG/JPEG/GIF only.
- Public CDN URL or `public/`-served path. Absolute URLs in production.
- Always set `alt` and `width` (Maizzle requires `width`, unitless).
- Framework handles responsive sizing via `class="max-w-full align-middle"`.

## Buttons

`<Button>` handles MSO padding, font-width spacing, and `text-decoration: none`. Don't add `box-border`. Style with utilities; pick a variant for the base look.

```vue
<Button href="https://example.com" class="bg-brand text-white rounded px-6 py-3">Confirm</Button>
<Button href="https://example.com" variant="outline" align="center">Centered outline</Button>
<Button href="https://example.com" variant="link">Plain link</Button>
<Button href="https://example.com" icon="/arrow.png" icon-position="right">Continue</Button>
```

## Spacing & Dividers

- Prefer `mt-*` over `mb-*` for gaps between blocks — put the gap on the *following* element so the last child leaves no orphaned trailing space inside its container's padding.
- `<Button>` is `inline-block` by default, so it ignores `mt-*`/`mb-*` — space it with `mt-*` on the next element, or with `<Spacer>`, or set the button to `block`.
- `<Spacer class="h-8" />` for vertical space (`h-*` preferred, `leading-*` also works). For Outlook fine-tune use `mso-line-height-alt-*`.
- `<Hr />` for visible separators — defaults `h-px leading-px my-6 bg-slate-300`. Pass `h-*`, `bg-*`, `m*-*` to override.

```vue
<Hr class="bg-gray-200 my-8" />
<Hr class="h-0.5 bg-indigo-300" />
```

## Responsive

Two breakpoints calibrated for inboxes:
- `sm:` — `@media (max-width: 600px)`
- `xs:` — `@media (max-width: 430px)`

See [PATTERNS.md](./PATTERNS.md) for common responsive patterns.

## Dark Mode

Outlook desktop on Windows ignores media queries, so dark variants only apply where supported (Apple Mail, modern iOS Mail, some Outlook builds).

```vue
<Body class="bg-white dark:bg-gray-900">
  <Container class="max-w-xl bg-white dark:bg-gray-950">
    <Text class="text-gray-800 dark:text-gray-100">Adapts to system theme.</Text>
  </Container>
</Body>
```

For images that need a dark variant, prefer `<Img dark-src="...">` (`<picture>` with `prefers-color-scheme` source).

## Footer Pattern

Address + copyright + unsubscribe with Handlebars syntax passed through to the ESP via `<Raw>`:

```vue
<Section class="text-center text-sm text-gray-500 mt-8">
  <Raw><Text class="m-0">{{ company.address }}</Text></Raw>
  <Text class="m-0">&copy; {{ new Date().getFullYear() }} <Raw>{{ company.name }}</Raw></Text>
  <Raw><Link href="{{ unsubscribeUrl }}" class="text-gray-500 underline">Unsubscribe</Link></Raw>
</Section>
```

## Production Hygiene

- **Keep output ≤ 102 KB** to avoid Gmail clipping. CSS purge is on by default; minify (`html.minify: true`) for production.
- **Use absolute URLs** for images and links in shipped templates. `<WithUrl>` or `url.base` config rewrite relatives at build time.
- **Reuse, don't repeat**: factor recurring pieces (logos, footers, button presets) into components under `components/` — they auto-import.

## Brand Brief Checklist

Before authoring a new template, offer to collect from the user:

- **Primary color** (hex or Tailwind palette) — buttons, links, accents.
- **Secondary / surface colors** — card backgrounds, borders, muted text.
- **Body background** — outer wrapper (e.g. `#f4f4f5`).
- **Text / muted** — body (e.g. `#1a1a1a`) and captions/footer (e.g. `#6b7280`).
- **Logo** — public PNG or JPEG URL.
- **Tone** — modern/minimal vs. classic/editorial. Affects type scale, density, divider style.
- **Typeface** — system stack, Inter (default), or a Google/Bunny font name.
- **Sender details** — physical mailing address (CAN-SPAM / GDPR), unsubscribe URL pattern.

Keep contrast above WCAG AA (4.5:1 for body text). Prefer Tailwind utilities over inline styles.
