# Maizzle Components Reference

All components are auto-imported. No `import` statements needed in templates.

## Available Components

- `<Layout>` — Opinionated wrapper, renders full HTML document structure
- `<Html>` — The `<html>` element with lang and dir attributes
- `<Head>` — The `<head>` element, includes default meta tags for email
- `<Body>` — The `<body>` element with email-safe defaults
- `<Container>` — Centered fixed-width wrapper (default 37.5em or 600px)
- `<Section>` — Full-width content block with padding
- `<Row>` — Table row for multi-column layouts
- `<Column>` — Table cell inside a `<Row>`
- `<Overlap>` — Stacked/overlapping content sections (faux absolute)
- `<Heading>` — Heading element (h1-h6) via `level` prop
- `<Text>` — Paragraph or span text
- `<Link>` — Anchor element with email-safe defaults
- `<Button>` — Call-to-action button with bulletproof rendering
- `<Img>` — Image with dark mode and reduced motion variants
- `<Divider>` — Horizontal rule / visual separator
- `<Spacer>` — Vertical or horizontal spacing
- `<Preheader>` — Hidden preview text shown in inbox list view
- `<CodeBlock>` — Syntax-highlighted code block
- `<CodeInline>` — Inline code snippet
- `<Markdown>` — Renders Markdown content
- `<WithUrl>` — Rewrites URLs in children — prepend base URL or append query params (UTM tracking)
- `<NoWidows>` — Replaces last space with `&nbsp;` to prevent orphaned words
- `<Outlook>` — Wraps content in Outlook conditional comments (shows only in Outlook)
- `<NotOutlook>` — Hides content from Outlook
- `<Vml>` — VML markup for Outlook-specific rendering (background images)

---

## Layout

Root component for email templates. Renders full HTML document: `<html>`, `<head>`, `<body>`.

Includes by default:
- Tailwind CSS via `@import "@maizzle/tailwindcss"` in a `<style>` tag
- Email-safe meta tags (viewport, format-detection, color-scheme)
- Outlook VML namespaces and MSO font reset
- Inter font from Google Fonts
- Accessible `<div role="article">` inner wrapper

Props:
- `bodyClass` (String, default: `''`) — classes added to `<body>`
- `lang` (String, default: `'en'`) — sets `lang` and `xml:lang` on `<html>` and `<body>`
- `dir` (`'ltr'` | `'rtl'`, default: `'ltr'`) — text direction
- `ariaLabel` (String, optional) — `aria-label` on the inner `<div role="article">`

Usage:

```vue
<template>
  <Layout>
    <!-- email content -->
  </Layout>
</template>
```

With props:

```vue
<template>
  <Layout lang="ro" dir="ltr" aria-label="Order confirmation" body-class="bg-slate-100">
    <!-- email content -->
  </Layout>
</template>
```

Source template of `<Layout>`:

```xml
<html :lang="lang" :dir="dir" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office">
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <style>
        td,th,div,p,a,h1,h2,h3,h4,h5,h6 {font-family: "Segoe UI", sans-serif; mso-line-height-rule: exactly;}
        .mso-break-all {word-break: break-all;}
      </style>
      <![endif]-->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" media="screen">
    <style>
      @import "@maizzle/tailwindcss";

      img {
        @apply max-w-full align-middle;
      }
    </style>
  </head>
  <body :xml:lang="lang" :class="['m-0 p-0 size-full [word-break:break-word]', bodyClass]">
    <div
      role="article"
      aria-roledescription="email"
      :aria-label="ariaLabel"
      :lang="lang"
      :dir="dir"
      style="font-size: medium;"
      :class="['[font-size:max(16px,1rem)]', $attrs.class]"
    >
      <slot />
    </div>
  </body>
  </html>
```

---

## Html

The `<html>` element. Use when building the document structure manually (without `<Layout>`).

Renders `<html>` with `lang`, `dir`, and Outlook VML/Office XML namespaces by default. Provides `lang` to child `<Body>` component for `xml:lang`.

Props:
- `lang` (String, default: `'en'`) — language code for the `lang` attribute. Accepts any ISO 639-1 code.
- `dir` (`'ltr'` | `'rtl'`, default: `'ltr'`) — text direction
- `xmlns` (Boolean | String, default: `true`) — include VML and Office XML namespace declarations (`xmlns:v`, `xmlns:o`). Set to `false` to omit them.

Usage:

```vue
<template>
  <Html lang="ro" dir="ltr">
    <Head>
      <style>
        @import "@maizzle/tailwindcss";
      </style>
    </Head>
    <Body>
      <!-- email content -->
    </Body>
  </Html>
</template>
```

---

## Head

The `<head>` element with email-safe defaults. Includes `charset`, Apple reformatting prevention, and viewport meta tags automatically.

Props:
- `double` (Boolean | String, default: `false`) — renders an empty `<head></head>` before the real one. Workaround for Yahoo! Mail on Android, which strips styles from the first `<head>` element.

Usage:

```vue
<template>
    <Head>
      <style>
        @import "@maizzle/tailwindcss";
      </style>
    </Head>
</template>
```

With the Yahoo! Mail workaround:

```vue
<template>
    <Head :double="true">
      <style>
        @import "@maizzle/tailwindcss";
      </style>
    </Head>
</template>
```

---

## Body

The `<body>` element with email-safe defaults. Wraps slot content in an accessible `<div role="article">` wrapper.

Props:
- `xmlLang` (String, optional) — override `xml:lang` on `<body>`. If not set, inherits from parent `<Html>` component's `lang` prop.
- `dir` (`'ltr'` | `'rtl'`, default: `'ltr'`) — text direction
- `ariaLabel` (String, optional) — `aria-label` on the inner `<div role="article">`

Usage:

```vue
<template>
    <Html lang="fr">
      <Head>
        <style>@import "@maizzle/tailwindcss";</style>
      </Head>
      <Body aria-label="Order confirmation" class="bg-slate-50">
        <!-- email content -->
      </Body>
    </Html>
</template>
```

---

## Container

Centered fixed-width wrapper. Renders a `<div>` with `max-width` and `margin: 0 auto`, wrapped in an MSO conditional table for Outlook support.

Provides its width to child `<Row>` and `<Column>` components for automatic column width calculation.

Props:
- `width` (String | Number, default: `'37.5em'`) — max width of the container. Applied as `max-width` on the div and `width` on the MSO table.

Usage:

```vue
<Container>
  <!-- 37.5 (600px) centered content -->
</Container>

<Container width="700px">
  <!-- wider container -->
</Container>

<Container :width="552">
  <!-- numeric width, treated as pixels -->
</Container>
```

---

## Section

Full-width content block. Renders a `<div>` wrapped in an MSO conditional table for Outlook.

Props:
- `width` (String | Number, default: `'100%'`) — applied as `max-width` on the div and `width` on the MSO table
- `msoStyle` (String, optional) — inline CSS applied only to the MSO `<td>` element, for Outlook-specific styling

Usage:

```vue
<Section class="px-6 py-4 bg-white">
  <Heading level="1">Hello</Heading>
  <Text>Content here</Text>
</Section>

<Section width="480px" mso-style="padding: 10px 20px">
  <!-- narrower section with Outlook-specific padding -->
</Section>
```

---

## Row

Table row for multi-column layouts. Wraps children in an MSO table row for Outlook. Auto-detects the number of child `<Column>` components and provides width calculations to them.

Props:
- `width` (String | Number, optional) — override the inherited container width used for column width calculation. Defaults to parent `<Container>` width.
- `cols` (Number, optional) — override the auto-detected column count. Useful with `v-if` or `v-for` where auto-detection may not match the rendered output.

---

## Column

Table cell inside a `<Row>`. Renders as `display: inline-block` with auto-calculated `min-width` based on the parent `<Row>` width divided by the column count. Falls back to `18.75em` (300px) if no parent context.

Provides its own width as container width for nested `<Row>` components.

Props:
- `width` (String | Number, optional) — override the auto-computed column width
- `msoStyle` (String, optional) — inline CSS applied only to the MSO `<td>` element

Usage:

```vue
<template>
    <!-- Two equal columns (auto-calculated) -->
    <Row>
      <Column class="p-4">Left</Column>
      <Column class="p-4">Right</Column>
    </Row>
    
    <!-- Three columns with explicit count for v-for -->
    <Row :cols="items.length">
      <Column v-for="item in items" class="p-2">
        {{ item }}
      </Column>
    </Row>
    
    <!-- Custom column widths -->
    <Row>
      <Column width="200px" class="p-4">Sidebar</Column>
      <Column width="400px" class="p-4">Main</Column>
    </Row>
    
    <!-- Responsive column widths on mobile -->
    <Row>
      <Column class="sm:min-w-3/4">Left</Column>
      <Column class="sm:min-w-1/4">Right</Column>
    </Row>
    
    <!-- Full width stacking on mobile -->
    <Row>
      <Column class="sm:block">Left</Column>
      <Column class="sm:block">Right</Column>
    </Row>
    
    <!-- Center a stacked column on mobile -->
    <Row class="sm:text-center">
      <Column class="sm:text-left">Left</Column>
      <Column class="sm:text-center">Right</Column>
    </Row>
</template>
```

---

## Overlap

Stacked/overlapping content sections (faux absolute positioning). Places overlay content on top of a background layer using a `position: relative` table trick, with VML fallback for Outlook.

Two slots:
- **default** — background layer content (constrained by `height`)
- **overlay** — content rendered on top of the background

Props:
- `height` (String | Number, **required**) — max height of the background layer
- `width` (String | Number, optional) — width of the overlay table and VML rectangle. Inherits from parent `<Container>` width if not set.
- `msoHeight` (String | Number, optional) — override VML rectangle height for Outlook. Defaults to `height`.
- `msoInset` (String, default: `'0,-60px,0,0'`) — VML textbox inset (`top,right,bottom,left`). Use negative values to shift overlay content upward.

Usage:

```vue
<template>
  <!-- width inherited from Container -->
  <Container>
    <Overlap height="200px">
      <Img src="/banner.jpg" alt="Banner" />

      <template #overlay>
        <Img src="/avatar.png" alt="Avatar" width="80" />
      </template>
    </Overlap>
  </Container>

  <!-- explicit width -->
  <Overlap height="200px" width="400px">
    <Img src="/banner.jpg" alt="Banner" />

    <template #overlay>
      <Img src="/avatar.png" alt="Avatar" width="80" />
    </template>
  </Overlap>

  <!-- responsive -->
  <Overlap height="200px" class="sm:max-h-10">
    <Img width="552" src="/banner.jpg" alt="Banner" />

    <template #overlay>
        <Section class="text-center mb-40 sm:mb-10">
        <Img src="/logo.png" alt="Avatar" width="80" />
        </Section>
    </template>
    </Overlap>
</template>
```

---

## Heading

Heading element (h1-h6). Resets margin to 0 by default.

Props:
- `level` (String | Number, default: `1`) — heading level, 1-6

Usage:

```vue
<template>
  <Heading>Default h1</Heading>
  <Heading level="2" class="text-xl font-semibold text-slate-800">Subheading</Heading>
  <Heading :level="3" class="text-lg">Section title</Heading>
</template>
```

---

## Text

Paragraph or inline text. Renders `<p>` by default with `m-0 my-4 text-base`, or `<span>` with `text-base`.

Props:
- `as` (`'p'` | `'span'`, default: `'p'`) — HTML element to render

Usage:

```vue
<template>
  <Text>Default paragraph with vertical margin.</Text>
  <Text class="text-gray-600 text-sm">Styled paragraph with <Text as="span" class="font-bold">inline text.</Text>.</Text>
</template>
```

---

## Link

Anchor element. Resets to `no-underline` by default.

Props:
- `href` (String, **required**) — URL the link points to

Usage:

```vue
<template>
  <Link href="https://maizzle.com">Maizzle</Link>
  <Link href="https://example.com" class="text-blue-600 underline">Styled link</Link>
</template>
```

---

## Button

Call-to-action button with bulletproof Outlook rendering. Renders an `<a>` tag styled as a button, with MSO spacer elements for consistent padding in old Outlooks that use the Word rendering engine.

Props:
- `href` (String, **required**) — URL the button links to
- `variant` (`'solid'` | `'outline'` | `'ghost'` | `'link'`, default: `'solid'`) — button style
- `align` (`'left'` | `'center'` | `'right'`, optional) — horizontal alignment of the button wrapper
- `bgColor` (String, default: `'#4338ca'`) — background color for `solid`, border color for `outline`, text color fallback for `outline`/`ghost`
- `color` (String, optional) — explicit text color. Defaults to `#fffffe` for `solid`, `bgColor` for others.
- `msoPt` (String, default: `'16px'`) — `mso-text-raise` for text vertical alignment in Outlook
- `msoPb` (String, default: `'31px'`) — `mso-text-raise` for bottom spacer in Outlook
- `icon` (String, optional) — URL or path to an icon image
- `iconWidth` (String | Number, default: `12`) — icon width in pixels
- `iconPosition` (`'left'` | `'right'`, default: `'right'`) — icon placement relative to label
- `iconClass` (String, default: `''`) — classes on the icon `<img>`

Usage:

```vue
<template>
  <Button href="https://example.com">Get started</Button>

  <Button href="https://example.com" variant="outline" bg-color="#facade" align="center">
    Outline centered
  </Button>

  <Button href="https://example.com" variant="ghost">Ghost</Button>

<Button href="https://example.com" variant="link" color="#0ea5e9">Plain link</Button>

  <Button href="https://example.com" icon="/arrow-right.png" icon-width="14">
    With icon
  </Button>

  <Button href="https://example.com" icon="/arrow-left.png" icon-position="left">
    Icon on left
  </Button>

  <!-- Override default styles with Tailwind classes -->
  <Button href="https://example.com" class="rounded-full px-8 py-3 text-sm font-semibold">
    Pill button
  </Button>
</template>
```

---

## Img

Image with optional dark mode and reduced motion variants. Renders a plain `<img>` by default, or wraps in `<picture>` when `darkSrc` or `motionSrc` is provided. Sets `max-width: 100%; vertical-align: middle;` by default (responsive and no bottom gap).

Props:
- `src` (String, **required**) — image source URL. When `motionSrc` is used, this becomes the static fallback.
- `alt` (String, default: `''`) — alt text
- `width` (String | Number, **required**) — rendered as unitless `width` attribute
- `darkSrc` (String, optional) — alternative image for dark mode via `prefers-color-scheme: dark`
- `motionSrc` (String, optional) — animated image shown when user has no reduced motion preference. MIME type is auto-detected from the file extension.

Usage:

```vue
<template>
  <Img src="/logo.png" alt="Logo" width="70" />

  <!-- Dark mode variant -->
  <Img src="/logo.png" dark-src="/logo-dark.png" alt="Logo" width="70" />

  <!-- src is the static fallback, motionSrc is the animated version -->
  <Img src="/hero.png" motion-src="/hero.gif" alt="Hero" width="600" />

  <!-- All variants with Tailwind styling -->
  <Img
    alt="Logo"
    width="120"
    src="/logo.png"
    dark-src="/logo-dark.png"
    motion-src="/logo-animated.gif"
    class="rounded-lg shadow-sm sm:w-full"
  />
</template>
```

---

## Divider

Horizontal rule / visual separator. Renders a `<div role="separator">` with configurable thickness, color, and spacing.

Defaults to 1px height, `#cbd5e1` color, and 24px vertical margin. Color falls back to the `color` prop, then any Tailwind `bg-*` class, then `#cbd5e1`.

Props:
- `height` (String | Number, default: `'1px'`) — thickness of the divider line
- `color` (String, optional) — background color. Ignored if a `bg-*` class is used.
- `spaceY` (String | Number, default: `'24px'`) — vertical margin above and below
- `spaceX` (String | Number, optional) — horizontal margin on both sides
- `top` (String | Number, optional) — margin above, overrides `spaceY`
- `bottom` (String | Number, optional) — margin below, overrides `spaceY`
- `left` (String | Number, optional) — margin left, overrides `spaceX`
- `right` (String | Number, optional) — margin right, overrides `spaceX`

Usage:

```vue
<template>
  <Divider />

  <Divider height="2px" color="#e2e8f0" />

  <Divider class="bg-indigo-500" space-y="32px" />

  <Divider :space-y="0" space-x="24px" />

  <Divider top="16px" bottom="32px" />
</template>
```

---

## Spacer

Vertical or horizontal spacing. Vertical spacers render an invisible `<div>` with `line-height`. Horizontal spacers render an `<i>` with em-space characters and `mso-font-width` for accurate Outlook sizing.

Props:
- `type` (`'vertical'` | `'horizontal'`, default: `'vertical'`) — spacer direction
- `height` (String | Number, optional) — height for vertical spacers. Without it, the spacer collapses to a zero-width joiner (useful as a line break).
- `width` (String | Number, default: `16`) — width for horizontal spacers, in pixels
- `msoHeight` (String | Number, optional) — alternative height for Outlook via `mso-line-height-alt`

Usage:

```vue
<template>
  <!-- Vertical spacing -->
  <Spacer height="32px" />

  <!-- Vertical with different Outlook height -->
  <Spacer height="40px" mso-height="32px" />

  <!-- Horizontal spacing between inline elements -->
  <Text as="span">Left</Text>
  <Spacer type="horizontal" :width="24" />
  <Text as="span">Right</Text>

  <!-- Responsive vertical spacing -->
  <Spacer height="48px" class="sm:leading-6" />
</template>
```

---

## Preheader

Hidden preview text shown in inbox list views. Teleported to the start of `<body>` so it's the first text email clients read. Followed by filler characters that prevent email clients from pulling in other text after the preheader.

Props:
- `fillerCount` (Number, default: `150`) — number of `&#8199;&#847;` filler pairs to render
- `shyCount` (Number, default: `150`) — number of `&shy;` entities to render

Usage:

```vue
<template>
  <Layout>
    <Preheader>Your order has been confirmed and is on its way!</Preheader>
    <!-- rest of email -->
  </Layout>
</template>
```

---

## CodeBlock

Syntax-highlighted code block using Shiki. Wrapped in a table for Outlook compatibility. Code can be passed via the `code` prop or as slot content.

Props:
- `code` (String, default: `''`) — code to highlight. Falls back to slot content.
- `language` (String, default: `'html'`) — language for syntax highlighting (any Shiki-supported language)
- `theme` (String, default: `'github-light'`) — Shiki theme
- `tdClass` (String, default: `'max-w-0 mso-padding-alt-4'`) — classes on the wrapping table cell

Usage:

```vue
<template>
  <CodeBlock language="js" code="const name = 'Maizzle'" />

  <CodeBlock theme="github-dark" class="text-sm rounded-lg">
    <div class="text-center">Hello</div>
  </CodeBlock>
</template>
```

---

## CodeInline

Inline code snippet. Renders a `<code>` element with a light gray background and border. Code is HTML-escaped automatically.

Props:
- `code` (String, default: `''`) — code text. Falls back to slot content.

Usage:

```vue
<template>
  <Text>Use the <CodeInline code="render()" /> function to compile templates.</Text>

  <Text>Install with <CodeInline>npm install @maizzle/framework</CodeInline>.</Text>
</template>
```

---

## Markdown

Renders Markdown content using `markdown-exit` with Shiki syntax highlighting for fenced code blocks. Content can come from a `content` prop, a `src` file path, or slot content.

Props:
- `content` (String, default: `''`) — Markdown string. Overrides slot content.
- `src` (String, default: `''`) — path to a Markdown file, resolved at build time
- `shikiTheme` (String, default: `'github-dark-high-contrast'`) — Shiki theme for fenced code blocks
- `wrapper` (Boolean, default: `false`) — wrap output in a `<div>` element
- `config` (Object, optional) — `markdown-exit` configuration options, merged with defaults

Usage:

```vue
<template>
  <!-- Inline Markdown -->
  <Markdown>
    ## Welcome

    This is a **bold** statement with a [link](https://maizzle.com).
  </Markdown>

  <!-- From a file -->
  <Markdown src="./content/welcome.md" />

  <!-- With wrapper and styling -->
  <Markdown wrapper class="text-gray-700 text-sm" content="**Hello** from Markdown" />
</template>
```

With `@maizzle/tailwindcss/prose` for typographic defaults (opt-in, must be imported):

```vue
<template>
  <Html>
      <Head>
        <style>
          @import "@maizzle/tailwindcss";
          @import "@maizzle/tailwindcss/prose";
        </style>
      </Head>
      <Body>
          <Markdown wrapper class="prose">
            ## Welcome
      
            This is a **bold** statement with a [link](https://maizzle.com).
          </Markdown>
      </Body>
  </Html>
</template>
```

---

## WithUrl

Rewrites URL attributes in all child elements. Prepends a base URL to relative paths and/or appends query parameters. Works on both HTML elements and Vue component props.

Handles: `href`, `src`, `srcset`, `poster`, `data` on `a`, `img`, `video`, `source`, `link`, `script`, `object`, `embed`, `iframe`, `v:image`, `v:fill`. Skips absolute URLs, data URIs, protocol-relative URLs, and fragment links.

Props:
- `base` (String, optional) — base URL prepended to all relative URLs. Slash normalization is handled automatically.
- `parameters` (String, optional) — query string appended to all URLs, e.g. `"utm_source=foo&bar=baz"`

Usage:

```vue
<template>
  <!-- Base URL for all images -->
  <WithUrl base="https://cdn.example.com/emails/">
    <Img src="/logo.png" alt="Logo" width="70" />
    <Img src="/banner.jpg" alt="Banner" width="600" />
  </WithUrl>

  <!-- UTM tracking on links -->
  <WithUrl parameters="utm_source=newsletter&utm_medium=email">
    <Button href="https://example.com/pricing">View pricing</Button>
    <Link href="https://example.com/docs">Documentation</Link>
  </WithUrl>

  <!-- Both base URL and query parameters -->
  <WithUrl base="https://cdn.example.com/" parameters="v=2">
    <Img src="/hero.png" alt="Hero" width="600" />
    <Link href="https://example.com">Visit</Link>
  </WithUrl>
</template>
```

---

## NoWidows

Replaces the last space with `&nbsp;` in text nodes to prevent orphaned words (widows). Recursively walks all child elements. Skips template expressions (`{{ }}`, `{% %}`, `<%= %>`, etc.).

Props:
- `minWords` (String | Number, default: `4`) — minimum word count for widow prevention to apply. Text with fewer words is left unchanged.

Usage:

```vue
<template>
  <NoWidows>
    <Heading>This heading will not have widows</Heading>
    <Text>This paragraph also gets widow prevention applied to it.</Text>
  </NoWidows>

  <!-- Higher threshold -->
  <NoWidows :min-words="6">
    <Text>Short text is left alone.</Text>
    <Text>But this longer sentence will have its last space replaced.</Text>
  </NoWidows>
</template>
```

---

## Outlook

Wraps content in Outlook conditional comments. Without props, targets all MSO versions (`<!--[if mso]>`). Use props to target specific versions.

Supported Outlook versions: `2003`, `2007`, `2010`, `2013`, `2016`, `2019`.

Props:
- `only` (String, optional) — comma-separated years. Shows content only in those versions.
- `not` (String, optional) — comma-separated years. Shows content in all versions except those.
- `lt` (String, optional) — versions lower than the specified year
- `lte` (String, optional) — versions lower than or equal to
- `gt` (String, optional) — versions greater than
- `gte` (String, optional) — versions greater than or equal to

Usage:

```vue
<template>
  <!-- All Outlook versions -->
  <Outlook>
    <p>Outlook only content</p>
  </Outlook>

  <!-- Specific versions -->
  <Outlook only="2013,2016">
    <p>Only Outlook 2013 and 2016</p>
  </Outlook>

  <!-- Exclude versions -->
  <Outlook not="2007">
    <p>All Outlook except 2007</p>
  </Outlook>

  <!-- Version ranges -->
  <Outlook gte="2013">
    <p>Outlook 2013 and newer</p>
  </Outlook>

  <Outlook lt="2013">
    <p>Older than Outlook 2013</p>
  </Outlook>
</template>
```

---

## NotOutlook

Hides content from all Outlook versions. Wraps in `<!--[if !mso]><!-->...<!--<![endif]-->`.

No props.

Usage:

```vue
<template>
  <NotOutlook>
    <Img src="/webp-hero.webp" alt="Hero" width="600" />
  </NotOutlook>
  <Outlook>
    <Img src="/hero-fallback.png" alt="Hero" width="600" />
  </Outlook>
</template>
```

---

## Vml

VML markup for Outlook-specific rendering, primarily used for background images in Outlook (which doesn't support CSS `background-image`). Wraps slot content in a `v:rect` with a `v:fill` and `v:textbox`.

Props:
- `width` (String | Number, default: `'600px'`) — width of the VML rectangle
- `height` (String | Number, optional) — height. Auto-sizes to content if not set.
- `src` (String, default: `'https://via.placeholder.com/600x400'`) — background image URL
- `type` (`'frame'` | `'tile'` | `'pattern'` | `'solid'` | `'gradient'` | `'gradientradial'`, default: `'frame'`) — VML fill type
- `backgroundPosition` (String, optional) — `'vertical,horizontal'` e.g. `'top,center'`. Convenience prop that maps to VML `origin` and `position`.
- `origin` (String, optional) — fill origin offset as comma-separated fractions. Overridden by `backgroundPosition`.
- `position` (String, optional) — fill position offset as comma-separated fractions. Overridden by `backgroundPosition`.
- `sizes` (String, optional) — fill image dimensions, e.g. `'300px,200px'`
- `aspect` (`'atleast'` | `'atmost'`, optional) — aspect ratio constraint
- `color` (String, optional) — fill color for `solid`/`gradient` types
- `fillcolor` (String, default: `'none'`) — rectangle background color (fallback when image fails)
- `fill` (Boolean | String, default: `true`) — whether the rectangle has a fill
- `stroke` (Boolean | String, default: `false`) — whether the rectangle has a border
- `strokecolor` (String, optional) — border color (also enables stroke)
- `inset` (String, default: `'0,0,0,0'`) — textbox padding as `top,right,bottom,left`

Usage:

```vue
<template>
  <!-- Background image for Outlook -->
  <Section class="bg-[url('/hero.jpg')] bg-cover bg-center">
    <Vml src="/hero.jpg" width="600px" height="400px" background-position="center,center">
      <Container>
        <Heading class="text-white text-3xl">Hello</Heading>
      </Container>
    </Vml>
  </Section>

  <!-- With fallback color -->
  <Vml src="/pattern.png" width="600px" type="tile" fillcolor="#1e293b">
    <Text class="text-white">Content over tiled background</Text>
  </Vml>
</template>
```
