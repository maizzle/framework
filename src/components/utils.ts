export function normalizeToPixels(value: string | number): string {
  if (typeof value === 'number' || Number.isFinite(Number(value))) {
    return `${value}px`
  }
  return value
}

export function hasWidthUtility(classStr: string): boolean {
  return classStr.split(/\s+/).some((c) => {
    const utility = c.split(':').pop() ?? ''
    const clean = utility.replace(/^!/, '')
    return /^(w-|max-w-|min-w-)/.test(clean)
  })
}

export function hasWidthInStyle(styleStr: string): boolean {
  return /(?:^|;\s*)(?:max-width|width)\s*:/i.test(styleStr)
}
