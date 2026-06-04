import isUrl from 'is-url-superb'

export const defaultTags: Record<string, string[]> = {
  a: ['href'],
  img: ['src', 'srcset'],
  video: ['src', 'poster'],
  source: ['src', 'srcset'],
  link: ['href'],
  script: ['src'],
  object: ['data'],
  embed: ['src'],
  iframe: ['src'],
  'v:image': ['src'],
  'v:fill': ['src'],
}

export const urlAttributes = [...new Set(Object.values(defaultTags).flat())]

export function isAbsoluteUrl(url: string): boolean {
  if (!url) return true

  return url.startsWith('//') || url.startsWith('#') || url.startsWith('?') || isUrl(url)
}

export function processSrcset(srcset: string, baseUrl: string): string {
  return srcset.split(',').map(entry => {
    const parts = entry.trim().split(/\s+/)

    if (parts[0] && !isAbsoluteUrl(parts[0])) {
      parts[0] = baseUrl + parts[0]
    }

    return parts.join(' ')
  }).join(', ')
}
