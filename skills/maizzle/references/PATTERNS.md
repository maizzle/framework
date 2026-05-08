# Patterns for coding emails

## Column layout patterns

All examples assume `<Container class="max-w-xl">` (576px) as the wrapper.

Default Column behavior: `display: inline-block` with auto-calculated `min-width = container ÷ columns`. Columns sit side by side and stack when total width can't fit the parent. In Outlook, each Column is wrapped in an MSO `<td>` so classic Outlook renders side-by-side instead of stacking.

### Equal columns, stack naturally on mobile

Default behaviour — no width classes needed. Each column gets `min-width: 288px`. Side-by-side on desktop, stacks below ~576px.

```vue
<template>
  <Row>
    <Column>
      <Text>Left</Text>
    </Column>
    <Column>
      <Text>Right</Text>
    </Column>
  </Row>
</template>
```

### Content forces a column to break

If a column's content is wider than its calculated `min-width`, the column grows and pushes siblings to the next line — even on desktop. Useful for "hero" columns that claim a full row when their content demands it.

```vue
<template>
  <Row>
    <Column>
      <Text>Short</Text>
    </Column>
    <Column>
      <Text>Short</Text>
    </Column>
    <Column>
      <Text>This text is too long to fit, so this column wraps to a new line.</Text>
    </Column>
  </Row>
</template>
```

### Percentage widths never stack

Use Tailwind fractional width utilities when you don't want columns stacking automatically.

```vue
<template>
  <Row>
    <Column class="w-1/3">
      <Text>1</Text>
    </Column>
    <Column class="w-1/3">
      <Text>2</Text>
    </Column>
    <Column class="w-1/3">
      <Text>3</Text>
    </Column>
  </Row>
</template>
```

### Percentage widths, mobile full width

Reset the column to full width below the `sm` breakpoint. `max-sm:min-w-full` overrides the inline `min-width` on small screens.

```vue
<template>
  <Row>
    <Column class="w-1/3 max-sm:min-w-full">
      <Text>1</Text>
    </Column>
    <Column class="w-1/3 max-sm:min-w-full">
      <Text>2</Text>
    </Column>
    <Column class="w-1/3 max-sm:min-w-full">
      <Text>3</Text>
    </Column>
  </Row>
</template>
```

### Custom mobile widths

Mix widths per breakpoint.

```vue
<template>
  <Row>
    <Column class="w-1/3 max-sm:w-1/2">
      <Text>1/3 desktop, 1/2 mobile</Text>
    </Column>
    <Column class="w-1/3 max-sm:w-1/2">
      <Text>1/3 desktop, 1/2 mobile</Text>
    </Column>
    <Column class="w-1/3 max-sm:min-w-full">
      <Text>1/3 desktop, full mobile</Text>
    </Column>
  </Row>
</template>
```

### Force equal height (no media query)

Switch siblings to `display: table-cell` so they physically match heights, while `inline-block` remains the default for stacking. Outlook uses the MSO `<td>` (already a table cell — equal-height is automatic). Apple Mail, Gmail, and Outlook.com will use `table-cell`.

```vue
<template>
  <Row>
    <Column class="max-w-1/2 table-cell">
      <Text>Short</Text>
    </Column>
    <Column class="max-w-1/2 table-cell">
      <Text>This column is much taller. The shorter sibling fills its full height too.</Text>
    </Column>
  </Row>
</template>
```

### Reverse stack on mobile

Use CSS table display modes to reorder rows on mobile without rewriting markup. `table-header-group` floats to the top, `table-footer-group` to the bottom.

```vue
<template>
  <Row class="max-sm:table max-sm:w-full">
    <Column class="max-w-1/3 max-sm:table-footer-group">
      <Text>Renders 3rd on mobile</Text>
    </Column>
    <Column class="max-w-1/3 max-sm:table-footer-group">
      <Text>Renders 2nd on mobile</Text>
    </Column>
    <Column class="max-w-1/3 max-sm:table-header-group">
      <Text>Renders 1st on mobile</Text>
    </Column>
  </Row>
</template>
```

### Stack by default, columns on desktop (mobile-first)

Use Row's `*:` child selector + `min-sm:` to switch from stacked to horizontal at the `sm` breakpoint.

```vue
<template>
  <Row class="*:w-full *:min-sm:w-1/3">
    <Column>
      <Text>Column 1</Text>
    </Column>
    <Column>
      <Text>Column 2</Text>
    </Column>
    <Column>
      <Text>Column 3</Text>
    </Column>
  </Row>
</template>
```

### Gutters between columns

Don't put padding directly on a `Column` — it adds to the outer width and breaks the grid (content-box). Wrap the content in an inner `Section` with `px-*`. Use `border-0` on the inner `Section` so Outlook (classic) applies the padding to the div without having to pass an `mso-style`. Outlook gets weird with deep nesting — use sparingly.

```vue
<template>
  <Row>
    <Column class="w-1/3">
      <Section class="px-2 border-0">
        <Text>1</Text>
      </Section>
    </Column>
    <Column class="w-1/3">
      <Section class="px-2 border-0">
        <Text>2</Text>
      </Section>
    </Column>
    <Column class="w-1/3">
      <Section class="px-2 border-0">
        <Text>3</Text>
      </Section>
    </Column>
  </Row>
</template>
```

### Nested rows

A resolved Column acts as a width source for any nested Row inside it. The post-render transformer writes the resolved width back to `data-maizzle-cw`, so deeper rows divide the outer column's width.

```vue
<template>
  <Container class="max-w-xl">
    <Row>
      <Column class="w-2/3 max-xs:w-full">
        <Text>Main 2/3</Text>
      </Column>
      <Column class="w-1/3 max-xs:w-full">
        <Row>
          <Column class="w-1/2 max-xs:w-full">
            <Text>Nested 1</Text>
          </Column>
          <Column class="w-1/2 max-xs:w-full">
            <Text>Nested 2</Text>
          </Column>
        </Row>
      </Column>
    </Row>
  </Container>
</template>
```
