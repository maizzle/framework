/**
 * Decode HTML entities that Vue SSR encodes inside `<style>` tags.
 *
 * Vue's `renderToString` HTML-encodes quotes and angle brackets within
 * style elements in templates, breaking CSS like
 * `@import "tailwindcss"` → `@import &quot;tailwindcss&quot;`.
 *
 * `&amp;` is decoded last so previously-decoded entities are not
 * re-processed.
 */
export function decodeStyleEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
