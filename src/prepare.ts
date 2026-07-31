import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ora from 'ora'
import { resolveConfig } from './config/index.ts'
import { createRenderer } from './render/createRenderer.ts'
import { isLaravel } from './utils/detect.ts'
import { normalizeComponentSources } from './utils/componentSources.ts'

export interface PrepareOptions {
  /** Path to a Maizzle config file. */
  config?: string
}

/**
 * Generate IDE type definitions in `.maizzle/`
 * (`auto-imports.d.ts` and `components.d.ts`).
 *
 * Intended as a `postinstall` step so editors get autocompletion before the
 * user runs `dev` or `build`. Spins up the renderer with `dts: true`, runs
 * a trivial render to trigger the unplugin scans, then shuts down.
 */
export async function prepare(options: PrepareOptions = {}): Promise<void> {
  const spinner = ora({ text: 'Generating types...', spinner: 'circleHalves' }).start()

  const config = await resolveConfig(options.config)

  const renderer = await createRenderer({
    dts: true,
    markdown: config.markdown,
    root: config.root,
    componentDirs: normalizeComponentSources(config.components?.source, process.cwd()),
    vite: config.vite,
  })

  try {
    await renderer.render('<template><div></div></template>', config)
  } finally {
    await renderer.close()
  }

  const dtsDir = isLaravel()
    ? resolve(process.cwd(), 'resources/js/types/maizzle')
    : resolve(config.root ?? process.cwd(), '.maizzle')
  const displayPath = relative(process.cwd(), dtsDir) || dtsDir

  spinner.stopAndPersist({
    symbol: '✅',
    text: `Types generated in ${displayPath}`,
  })

  // Copy the bundled Maizzle skill into the project's `.claude/skills/` so
  // Claude Code auto-discovers it (it never scans `node_modules/`) and it stays
  // in sync with the installed framework version on every install/upgrade.
  const skillSrc = resolve(dirname(fileURLToPath(import.meta.url)), '../skills/maizzle')
  if (existsSync(skillSrc)) {
    const skillDest = resolve(process.cwd(), '.claude/skills/maizzle')
    rmSync(skillDest, { recursive: true, force: true })
    cpSync(skillSrc, skillDest, { recursive: true })
    ora().stopAndPersist({
      symbol: '✅',
      text: `Maizzle skill installed in ${relative(process.cwd(), skillDest) || skillDest}`,
    })
  }
}
