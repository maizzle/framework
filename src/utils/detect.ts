import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function isLaravel(cwd: string = process.cwd()): boolean {
  return existsSync(resolve(cwd, 'artisan'))
}
