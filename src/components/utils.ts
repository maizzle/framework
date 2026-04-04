export function normalizeToPixels(value: string | number): string {
  if (typeof value === 'number' || Number.isFinite(Number(value))) {
    return `${value}px`
  }
  return value
}
