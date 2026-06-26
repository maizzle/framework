# Patterns for coding emails

## Column layout
All examples assume `<Container class="max-w-xl">` (576px) as the wrapper.

Default `<Column>` behavior: `display: inline-block` with auto-calculated `min-width = container ÷ columns`. Columns sit side by side and stack when total width can't fit the parent. In Outlook, each Column is wrapped in an MSO `<td>` so classic Outlook renders side-by-side instead of stacking.

### Equal columns, stack on mobile
Default behavior — no width classes needed. Each column gets `min-width: 288px`. Side-by-side on desktop, stacks below ~576px.

```vue
<Row>
  <Column><Text>Left</Text></Column>
  <Column><Text>Right</Text></Column>
</Row>
```

### Content forces a column to break
If content is wider than the calculated `min-width`, the column grows and pushes siblings to the next line — even on desktop. Useful for "hero" columns that claim a full row when content demands.

```vue
<Row>
  <Column><Text>Short</Text></Column>
  <Column><Text>Short</Text></Column>
  <Column><Text>This text is too long to fit, so this column wraps to a new line.</Text></Column>
</Row>
```

### Percentage widths never stack
Tailwind fractional widths keep columns side-by-side regardless of viewport.

```vue
<Row>
  <Column class="w-1/3"><Text>1</Text></Column>
  <Column class="w-1/3"><Text>2</Text></Column>
  <Column class="w-1/3"><Text>3</Text></Column>
</Row>
```

### Percentage widths, mobile full width
`max-sm:min-w-full` overrides inline `min-width` below the `sm` breakpoint.

```vue
<Row>
  <Column class="w-1/3 max-sm:min-w-full"><Text>1</Text></Column>
  <Column class="w-1/3 max-sm:min-w-full"><Text>2</Text></Column>
  <Column class="w-1/3 max-sm:min-w-full"><Text>3</Text></Column>
</Row>
```

### Custom mobile widths
Mix widths per breakpoint.

```vue
<Row>
  <Column class="w-1/3 max-sm:w-1/2"><Text>1/3 desktop, 1/2 mobile</Text></Column>
  <Column class="w-1/3 max-sm:w-1/2"><Text>1/3 desktop, 1/2 mobile</Text></Column>
  <Column class="w-1/3 max-sm:min-w-full"><Text>1/3 desktop, full mobile</Text></Column>
</Row>
```

### Force equal height (no media query)
`display: table-cell` makes siblings physically match heights while keeping `inline-block` as the stacking default elsewhere. Outlook's MSO `<td>` is already a cell — equal-height is automatic there.

```vue
<Row>
  <Column class="max-w-1/2 table-cell"><Text>Short</Text></Column>
  <Column class="max-w-1/2 table-cell"><Text>This column is much taller. The shorter sibling fills its full height too.</Text></Column>
</Row>
```

### Reverse stack on mobile
CSS table-display modes reorder rows on mobile without rewriting markup. `table-header-group` → top, `table-footer-group` → bottom.

```vue
<Row class="max-sm:table max-sm:w-full">
  <Column class="max-w-1/3 max-sm:table-footer-group"><Text>3rd on mobile</Text></Column>
  <Column class="max-w-1/3 max-sm:table-footer-group"><Text>2nd on mobile</Text></Column>
  <Column class="max-w-1/3 max-sm:table-header-group"><Text>1st on mobile</Text></Column>
</Row>
```

### Mobile-first (stacked default, columns on desktop)
Row's `*:` child selector + `min-sm:` switches from stacked to horizontal at the `sm` breakpoint.

```vue
<Row class="*:w-full *:min-sm:w-1/3">
  <Column><Text>Column 1</Text></Column>
  <Column><Text>Column 2</Text></Column>
  <Column><Text>Column 3</Text></Column>
</Row>
```

### Gutters between columns
Don't put padding directly on `Column` — it adds to outer width and breaks the grid (content-box). Wrap inner content in a `Section` with `px-*` + `border-0` (so classic Outlook applies the padding to the div without needing `msoStyle`). Outlook gets weird with deep nesting — use sparingly.

```vue
<Row>
  <Column class="w-1/3"><Section class="px-2 border-0"><Text>1</Text></Section></Column>
  <Column class="w-1/3"><Section class="px-2 border-0"><Text>2</Text></Section></Column>
  <Column class="w-1/3"><Section class="px-2 border-0"><Text>3</Text></Section></Column>
</Row>
```

### Nested rows
A resolved Column acts as a width source for any nested Row inside it. The post-render transformer writes the resolved width back to `data-maizzle-cw`, so deeper rows divide the outer column's width.

```vue
<Container class="max-w-xl">
  <Row>
    <Column class="w-2/3 max-xs:w-full"><Text>Main 2/3</Text></Column>
    <Column class="w-1/3 max-xs:w-full">
      <Row>
        <Column class="w-1/2 max-xs:w-full"><Text>Nested 1</Text></Column>
        <Column class="w-1/2 max-xs:w-full"><Text>Nested 2</Text></Column>
      </Row>
    </Column>
  </Row>
</Container>
```
