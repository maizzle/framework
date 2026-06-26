# Maizzle Transformers Reference
After Vue SSR renders a template, Maizzle pipes the HTML through a fixed sequence of transformers before writing the file. Order matters: CSS is compiled, inlined, then purged; HTML formatting/minification runs last.

Disable the whole pipeline with `useTransformers: false` (config or composable). Toggle individual transformers with `useTransformers: { inlineCss: false, minify: true }`. See `CONFIGURATION.md` for the full surface.

## Defaults
On by default: `css.inline`, `css.purge`, `css.shorthand`, `css.safe`, `css.preferUnitless`, `css.sixHex`, `html.decodeEntities`, `addAttributes` (table + img defaults).

Off by default: `html.minify`, `html.format`, `attributeToStyle`, `url.base`, `url.query`, `replaceStrings`, custom `filters`, custom `removeAttributes`.

## Pipeline Order
The DOM is parsed once, walked by all DOM-based transformers, then serialized; string-only transformers run last.

| # | Stage | Driven by | Default |
|---|---|---|---|
| 0 | Inline `<link>` stylesheets | always-on | — |
| 0.5 | `<Tailwind>` block compile | presence of component | — |
| 1 | Tailwind CSS compile + lower | always-on | — |
| 2 | Safe class names | `css.safe` | on |
| 3 | Attribute → style | `css.inline.attributeToStyle` | off |
| 4 | CSS inline (Juice) | `css.inline` | on |
| 4.5 | MSO placeholder resolution | always-on | — |
| 4.6 | Column min-width resolution | always-on | — |
| 5 | Remove attributes | `html.attributes.remove` | always strips empty `style`/`class` |
| 6 | Shorthand CSS | `css.shorthand` | on |
| 7 | Six-digit HEX | `css.sixHex` | on |
| 8 | Add attributes | `html.attributes.add` | on (table + img defaults) |
| 9 | Filters | `filters` | on (built-ins) |
| 10 | Base URL | `url.base` | off |
| 11 | URL query | `url.query` | off |
| 12 | Purge CSS | `css.purge` | on |
| 13 | Entities | `html.decodeEntities` | on |
| 14 | Replace strings | `replaceStrings` | off |
| 15 | Format | `html.format` | on (skipped when minify is on) |
| 16 | Minify | `html.minify` | off |

## Per-Transformer Notes
**Inline `<link>`** — local `href` paths are always inlined; remote URLs only when the `<link>` carries an `inline` attribute. `<style>` tags marked `raw`, `embed`, or `data-embed` are skipped (raw drops the marker; embed/data-embed are preserved for the inliner).

**Tailwind CSS** — compiles utilities found in the rendered DOM. Lowers modern CSS (nesting, `oklch`, `color-mix`, `@property`) via lightningcss with an IE 1 target so most clients render it. Merges duplicate `@media` queries. Honors `css.base` and `css.exclude`.

**Safe class names** — defaults rewrite `:` `/` `%` `.` `!` `&` `@` and remove brackets/braces from class names and selectors. Pass a `Record<string,string>` to extend; `false` to disable.

**Attribute to style** — `true` covers all supported attrs, `string[]` narrows it. Maps: `width`/`height` → px (auto-detected unit), `bgcolor` → `background-color`, `background` → `background-image: url(...)`, `align` → `text-align` (or `float`/`margin` on tables), `valign` → `vertical-align`.

**CSS inline (Juice)** — Maizzle adds: `preferUnitlessValues` (default `true`, e.g. `0px` → `0`), `safelist`, `customCSS`, `styleToAttribute`, `widthElements` (default `['img','video']`), `heightElements`, `excludedProperties` (default `['--tw-shadow']`), `codeBlocks` (EJS/HBS preserved). Juice keys passed through include `removeStyleTags`, `removeInlinedSelectors` (default `true`), `applyWidth/HeightAttributes`, `inlineDuplicateProperties` (default `false`). Per-element overrides: `data-juice-duplicates` keeps duplicate same-property declarations on that element (e.g. a `font-size` fallback alongside a modern value), `data-juice-important` toggles `!important` preservation.

**MSO placeholder resolution** — internal step that pins `<Container>`'s MSO `<table>` width and `msoStyle` from the inlined CSS once it's known.

**Column min-width resolution** — internal step that resolves each `<Column>`'s `min-width` (and matching MSO `<td>` width) from the nearest sized ancestor (`Container`/`Section`/`Row`/`Column` width) — see `PATTERNS.md`.

**Remove attributes** — array entries are `string` (remove when empty), `{ name, value: 'literal' }`, or `{ name, value: /regex/ }`. Empty `style`/`class` are stripped unconditionally.

**Shorthand CSS** — `postcss-merge-longhand` against inline `style` attrs. Pass `{ tags: ['table','td'] }` to scope it.

**Six-digit HEX** — `bgcolor`/`color` HTML attributes only (Outlook chokes on 3-digit hex in attributes).

**Add attributes** — selectors include tag (`div`), class (`.cta`), id (`#x`), attribute (`[role]`/`[role=alert]`), tag+attribute (`a[target=_blank]`), and comma lists. `class` merges with what's already there (deduped); other attrs only land if missing. Defaults: `table` → `cellpadding=0 cellspacing=0 role=none`; `img` → `alt=""`. Set the whole map / a selector / a single attribute to `false` to skip.

**Filters** — bottom-up walk; multiple filters on one element run in attribute order. 31 built-ins across string, math, text, and URL categories (see `CONFIGURATION.md` for the full list). Pass `false` to disable all; user filters merge on top.

**Base URL** — string form rewrites `a[href]`, `img[src,srcset]`, `video[src,poster]`, `source[src,srcset]`, `track[src]`, plus VML `v:image`/`v:fill` and URLs inside MSO conditional comments. Object form takes `url`, `tags`, `attributes`, `styleTag` (default `true`), `inlineCss` (default `true`).

**URL query** — non-`_options` keys are appended as query params. `_options.tags` (default `['a']`), `_options.attributes` (default `['src','href','poster','srcset','background']`), `_options.strict` (default `true` — absolute URLs only), `_options.qs` (default `{ encode: false }`).

**Purge CSS** — two passes: deep-purge removes rules whose selectors don't match anything in the DOM (skipping rules inside `@media`/`@keyframes`), then `email-comb` mops up orphan classes/IDs. Preserves pseudo-elements and functional pseudos (`:not()`, `:is()`, `:where()`, `:has()`). Built-in safelist covers Gmail/Apple/Outlook/Open-Xchange/Thunderbird; user `safelist[]` is appended. Strips trailing `data-embed`/`embed` markers afterwards.

**Entities** — defaults map ` ` → `&nbsp;`, `‍` → `&zwj;`, `­` → `&shy;`, `—` → `&mdash;`, curly quotes, bullets, and similar (~20 entries). Pass `Record<string,string>` to extend, `false` to disable.

**Replace strings** — keys are treated as case-insensitive global regex patterns (the `gi` flags are added internally). Escape character classes in keys (`\\s` for `\s`).

**Format** — `oxfmt` with defaults `printWidth: 320`, `htmlWhitespaceSensitivity: 'ignore'`, `embeddedLanguageFormatting: 'off'`. Auto-skipped when `html.minify` is on.

**Minify** — `html-crush` with `{ removeLineBreaks: true }` baseline. Use for production sends — Gmail clips at ~102 KB.
