import type { MaizzleConfig } from '../types/index.ts'

export const defaults: MaizzleConfig = {
  content: ['emails/**/*.{vue,md}'],
  output: {
    path: 'dist',
    extension: 'html',
  },
  static: {
    source: ['public/**/*.*'],
    destination: 'public',
  },
  server: {
    port: 3000,
    watch: [],
  },
  css: {
    inline: true,
    purge: true,
    shorthand: true,
    safe: true,
    preferUnitless: true,
  },
  html: {
    decodeEntities: true,
  },
  useTransformers: true,
}
