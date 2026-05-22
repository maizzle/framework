# Maizzle Components Reference

All components below auto-import — no imports needed.

## Conventions

- **`outlookFallback`** (bool, default `true`) is available on `<Layout>`, `<Html>`, `<Body>`, `<Container>`, `<Section>`, `<Column>`, `<Button>`, `<Spacer>`, `<Overlap>`, `<Img>`. Setting `false` skips MSO ghost tables, VML, `xmlns:v/o`, and mso-only CSS for that component + descendants. Each component also inherits the value from any ancestor that set it.
- `<Container>`/`<Section>` auto-wrap in an MSO conditional `<table>`. `<Column>` auto-wraps in an MSO `<td>`.
- Use kebab-case for camelCase props in templates (`body-class`, `dark-src`, `mso-style`).

## Index

**Document scaffolding:** `<Layout>` `<Html>` `<Head>` `<Body>` `<Tailwind>` `<Font>` `<Preheader>`
**Layout primitives:** `<Container>` `<Section>` `<Row>` `<Column>` `<Overlap>`
**Content:** `<Heading>` `<Text>` `<Link>` `<Button>` `<Img>` `<Hr>` `<Spacer>` `<Markdown>` `<CodeBlock>` `<CodeInline>` `<QrCode>`
**Conditionals & escape hatches:** `<Outlook>` `<NotOutlook>` `<OutlookBg>` `<Plaintext>` `<NotPlaintext>` `<Raw>` `<NoWidows>` `<WithUrl>`

---

## Layout

Full HTML document scaffold: `<html>` (+VML/Office NS) + `<head>` (charset/viewport/format-detection/color-scheme meta, MSO font reset, Tailwind import, Inter from Google Fonts) + `<body>` + `<div role="article">`. Replaces `<Html> + <Head> + <Tailwind> + <Body>`.

Props: `lang` (default `'en'`), `dir` (`'ltr'`/`'rtl'`, default `'ltr'`), `bodyClass`, `ariaLabel`, `doubleHead` (render empty `<head>` first — Yahoo Android workaround).

```vue
<Layout lang="ro" body-class="bg-slate-100" aria-label="Order confirmation"><!-- content --></Layout>
```

## Html

`<html>` with `lang`, `dir`, and (by default) VML/Office XML namespaces. Use directly when not using `<Layout>`.

Props: `lang` (default `'en'`), `dir`, `xmlns` (default `true`), `doctype` (overrides config + `useDoctype()`).

```vue
<Html lang="fr">
  <Head>
    <style>@import "@maizzle/tailwindcss";</style>
  </Head>
  <Body><!-- content --></Body>
</Html>
```

## Head

`<head>` with email-safe defaults (charset, x-apple-disable-message-reformatting, viewport).

Props: `double` (bool, default `false`) — renders empty `<head></head>` first (Yahoo Android workaround).

## Body

`<body>` with `<div role="article">` wrapper. Props: `xmlLang` (defaults to parent `<Html>` `lang`), `dir`, `ariaLabel`.

## Tailwind

Compile Tailwind from classes used inside the wrapped block and inject into `<head>`. Required only when not using `<Layout>`. Errors without a `<Head />` in the template.

Slots: `default` (content; classes scanned), `config` (raw CSS replacing the default `@import "@maizzle/tailwindcss";` seed; read at setup, never rendered).

```vue
<Tailwind>
  <template #config>
    @import "@maizzle/tailwindcss";
    @theme { --color-brand: #6366f1; }
  </template>
  <Body><h1 class="text-brand">Hi</h1></Body>
</Tailwind>
```

Sibling `<Tailwind>` blocks share class names (later wins after inlining). Nested ones flatten upward; inner `#config` is ignored.

## Font

Load a web font and register a Tailwind `font-{slug}` utility. Emits a `<link>` and a `--font-{slug}` token merged into the Tailwind compile.

Props: `family` (required), `weights` (number[], default `[400]`), `styles` (`('normal'|'italic')[]`, default `['normal']`; including `'italic'` switches URL to `ital,wght`), `display` (default `'swap'`), `provider` (`'google'`/`'bunny'`, default `'google'`), `url` (pre-built stylesheet URL — overrides `provider`/`weights`/`styles`/`display`), `fallback` (custom stack; default category-aware).

```vue
<Font family="Roboto" :weights="[400, 600]" :styles="['normal', 'italic']" />
<Font family="Acme Sans" url="https://cdn.example.com/fonts/acme-sans.css" />
```

Script form: `useFont({ family: 'Roboto', weights: [400, 600] })`. Deduplicated by family (first registration wins).

## Preheader

Hidden preview text teleported to `<body>` start, padded with invisible fillers so clients don't pull body text into the inbox snippet.

Props: `spaces` (number) — explicit filler count; auto-derived to fill a ~200-char preview budget when omitted.

```vue
<Preheader>Your order has shipped!</Preheader>
```

Script form: `usePreheader('text', { spaces })`.

## Container

Centered wrapper (`<div>` + MSO `<table>`). Two modes:
- **Prop mode** — set `width`: feeds resolved width to descendant Rows/Columns for auto `min-width` + natural stacking.
- **Tailwind mode** — omit `width`, use classes (`max-w-xl mx-auto`). MSO width auto-derives from resolved CSS, fallback 600px.

Without any width hint, defaults to `max-w-150 mx-auto` (600px).

Props: `width` (max-width on div + width on MSO table), `msoStyle` (inline CSS on MSO `<td>` only).

```vue
<Container class="max-w-xl mx-auto"><!-- Tailwind mode --></Container>
<Container width="600px"><!-- Prop mode: auto column min-widths --></Container>
```

## Section

Full-width content block (`<div>` + MSO `<table>`).

Props: `width` (`max-width` + MSO table width; without it, MSO width auto-derives from a width utility/inline style, fallback `100%`), `msoStyle`.

## Row

Multi-column row. Auto-detects `<Column>` children and feeds widths.

Props: `width` (override inherited container width for column math), `cols` (explicit column count; useful with `v-for`/`v-if` where auto-detection misses).

## Column

Inline-block `<div>` (`vertical-align: top`, `font-size: 16px` reset), wrapped in MSO `<td>` with calculated width.

- With Container `width`: auto-calculates `min-width = containerWidth ÷ columns`. Stacks naturally, no media queries.
- Tailwind mode (no Container `width`): use `w-1/2 xs:w-full`-style classes.

Props: `width` (explicit `min-width` + MSO `<td>` width), `msoStyle`.

See `PATTERNS.md` for equal columns, percentage widths, equal-height, reverse stack on mobile, gutters, nested rows.

```vue
<Container class="max-w-xl mx-auto">
  <Row>
    <Column class="w-1/2 xs:w-full">Left</Column>
    <Column class="w-1/2 xs:w-full">Right</Column>
  </Row>
</Container>
```

## Overlap

Faux absolute positioning: stacks an `#overlay` slot on top of the default slot (background layer) via `position: relative` table tricks, with VML fallback for Outlook.

Props: `height` (**required**, max height of background layer), `width` (overlay table / VML rect width; inherits Container width), `msoHeight` (Outlook VML height override), `msoInset` (default `'0,-60px,0,0'` — VML textbox inset `top,right,bottom,left`; negative values shift overlay).

```vue
<Overlap height="200px">
  <Img src="/banner.jpg" alt="Banner" width="600" />
  <template #overlay><Img src="/avatar.png" alt="Avatar" width="80" /></template>
</Overlap>
```

## Heading

`<h1>`–`<h6>`, `m-0` by default. Prop: `level` (string|number 1–6, default `1`).

## Text

`<p>` (default) or `<span>`. Prop: `as` (`'p'`/`'span'`).

## Link

`<a>` with `text-decoration: none`. Prop: `href` (required).

## Button

Bulletproof CTA `<a>` styled as a button, with MSO spacer `<i>` for Outlook padding. Defaults: solid indigo (`#4338ca`) bg, white text, 16/24px padding, 4px radius. **No** `bgColor`/`color` prop — override colors via Tailwind classes or inline `style`.

Props: `href` (required), `variant` (`'solid'`(default)/`'outline'`/`'ghost'`/`'link'`), `align` (`'left'`/`'center'`/`'right'`), `icon` (URL), `iconWidth` (default `12`), `iconPosition` (`'left'`/`'right'`(default)), `iconClass`, `iconAlt`, `msoPt` (default `'16px'` — `mso-text-raise` on inner span), `msoPb` (default `'31px'` — bottom spacer mso-text-raise), `msoPx` (default `150` — horizontal padding via `mso-font-width`; bare numbers → `%`).

```vue
<Button href="https://example.com" variant="outline" align="center">Outline</Button>
<Button href="https://example.com" icon="/arrow.png" icon-position="left">With icon</Button>
```

## Img

Plain `<img>`, or `<picture>` when `darkSrc`/`motionSrc` is set. Defaults: `max-width: 100%`, `vertical-align: middle`. `width` renders unitless.

Props: `src` (required; static fallback when `motionSrc` set), `alt`, `width` (required), `darkSrc` (`prefers-color-scheme: dark` variant), `motionSrc` (`prefers-reduced-motion: no-preference` variant; MIME auto-derived), `href` (wraps output in `<a>`).

```vue
<Img src="/logo.png" dark-src="/logo-dark.png" motion-src="/logo.gif" alt="Logo" width="120" />
<Img src="/banner.jpg" alt="Banner" width="600" href="https://example.com" />
```

### Cropped mode

`aspect` (or a Tailwind `aspect-*` class) switches to a cropped `background-image` wrapper + VML `<v:rect>` for Outlook. No `<img>` — wrapper is `role="img"` + `aria-label` from `alt`.

- `aspect` — `'16:9'`, `'16/9'`, `'4:3'`, `'1:1'`, etc. Prop wins over class.
- Tailwind classes: `aspect-square` (1:1), `aspect-video` (16:9), `aspect-[n/m]`, `aspect-[n:m]`, `aspect-n/m`. Stripped from forwarded class.
- `size` — default `'cover'`. Maps to VML aspect: `cover`→`atleast`, `contain`→`atmost`.
- `position` — CSS `background-position`, default `'center'`.
- `dark-src`/`motion-src` — emit `dark:bg-[url('…')]!` / `motion-safe:bg-[url('…')]!` classes instead of `<picture>`.
- `href` — modern clients get an `<a class="block no-underline">` around the wrapper; Outlook gets a native `href` attribute on the `<v:rect>` (so the whole shape is clickable).
- `outlookFallback` — see [Conventions](#conventions); in cropped mode `false` skips the `<v:rect>` and the `<!--[if !mso]>` wrapper, letting the modern padding-hack div render to all clients (Outlook shows an empty area).

```vue
<Img src="thumb.jpg" aspect="16:9" alt="Thumbnail" width="600" class="rounded-lg" />
<Img src="thumb.jpg" width="600" class="aspect-video" />
<Img src="hero.jpg" aspect="16:9" alt="Hero" width="600" href="https://example.com" />
```

## Hr

`<div role="separator">` with defaults `h-px leading-px my-6 bg-slate-300`. Override via class: height (`h-*`/`leading-*`), margin (`m*-*`), color (`bg-*`).

```vue
<Hr class="bg-blue-200 h-0.5 my-8" />
```

## Spacer

Vertical (`<div role="separator">` + zero-width joiner; size with `h-*`/`leading-*`) or horizontal (`<i>` with em-spaces + `mso-font-width`).

Props: `type` (`'vertical'`(default)/`'horizontal'`), `width` (horizontal only, default `16` px).

```vue
<Spacer class="h-8" />
<Spacer class="h-10 mso-line-height-alt-8" />
<Spacer type="horizontal" :width="24" />
```

## Markdown

Render Markdown via `markdown-exit` + Shiki. Source via `content`, `src`, or slot.

Props: `content` (overrides slot), `src` (path to `.md`, resolved at build), `shikiTheme` (default `'github-dark-high-contrast'`), `wrapper` (wrap output in `<div>`, default `false`), `config` (extra `markdown-exit` options).

```vue
<Markdown src="./content/welcome.md" />
<Markdown wrapper class="prose" content="**Hello**" />
```

For prose defaults, `@import "@maizzle/tailwindcss/prose"` + `class="prose"` (needs `wrapper`).

## CodeBlock

Shiki-highlighted code block wrapped in an Outlook-safe table. Source via `code` or slot.

Props: `code` (falls back to slot), `language` (default `'html'`), `theme` (Shiki theme name, default `'github-light'`), `tdClass` (default `'max-w-0 mso-padding-alt-4'`).

```vue
<CodeBlock language="js" code="const name = 'Maizzle'" />
```

## CodeInline

Inline `<code>`. Two modes:
- **Plain (default)** — light-gray bg + border; content HTML-escaped. No Shiki pass.
- **Highlighted** — set `theme` to opt into Shiki; cell bg switches to the theme bg.

Props: `code` (falls back to slot), `language` (default `'html'`; only used when `theme` is set), `theme` (Shiki theme name; unset → plain mode).

```vue
<Text>Use <CodeInline code="render()" /> to compile.</Text>
<Text>Try <CodeInline language="js" theme="github-dark" code="const x = 1" />.</Text>
```

## QrCode

Scannable QR rendered as a `<table>` of `<td>` cells — no SVG, no image. Sized via `size-*`/`w-*`/`h-*`; default 120 px (`size-30`).

Props: `value` (required — URL/text/MECARD/vCard/Wi-Fi etc.), `ecc` (`'L'`/`'M'`(default)/`'Q'`/`'H'` — ~7/15/25/30% recovery), `border` (quiet zone modules, default `1`), `alt` (`aria-label`).

Colors: `bg-*` (and `dark:bg-*`) paint the table background (light cells stay transparent). `qr:` variant paints data modules; composes with `dark:` (`dark:qr:bg-*`). Provided by `@maizzle/tailwindcss`; otherwise register `@custom-variant qr (& td.qd);`.

```vue
<QrCode value="https://maizzle.com" class="size-40" alt="Scan me" />
<QrCode value="..." class="bg-teal-300 qr:bg-teal-900 dark:bg-teal-800 dark:qr:bg-teal-200" />
```

QR HTML can grow tens of KB — don't duplicate the same code in one email (Gmail clipping). Windows Outlook ignores media queries, so codes render light there.

## Outlook

Wrap content in MSO conditional comments. Default targets all MSO versions.

Props (versions are years `2003`/`2007`/`2010`/`2013`/`2016`/`2019`; lists comma-separated): `only`, `not`, `lt`, `lte`, `gt`, `gte`. Also `open`/`close` — raw HTML injected inside the conditional before/after slot, bypassing Vue's parser (for unbalanced ghost-table openers).

```vue
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

VML markup for Outlook background images (Outlook ignores CSS `background-image`). Wraps slot in `v:rect` + `v:fill` + `v:textbox`.

Props: `width` (default `'600px'`), `height` (auto-sizes if absent), `src`, `type` (`'frame'`(default)/`'tile'`/`'pattern'`/`'solid'`/`'gradient'`/`'gradientradial'`), `backgroundPosition` (e.g. `'top,center'` — convenience for `origin`/`position`), `origin`/`position`/`sizes`/`aspect` (VML internals), `color`, `fillcolor` (default `'none'`), `fill` (default `true`), `stroke` (default `false`), `strokecolor`, `inset` (default `'0,0,0,0'` — textbox padding).

```vue
<Section class="bg-[url('/hero.jpg')] bg-cover bg-center">
  <OutlookBg src="/hero.jpg" width="600px" height="400px" background-position="center,center">
    <Container><Heading class="text-white text-3xl">Hello</Heading></Container>
  </OutlookBg>
</Section>
```

## Plaintext / NotPlaintext

`<Plaintext>` routes slot to plaintext output only (removed from HTML). `<NotPlaintext>` is the inverse. Both no-op until `plaintext` is enabled in config (or via `usePlaintext()`).

```vue
<Plaintext>Only in .txt</Plaintext>
<NotPlaintext>Only in .html</NotPlaintext>
```

## Raw

Emit content verbatim, bypassing Vue's template parser. Use for ESP/Handlebars/Liquid `{{ ... }}` that would otherwise be parsed as Vue.

Props: `content` (auto-populated from slot; set explicitly when rendering a string variable — slot is then ignored).

```vue
<Text>Hi <Raw>{{ first_name }}</Raw>,</Text>
<Text>Order <Raw :content="liquidSnippet" /></Text>
```

## NoWidows

Replaces the last space with `&nbsp;` in text nodes to prevent orphans. Walks children recursively. Skips template expressions (`{{ }}`, `{% %}`, `<%= %>`, …).

Props: `minWords` (string|number, default `4`) — leave shorter text alone.

```vue
<NoWidows><Heading>This heading will not have widows</Heading></NoWidows>
```

## WithUrl

Rewrites URL attributes in descendants. Prepends a base URL to relative paths and/or appends query params. Works on HTML attrs and Vue component props. Skips absolute URLs, data URIs, protocol-relative, and fragment links.

Affected attrs: `href`/`src`/`srcset`/`poster`/`data` on `a`/`img`/`video`/`source`/`link`/`script`/`object`/`embed`/`iframe`/`v:image`/`v:fill`.

Props: `base` (prepended to relative paths; slashes normalized), `parameters` (query string appended, e.g. `"utm_source=foo&bar=baz"`).

```vue
<WithUrl base="https://cdn.example.com/emails/">
  <Img src="/logo.png" alt="Logo" width="70" />
</WithUrl>
<WithUrl parameters="utm_source=newsletter&utm_medium=email">
  <Button href="https://example.com/pricing">View pricing</Button>
</WithUrl>
```
