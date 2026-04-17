# Maizzle Transformers Reference

Transformers post-process rendered HTML. They run automatically when `useTransformers` is `true` (default). Each transformer is controlled by its config option — most are opt-in (`false` by default), some are always-on.

Pipeline order matters: CSS is compiled first, then inlined, then purged, then HTML is formatted/minified last.

---

## Pipeline Order

1. Inline Link — inlines `<link>` stylesheets into `<style>` tags
2. Tailwind CSS — compile styles, lower modern CSS
3. Safe Class Names — rename email-unsafe selectors
4. Attribute to Style — convert HTML attributes to inline CSS
5. Inline CSS — inline `<style>` into elements
6. Remove Attributes — strip specified attributes
7. Shorthand CSS — merge longhand to shorthand
8. Six-Digit HEX — expand 3-digit HEX colors
9. Add Attributes — add default attributes to elements
10. Filters — apply text transformation filters
11. Base URL — prepend base URL to relative paths
12. URL Query — append query parameters to URLs
13. Purge CSS — remove unused CSS
14. Entities — convert Unicode to HTML entities
15. Replace Strings — regex-based string replacements
16. Format — pretty-print HTML
17. Minify — minify HTML

---

## Inline Link

Replaces `<link rel="stylesheet">` tags with inlined `<style>` tags. Always runs — no config option.

- Local file paths: always inlined, resolved relative to template directory
- Remote URLs (http/https): only inlined if the `<link>` has an `inline` attribute

```html
<!-- local: always inlined -->
<link rel="stylesheet" href="./styles.css">

<!-- remote: only with `inline` attribute -->
<link rel="stylesheet" href="https://example.com/styles.css" inline>
```

---

## Tailwind CSS

Compiles Tailwind CSS in `<style>` tags, lowers modern CSS syntax (nesting, oklch, color-mix, @property), and optimizes output.

Config: `css.base`, `css.exclude`

Behavior:
- Processes all `<style>` tags except those with `raw`, `embed`, or `data-embed` attributes
- `raw` attribute: skips processing but removes the attribute
- `embed`/`data-embed`: preserved for the CSS inliner
- Builds `@source` directives from all class attributes in the rendered HTML
- Lowers CSS to maximum email client compatibility (lightningcss with IE 1 target)
- Runs PostCSS plugins for custom properties, calc(), var() pruning
- Merges duplicate media queries

---

## Safe Class Names

Replaces unsafe characters in CSS selectors and class attributes for email client compatibility.

Config: `css.safe` (default: `true`)

- `true` — use default replacements
- `false` — disable
- `Record<string, string>` — custom replacements merged with defaults

Default replacements (key characters): `:` → `-`, `/` → `-`, `%` → `pc`, `.` → `_`, `!` → `-i`, `&` → `and-`, `@` → `at-`, `[`, `]`, `(`, `)`, `{`, `}` → removed.

---

## Attribute to Style

Converts HTML attributes to inline CSS styles.

Config: `css.inline.attributeToStyle` (default: `false`)

- `true` — process all supported attributes
- `string[]` — process only specified attributes

Supported attributes:
- `width` → `width: ${value}px` (auto-detects unit)
- `height` → `height: ${value}px`
- `bgcolor` → `background-color: ${value}`
- `background` → `background-image: url('${value}')`
- `align` → `text-align` (or `float`/`margin` on tables)
- `valign` → `vertical-align: ${value}`

---

## Inline CSS

Inlines CSS from `<style>` tags into element `style` attributes using the Juice library.

Config: `css.inline` (default: `false`)

- `true` — enable with defaults
- Object — Juice options plus Maizzle-specific extensions

Maizzle-specific options (on the `css.inline` object):

- `preferUnitlessValues` (Boolean, default: `true`) — convert `0px` → `0`
- `safelist` (String[]) — CSS selectors to preserve in `<style>` tags
- `customCSS` (String) — additional CSS to inline alongside `<style>` contents
- `styleToAttribute` (Record) — duplicate CSS properties to HTML attributes (e.g. `{ 'background-color': 'bgcolor' }`)
- `widthElements` (String[], default: `['img', 'video']`) — elements that receive `width` HTML attributes
- `heightElements` (String[], default: `['img', 'video']`) — elements that receive `height` HTML attributes
- `excludedProperties` (String[], default: `['--tw-shadow']`) — CSS properties to exclude from inlining
- `codeBlocks` (Record, default: `{ EJS: {...}, HBS: {...} }`) — template syntax blocks to preserve

Juice options passed through:

- `removeStyleTags` (Boolean, default: `false`)
- `removeInlinedSelectors` (Boolean, default: `true`)
- `applyWidthAttributes` (Boolean, default: `true`)
- `applyHeightAttributes` (Boolean, default: `true`)
- `inlineDuplicateProperties` (Boolean, default: `true`)

---

## Remove Attributes

Removes specified HTML attributes from elements.

Config: `html.attributes.remove` (default: `[]`)

Always removes empty `style` and empty `class` attributes regardless of config.

Accepts an array of:
- `string` — remove attribute when empty
- `{ name: string, value: string }` — remove when value matches exactly
- `{ name: string, value: RegExp }` — remove when value matches regex

```ts
html: {
  attributes: {
    remove: ['data-src', { name: 'id', value: 'test' }, { name: 'data-id', value: /\d/ }],
  },
}
```

---

## Shorthand CSS

Rewrites longhand CSS in `style` attributes to shorthand.

Config: `css.shorthand` (default: `false`)

- `true` — apply to all elements
- `{ tags: string[] }` — apply only to specified tags

Example: `margin-top: 4px; margin-right: 2px; margin-bottom: 4px; margin-left: 2px` → `margin: 4px 2px`

Uses `postcss-merge-longhand` internally.

---

## Six-Digit HEX

Converts 3-digit HEX color codes to 6-digit for email client compatibility.

Config: `css.sixHex` (default: `true`)

Applies to `bgcolor` and `color` HTML attributes only. Example: `#fff` → `#ffffff`.

---

## Add Attributes

Automatically adds attributes to HTML elements based on CSS selectors.

Config: `html.attributes.add` (default: `{ table: { cellpadding: 0, cellspacing: 0, role: 'none' }, img: { alt: '' } }`)

Set to `false` to disable entirely.

Selector support: tag (`div`), class (`.name`), ID (`#id`), attribute (`[attr]`, `[attr=value]`), tag+attribute (`div[role=alert]`), comma-separated (`div, p`).

`class` attributes are merged (deduplicated). Other attributes are only added if not already present.

```ts
html: {
  attributes: {
    add: {
      table: { cellpadding: 0, cellspacing: 0, role: 'none' },
      img: { alt: '' },
      '.cta': { role: 'button' },
    },
  },
}
```

---

## Filters

Text transformation functions applied to element content via custom HTML attributes.

Config: `filters` (default: built-in set)

- `false` — disable all filters
- `Record<string, FilterFunction>` — custom filters merged with built-in defaults

Processes elements bottom-up (children before parents). Multiple filters on same element execute in attribute order.

Built-in filters (31):

**String**: `append`, `prepend`, `uppercase`, `lowercase`, `capitalize`, `trim`, `lstrip`, `rstrip`, `escape`, `escape-once`, `remove`, `remove-first`, `replace`, `replace-first`, `size`

**Math**: `ceil`, `floor`, `round`, `plus`, `minus`, `multiply`, `times`, `divide`, `divide-by`, `modulo`

**Text**: `slice`, `truncate`, `truncate-words`, `newline-to-br`, `strip-newlines`

**URL**: `url-encode`, `url-decode`

```html
<span uppercase>hello</span>              <!-- HELLO -->
<span truncate="5,…">hello world</span>   <!-- hello… -->
<span append=", world">hello</span>       <!-- hello, world -->
```

---

## Base URL

Prepends a base URL to relative paths in HTML attributes and CSS.

Config: `url.base` (default: undefined)

- `string` — base URL applied to all default tags
- Object for fine-grained control:
  - `url` (String) — the base URL
  - `tags` (String[] | Record) — tags or tag-attribute map to process
  - `attributes` (Record) — custom attribute → base URL map
  - `styleTag` (Boolean, default: `true`) — process URLs in `<style>` tags
  - `inlineCss` (Boolean, default: `true`) — process URLs in inline styles

Default tags processed: `a[href]`, `img[src, srcset]`, `video[src, poster]`, `source[src, srcset]`, `track[src]`.

Also rewrites VML elements (`v:image`, `v:fill`) and URLs inside MSO conditional comments.

---

## URL Query

Appends query parameters to URLs.

Config: `url.query` (default: undefined)

Non-`_options` keys are the URL parameters. The `_options` key controls behavior:

- `tags` (String[], default: `['a']`) — CSS selectors for elements to process
- `attributes` (String[], default: `['src', 'href', 'poster', 'srcset', 'background']`) — attributes containing URLs
- `strict` (Boolean, default: `true`) — only append to absolute URLs
- `qs` (Object, default: `{ encode: false }`) — query-string library options

```ts
url: {
  query: {
    utm_source: 'maizzle',
    utm_medium: 'email',
    _options: { tags: ['a', 'img'], strict: false },
  },
}
```

---

## Purge CSS

Removes unused CSS using the email-comb library.

Config: `css.purge` (default: `false`)

Two passes:
1. **Deep purge**: removes CSS rules without matching selectors in the DOM (skips rules inside @media/@keyframes)
2. **email-comb**: cleans orphaned classes and IDs

Preserves pseudo-elements (`::before`) and functional pseudos (`:not()`, `:is()`, `:where()`, `:has()`).

Options:
- `safelist` (String[]) — patterns to preserve, appended to built-in email client safelist

Built-in safelist includes patterns for: Gmail (`*body*`, `.gmail*`), Apple Mail (`.apple*`, `.ios*`), Outlook (`.outlook*`), Open-Xchange (`.ox-*`), Thunderbird (`.moz-text-html`), and others.

Also removes `data-embed`/`embed` attributes after purging.

---

## Entities

Converts Unicode characters to HTML entities for email client compatibility.

Config: `html.decodeEntities` (default: `true`)

- `true` — use default character map
- `Record<string, string>` — custom map merged with defaults

Key default mappings: `\u00A0` → `&nbsp;`, `\u200D` → `&zwj;`, `\u00AD` → `&shy;`, `\u2014` → `&mdash;`, `\u201C`/`\u201D` → `&ldquo;`/`&rdquo;`, and 16 more.

---

## Replace Strings

Regex-based find-and-replace on the final HTML string.

Config: `replaceStrings` (default: undefined)

Keys are treated as regex patterns (case-insensitive, global flag). Values are replacement strings.

```ts
replaceStrings: {
  '{{ year }}': new Date().getFullYear().toString(),
}
```

---

## Format

Pretty-prints the HTML output using oxfmt.

Config: `html.format` (default: `false`)

- `true` — enable with defaults
- Object — oxfmt FormatOptions merged on top of defaults

Defaults when enabled: `printWidth: 320`, `htmlWhitespaceSensitivity: 'ignore'`, `embeddedLanguageFormatting: 'off'`.

---

## Minify

Minifies HTML using the html-crush library.

Config: `html.minify` (default: `false`)

- `true` — enable with defaults
- Object — html-crush options merged on top of defaults

Default when enabled: `removeLineBreaks: true`.
