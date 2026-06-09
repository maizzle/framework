/**
 * Deep-clone plain objects so per-template config mutations stay isolated.
 *
 * Arrays, functions, and class instances (Date, RegExp, Vite plugins, …) pass
 * through by reference — only nested plain-object props are copied, which is
 * what `beforeRender` mutations (`config.url.base`, `config.css.inline`, …)
 * touch. Sharing arrays by reference matches the parallel worker's merge.
 */
export function cloneConfig<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value
  if (Object.getPrototypeOf(value) !== Object.prototype) return value

  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value as object)) {
    out[key] = cloneConfig((value as Record<string, unknown>)[key])
  }

  return out as T
}
