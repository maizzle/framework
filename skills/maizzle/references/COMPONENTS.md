# Maizzle Components Reference

All components are auto-imported. No `import` statements needed in templates.

## Index

**Document scaffolding:** `<Layout>`, `<Html>`, `<Head>`, `<Body>`, `<Tailwind>`, `<Font>`, `<Preheader>`

**Layout primitives:** `<Container>`, `<Section>`, `<Row>`, `<Column>`, `<Overlap>`

**Content:** `<Heading>`, `<Text>`, `<Link>`, `<Button>`, `<Img>`, `<Hr>`, `<Spacer>`, `<Markdown>`, `<CodeBlock>`, `<CodeInline>`, `<QrCode>`

**Conditionals & escape hatches:** `<Outlook>`, `<NotOutlook>`, `<OutlookBg>`, `<Plaintext>`, `<NotPlaintext>`, `<Raw>`, `<NoWidows>`, `<WithUrl>`

---

## Layout

Full HTML document scaffold: `<html>` (with VML/Office namespaces) + `<head>` (charset, viewport, format-detection, color-scheme meta, MSO font reset, Tailwind import, Inter font from Google Fonts) + `<body>` + accessible `<div role="article">` wrapper.

Replaces the `<Html> + <Head> + <Tailwind> + <Body>` chain. Use `<Html>` directly when you want manual control.

Props:
- `lang` (string, default `'en'`).
- `dir` (`'ltr'` | `'rtl'`, default `'ltr'`).
- `bodyClass` (string) — classes added to `<body>`.
- `ariaLabel` (string) — `aria-label` on the inner article div.
- `doubleHead` (bool | string) — render an empty `<head>` first (Yahoo! Mail Android workaround).
- `outlookFallback` (bool, default `true`) — when `false`, skips MSO ghost tables, VML, `xmlns:v/o`, mso-only CSS for this component and all descendants.

```vue
<Layout lang="ro" dir="ltr" body-class="bg-slate-100" aria-label="Order confirmation">
  <!-- email content -->
</Layout>
```

## Html

The `<html>` element with `lang`, `dir`, and (by default) Outlook VML/Office XML namespaces. Use when manually composing the document instead of `<Layout>`.

Props: `lang`, `dir`, `xmlns` (bool, default `true`).

```vue
<Html lang="fr" dir="ltr">
  <Head>
    <style>@import "@maizzle/tailwindcss";</style>
  </Head>
  <Body>
    <!-- content -->
  </Body>
</Html>
```

## Head

The `<head>` element with email-safe defaults (charset, x-apple-disable-message-reformatting, viewport meta).

Props:
- `double` (bool | string, default `false`) — renders an empty `<head></head>` first; Yahoo! Mail Android workaround.

```vue
<Head>
  <style>@import "@maizzle/tailwindcss";</style>
</Head>
```

## Body

The `<body>` element with accessible `<div role="article">` wrapper.

Props: `xmlLang`, `dir`, `ariaLabel`.

## Tailwind

Compile Tailwind from the classes used inside the wrapped block and inject it into `<head>`. Required only if not using `<Layout>` (which already includes the import). A `<Head />` component must be present in the template — error otherwise.

Slots:
- `default` — content rendered into the document; classes are scanned for utility generation.
- `config` — raw CSS replacing the default `@import "@maizzle/tailwindcss";` seed. Read at setup, never rendered.

```vue
<Tailwind>
  <template #config>
    @import "@maizzle/tailwindcss";
    @theme {
      --color-brand: #6366f1;
      --font-display: "Inter", sans-serif;
    }
  </template>

  <Body>
    <h1 class="font-display text-brand">Hello</h1>
  </Body>
</Tailwind>
```

Multiple sibling blocks share class names (later block wins after inlining). Nested `<Tailwind>` is flattened: inner classes flow up to the outer stylesheet, inner `#config` is ignored.

## Font

Load a web font and register a Tailwind utility (`font-{slug}`) for it. Auto-emits a `<link>` and a `--font-{slug}` token merged into the Tailwind compile pass.

Props:
- `family` (string, required) — single family, e.g. `"Open Sans"`.
- `weights` (number[], default `[400]`).
- `styles` (`('normal' | 'italic')[]`, default `['normal']`) — including `'italic'` switches the URL to `ital,wght`.
- `display` (`'auto'` | `'block'` | `'swap'` | `'fallback'` | `'optional'`, default `'swap'`).
- `provider` (`'google'` | `'bunny'`, default `'google'`).
- `url` (string) — pre-built stylesheet URL. When set, `provider`/`weights`/`styles`/`display` are ignored.
- `fallback` (string) — custom fallback stack. Default is category-aware (sans-serif / serif / monospace / display / handwriting).

```vue
<Font family="Roboto" :weights="[400, 600]" :styles="['normal', 'italic']" />
<Font family="Open Sans" provider="bunny" />
<Font family="Acme Sans" url="https://cdn.example.com/fonts/acme-sans.css" />
```

Equivalent script form: `useFont({ family: 'Roboto', weights: [400, 600] })`. Fonts are deduplicated by family — first registration wins.

## Preheader

Hidden preview text teleported to the start of `<body>`, followed by filler characters that prevent clients from pulling other text into the inbox preview.

Props:
- `fillerCount` (number, default `150`) — `&#8199;&#65279;&#847;` filler pairs.
- `shyCount` (number, default `150`) — `&shy;` entities.

```vue
<Preheader>Your order has shipped!</Preheader>
```

Script alternative: `usePreheader('text', { fillerCount, shyCount })`.

## Container

Centered wrapper. Renders a `<div>` (with `margin: 0 auto`) wrapped in an MSO conditional `<table>` for Outlook.

Two modes:
- **Prop mode**: set `width` for fixed width. Provides the resolved width to descendant Rows/Columns for auto `min-width` + natural stacking.
- **Tailwind mode**: omit `width`, use classes (e.g. `max-w-xl mx-auto`). MSO width is auto-derived from the resolved CSS, defaulting to 600px.

Without any width hint at all, the div defaults to `max-w-150 mx-auto` (600px).

Props:
- `width` (string | number) — `max-width` on the div + `width` on the MSO table.
- `msoWidth` (string | number) — override only the MSO table width.
- `msoStyle` (string) — inline CSS applied only to the MSO `<td>`.
- `outlookFallback` (bool, default `true`).

```vue
<Container class="max-w-xl mx-auto"><!-- Tailwind mode --></Container>
<Container width="600px"><!-- Prop mode: auto column min-widths --></Container>
```

## Section

Full-width content block. Renders a `<div>` wrapped in an MSO `<table>` for Outlook.

Props:
- `width` (string | number) — `max-width` on the div + `width` on the MSO table. Without it, MSO width auto-derives from a width utility/inline style, falling back to `100%`.
- `msoStyle` (string).
- `outlookFallback` (bool, default `true`).

```vue
<Section class="px-6 py-4 bg-white">
  <Heading level="1">Hello</Heading>
  <Text>Content</Text>
</Section>
```

## Row

Multi-column row. Auto-detects the number of `<Column>` children and feeds widths into them.

Props:
- `width` (string | number) — override the inherited container width used for column math.
- `cols` (number) — explicit column count, useful with `v-for` / `v-if` where auto-detection misses children.

## Column

Renders an inline-block `<div>` (`vertical-align: top`, `font-size: 16px` reset), wrapped in an MSO `<td>` with calculated width.

- **With Container `width` prop**: auto-calculates `min-width` from `containerWidth ÷ columns`. Stacks naturally without media queries.
- **Tailwind mode** (no Container `width`): use `w-1/2 xs:w-full`-style classes.

Props:
- `width` (string | number) — explicit `min-width` (also sets MSO `<td>` width).
- `msoStyle` (string).
- `outlookFallback` (bool, default `true`).

For full layout patterns (equal columns, percentage widths, equal-height, reverse stack on mobile, gutters, nested rows), see `PATTERNS.md`.

```vue
<Container class="max-w-xl mx-auto">
  <Row>
    <Column class="w-1/2 xs:w-full">Left</Column>
    <Column class="w-1/2 xs:w-full">Right</Column>
  </Row>
</Container>
```

## Overlap

Faux absolute positioning: stacks an overlay on top of a background layer using `position: relative` table tricks, with VML fallback for Outlook.

Slots:
- default — background layer (constrained by `height`).
- `overlay` — content rendered on top.

Props:
- `height` (string | number, **required**) — max height of the background layer.
- `width` (string | number) — overlay table / VML rectangle width. Inherits Container width otherwise.
- `msoHeight` (string | number) — Outlook VML rectangle height override.
- `msoInset` (string, default `'0,-60px,0,0'`) — VML textbox inset (`top,right,bottom,left`). Negative values shift overlay content.

```vue
<Overlap height="200px">
  <Img src="/banner.jpg" alt="Banner" width="600" />
  <template #overlay>
    <Img src="/avatar.png" alt="Avatar" width="80" />
  </template>
</Overlap>
```

## Heading

`<h1>`–`<h6>` element, `m-0` by default.

Props:
- `level` (string | number 1–6, default `1`).

```vue
<Heading>Default h1</Heading>
<Heading level="2" class="text-xl font-semibold">Subheading</Heading>
```

## Text

Renders `<p>` (default) or `<span>`.

Props:
- `as` (`'p'` | `'span'`, default `'p'`).

```vue
<Text>Paragraph.</Text>
<Text as="span" class="font-bold">Inline</Text>
```

## Link

`<a>` with `text-decoration: none` by default.

Props:
- `href` (string, required).

## Button

Bulletproof CTA `<a>` styled as a button, with MSO spacer `<i>` elements for Outlook padding. Defaults: solid indigo (`#4338ca`) bg, white text, 16/24px padding, 4px radius.

Override colors with Tailwind classes (`class="bg-blue-600 text-white"`) or inline `style` — there is **no** `bgColor` / `color` prop.

Props:
- `href` (string, required).
- `variant` (`'solid'` | `'outline'` | `'ghost'` | `'link'`, default `'solid'`).
- `align` (`'left'` | `'center'` | `'right'`).
- `icon` (string) — icon image URL.
- `iconWidth` (string | number, default `12`).
- `iconPosition` (`'left'` | `'right'`, default `'right'`).
- `iconClass` (string).
- `iconAlt` (string).
- `msoPt` (string, default `'16px'`) — `mso-text-raise` on inner `<span>` (top alignment).
- `msoPb` (string, default `'31px'`) — `mso-text-raise` on the bottom spacer.
- `msoPx` (string | number, default `150`) — horizontal padding via `mso-font-width`. Bare numbers → `%`.
- `outlookFallback` (bool, default `true`).

```vue
<Button href="https://example.com">Get started</Button>
<Button href="https://example.com" variant="outline" align="center">Outline</Button>
<Button href="https://example.com" class="bg-blue-600 text-white rounded-full px-8">Custom</Button>
<Button href="https://example.com" icon="/arrow.png" icon-position="left">With icon</Button>
```

## Img

Plain `<img>`, or `<picture>` when `darkSrc` / `motionSrc` is set. Defaults: `max-width: 100%`, `vertical-align: middle`. `width` is required and renders unitless.

Props:
- `src` (string, required) — when `motionSrc` is set, `src` is the static fallback.
- `alt` (string, default `''`).
- `width` (string | number, required).
- `darkSrc` (string) — `prefers-color-scheme: dark` variant.
- `motionSrc` (string) — `prefers-reduced-motion: no-preference` variant. MIME type auto-derived from extension.

```vue
<Img src="/logo.png" dark-src="/logo-dark.png" motion-src="/logo.gif" alt="Logo" width="120" />
```

## Hr

Horizontal rule. Renders `<div role="separator">` with default 1px height, `#cbd5e1` background, 24px vertical margin.

Customize the color with a Tailwind `bg-*` class or inline `background-color` — there is **no** `color` prop.

Props:
- `height` (string | number, default `'1px'`).
- `spaceY` (string | number, default `'24px'`) — vertical margin.
- `spaceX` (string | number) — horizontal margin.
- `top`, `bottom`, `left`, `right` (string | number) — override individual sides.

```vue
<Hr />
<Hr class="bg-blue-200" height="2" />
<Hr space-y="32px" />
<Hr top="16" bottom="32" />
```

## Spacer

Vertical or horizontal spacer.

- Vertical: `<div role="separator">` with `line-height` (and `mso-line-height-alt` when `msoHeight` is set). Without `height`, collapses to a zero-width joiner (line-break).
- Horizontal: `<i>` with em-space chars and `mso-font-width` for accurate Outlook sizing.

Props:
- `type` (`'vertical'` | `'horizontal'`, default `'vertical'`).
- `height` (string | number) — vertical only.
- `width` (string | number, default `16`) — horizontal only, in px.
- `msoHeight` (string | number) — Outlook override via `mso-line-height-alt`.
- `outlookFallback` (bool, default `true`).

```vue
<Spacer height="32px" />
<Spacer height="40px" mso-height="32px" />
<Spacer type="horizontal" :width="24" />
```

## Markdown

Renders Markdown via `markdown-exit` with Shiki syntax highlighting. Source can come from `content`, `src`, or slot.

Props:
- `content` (string) — Markdown string. Overrides slot.
- `src` (string) — path to a `.md` file, resolved at build time.
- `shikiTheme` (string, default `'github-dark-high-contrast'`).
- `wrapper` (bool, default `false`) — wrap output in a `<div>`.
- `config` (object) — extra `markdown-exit` options.

```vue
<Markdown>
  ## Welcome
  This is a **bold** statement with a [link](https://maizzle.com).
</Markdown>

<Markdown src="./content/welcome.md" />
<Markdown wrapper class="prose" content="**Hello**" />
```

For typographic defaults, opt into `@import "@maizzle/tailwindcss/prose"` and add `class="prose"` (with `wrapper`).

## CodeBlock

Syntax-highlighted code block via Shiki, wrapped in an Outlook-safe table. Source via `code` prop or slot.

Props:
- `code` (string) — falls back to slot content.
- `language` (string, default `'html'`).
- `theme` (string, default `'github-light'`) — any Shiki theme name.
- `tdClass` (string, default `'max-w-0 mso-padding-alt-4'`).

```vue
<CodeBlock language="js" code="const name = 'Maizzle'" />
<CodeBlock theme="github-dark" class="text-sm rounded-lg">
  &lt;div&gt;Hello&lt;/div&gt;
</CodeBlock>
```

## CodeInline

Inline `<code>` with light gray bg + border. Content is HTML-escaped automatically.

Props:
- `code` (string) — falls back to slot.

```vue
<Text>Use <CodeInline code="render()" /> to compile.</Text>
```

## QrCode

Scannable QR code rendered as a table of `<tr>`/`<td>` cells — no SVG, no image. Sized via Tailwind utilities (`size-*`/`w-*`/`h-*`); default 120 px (`size-30`).

Props:
- `value` (string, required) — data to encode (URL, text, MECARD, vCard, Wi-Fi, etc.).
- `ecc` (`'L'` | `'M'` | `'Q'` | `'H'`, default `'M'`) — error correction (~7/15/25/30 % recovery).
- `border` (number, default `1`) — quiet zone in modules.
- `alt` (string) — `aria-label` on the table.

Colors:
- `bg-*` / `dark:bg-*` paint the table background (light cells stay transparent).
- `qr:` variant paints data modules. Composes with `dark:` (`dark:qr:bg-*`). Provided by `@maizzle/tailwindcss`; otherwise register `@custom-variant qr (& td.qd);`.

```vue
<QrCode value="https://maizzle.com" class="size-40" alt="Scan me" />
<QrCode value="..." class="bg-teal-300 qr:bg-teal-900 dark:bg-teal-800 dark:qr:bg-teal-200" />
<QrCode value="..." ecc="H" :border="4" />
```

QR HTML can grow to tens of KB — avoid duplicating the same code in one email (Gmail clipping). Outlook on Windows ignores media queries, so codes always render light there.

## Outlook

Wrap content in MSO conditional comments. Default targets all MSO versions.

Props (all comma-separated, e.g. `"2013,2016"`):
- `only` — show only in those versions.
- `not` — show in all versions except those.
- `lt` / `lte` / `gt` / `gte` — version comparisons.

Versions: `2003`, `2007`, `2010`, `2013`, `2016`, `2019`.

```vue
<Outlook>Outlook only</Outlook>
<Outlook only="2013,2016">Just 2013/2016</Outlook>
<Outlook gte="2013">2013 and newer</Outlook>
```

## NotOutlook

Hide content from all Outlook versions (`<!--[if !mso]><!-->...<!--<![endif]-->`). No props.

```vue
<NotOutlook><Img src="/hero.webp" alt="" width="600" /></NotOutlook>
<Outlook><Img src="/hero.png" alt="" width="600" /></Outlook>
```

## OutlookBg

VML markup for Outlook background images (Outlook ignores CSS `background-image`). Wraps slot in a `v:rect` with `v:fill` and `v:textbox`.

Props:
- `width` (string | number, default `'600px'`).
- `height` (string | number) — auto-sizes if absent.
- `src` (string) — background image URL.
- `type` (`'frame'` | `'tile'` | `'pattern'` | `'solid'` | `'gradient'` | `'gradientradial'`, default `'frame'`).
- `backgroundPosition` (string, e.g. `'top,center'`) — convenience for `origin`/`position`.
- `origin`, `position`, `sizes`, `aspect` — VML fill internals.
- `color`, `fillcolor` (default `'none'`), `fill` (default `true`), `stroke` (default `false`), `strokecolor`.
- `inset` (string, default `'0,0,0,0'`) — textbox padding `top,right,bottom,left`.

```vue
<Section class="bg-[url('/hero.jpg')] bg-cover bg-center">
  <OutlookBg src="/hero.jpg" width="600px" height="400px" background-position="center,center">
    <Container>
      <Heading class="text-white text-3xl">Hello</Heading>
    </Container>
  </OutlookBg>
</Section>
```

## Plaintext

Routes slot content to the plaintext output only — removed from HTML. Pair with `<NotPlaintext>` to do the inverse. Both no-op until `plaintext` is enabled in config (or via `usePlaintext()`).

```vue
<Plaintext>Only in .txt</Plaintext>
<NotPlaintext>Only in .html</NotPlaintext>
```

## NotPlaintext

Routes slot content to the HTML output only — removed from plaintext. See `<Plaintext>`.

## Raw

Emit content verbatim, bypassing Vue's template parser. Use for ESP/Handlebars/Liquid `{{ ... }}` syntax that would otherwise be parsed as Vue expressions.

Props:
- `content` (string) — auto-populated from slot. Set explicitly when rendering a string variable; the slot is then ignored.

```vue
<Text>Hi <Raw>{{ first_name }}</Raw>,</Text>
<Text>Order <Raw :content="liquidSnippet" /></Text>
```

## NoWidows

Replaces the last space with `&nbsp;` in text nodes to prevent orphans. Walks all children recursively. Skips template expressions (`{{ }}`, `{% %}`, `<%= %>`, …).

Props:
- `minWords` (string | number, default `4`) — leave shorter text alone.

```vue
<NoWidows>
  <Heading>This heading will not have widows</Heading>
  <Text>This paragraph also gets widow prevention.</Text>
</NoWidows>
```

## WithUrl

Rewrites URL attributes in descendants. Prepends a base URL to relative paths and/or appends query parameters. Works on HTML attrs and Vue component props.

Affected attrs: `href`, `src`, `srcset`, `poster`, `data` on `a`, `img`, `video`, `source`, `link`, `script`, `object`, `embed`, `iframe`, `v:image`, `v:fill`. Skips absolute URLs, data URIs, protocol-relative, and fragment links.

Props:
- `base` (string) — base URL prepended to relative paths (slashes normalized).
- `parameters` (string) — query string appended, e.g. `"utm_source=foo&bar=baz"`.

```vue
<WithUrl base="https://cdn.example.com/emails/">
  <Img src="/logo.png" alt="Logo" width="70" />
</WithUrl>

<WithUrl parameters="utm_source=newsletter&utm_medium=email">
  <Button href="https://example.com/pricing">View pricing</Button>
</WithUrl>
```
