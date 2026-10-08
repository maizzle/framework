/**
 * Define sample props for previewing the template in the dev server.
 *
 * Compiler macro: the `maizzle:preview-props` Vite plugin removes the call
 * and hands its argument to the dev server, which merges it under the
 * real props. `build` and `render()` never use it, so sample data
 * can't leak into production emails.
 *
 * Like `defineProps()` defaults, the argument can't reference variables
 * declared in `<script setup>`. Imports are fine.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * defineProps<Props>()
 * definePreviewProps<Props>({ name: 'Jane Doe', plan: 'Pro' })
 * ```
 */
export function definePreviewProps<T extends Record<string, any>>(_props: Partial<T>): void {}
