import type { Plugin, ViteDevServer } from 'vite'
import type { MaizzleConfig } from './types/index.ts'
import { isLaravel } from './utils/detect.ts'

/**
 * Maizzle Vite plugin for use inside an existing Vite project.
 *
 * - During `vite dev`: starts a separate Maizzle dev server on its own port
 * - During `vite build`: builds email templates alongside the host app
 *
 * Does NOT inject Vue, Tailwind, or any other plugins into the host's pipeline.
 * The host app manages its own stack. Maizzle runs in its own process.
 */
export function maizzle(configInput?: Partial<MaizzleConfig>): Plugin[] {
  let maizzleServer: ViteDevServer | null = null

  // Auto-configure defaults for Laravel projects
  if (isLaravel()) {
    const existing = configInput?.components?.source
    const laravelComponentDir = 'resources/js/components/email'

    if (!existing) {
      configInput = {
        ...configInput,
        components: {
          ...configInput?.components,
          source: [laravelComponentDir],
        },
      }
    }
  }

  return [{
    name: 'maizzle',

    async configureServer(hostServer) {
      const { serve, printBanner } = await import('./serve.ts')
      maizzleServer = await serve({ config: configInput, silent: true })

      // Print Maizzle banner after the host server prints its URLs
      hostServer.httpServer?.on('listening', () => {
        printBanner(maizzleServer!)
      })
    },

    async closeBundle() {
      if (this.meta.watchMode) return

      const { build } = await import('./build.ts')
      await build({ config: configInput })
    },

    async buildEnd() {
      if (maizzleServer) {
        await maizzleServer.close()
        maizzleServer = null
      }
    },
  }]
}
