import { createReadStream, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import type { ServerResponse } from 'node:http'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
}

/**
 * Stream the file at `urlPath` (mount prefix already stripped) from
 * `base`. Returns false when there is nothing to serve — missing file,
 * directory, or a path escaping `base` — so the caller can fall through.
 */
export function serveStaticFile(base: string, urlPath: string, res: ServerResponse): boolean {
  let pathname: string

  try {
    pathname = decodeURIComponent(urlPath.split('?')[0])
  } catch {
    return false
  }

  const file = resolve(base, `.${pathname}`)

  if (file !== base && !file.startsWith(base + sep)) {
    return false
  }

  let size: number

  try {
    const stat = statSync(file)
    if (!stat.isFile()) return false
    size = stat.size
  } catch {
    return false
  }

  res.setHeader('Content-Type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream')
  res.setHeader('Content-Length', size)
  res.setHeader('Cache-Control', 'no-cache')
  createReadStream(file).pipe(res)

  return true
}
