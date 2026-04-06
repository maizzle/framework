import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname, basename, relative, join } from 'node:path'
import { glob } from 'tinyglobby'
import ora from 'ora'
import { resolveConfig } from './config/index.ts'
import { EventManager } from './events/index.ts'
import { runTransformers } from './transformers/index.ts'
import { createRenderer } from './render/createRenderer.ts'
import { createPlaintext } from './plaintext.ts'
import type { MaizzleConfig } from './types/index.ts'

export interface BuildOptions {
  config?: Partial<MaizzleConfig> | string
}

export interface BuildResult {
  files: string[]
  config: MaizzleConfig
}

/**
 * Build all SFC email templates to HTML files.
 *
 * Creates a single Renderer instance, then loops through each template
 * calling render → transformers → write to disk.
 */
export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const start = Date.now()
  const spinner = ora('Building templates...').start()

  const config = await resolveConfig(options.config)

  const events = new EventManager()
  events.registerConfig(config)
  await events.fireBeforeCreate({ config })

  const outputPath = resolve(config.output?.path ?? 'dist')
  const outputExtension = config.output?.extension ?? 'html'

  const contentPatterns = config.content ?? ['emails/**/*.vue']
  const contentBase = computeContentBase(contentPatterns)
  const templateFiles = await glob(contentPatterns)

  if (templateFiles.length === 0) {
    spinner.succeed('No templates found')
    return { files: [], config }
  }

  // Clear the output directory before writing fresh output
  if (existsSync(outputPath)) {
    rmSync(outputPath, { recursive: true, force: true })
  }

  const renderer = await createRenderer({ markdown: config.markdown, root: config.root })
  const outputFiles: string[] = []

  try {
    for (const templatePath of templateFiles) {
      const absolutePath = resolve(templatePath)
      let template = readFileSync(absolutePath, 'utf-8')

      template = await events.fireBeforeRender({ config, template })

      const rendered = await renderer.render(absolutePath, config)

      let html = await events.fireAfterRender({ config, template, html: rendered.html })

      // Use the per-template merged config (from defineConfig() in the SFC) so that
      // template-level overrides like css.safe: false are respected by transformers.
      const templateConfig = rendered.templateConfig

      if (templateConfig.useTransformers !== false) {
        html = await runTransformers(html, templateConfig, absolutePath)
      }

      html = await events.fireAfterTransform({ config, template, html })

      const doctype = rendered.doctype ?? templateConfig.doctype ?? '<!DOCTYPE html>'
      html = `${doctype}\n${html}`

      const outputFilePath = resolveOutputPath(templatePath, outputPath, outputExtension, contentBase)
      mkdirSync(dirname(outputFilePath), { recursive: true })
      writeFileSync(outputFilePath, html)
      outputFiles.push(outputFilePath)

      // Generate plaintext version if configured
      const globalPlaintext = templateConfig.plaintext
      const sfcPlaintext = rendered.plaintext

      if (globalPlaintext || sfcPlaintext) {
        const stripOptions = typeof globalPlaintext === 'object' ? globalPlaintext : {}
        const plaintext = createPlaintext(html, stripOptions)
        const ptExtension = sfcPlaintext?.extension ?? 'txt'

        let ptOutputPath: string

        if (sfcPlaintext?.destination) {
          const name = basename(templatePath).replace(/\.(vue|md)$/, '')
          ptOutputPath = join(resolve(sfcPlaintext.destination), `${name}.${ptExtension}`)
        } else if (typeof globalPlaintext === 'string') {
          ptOutputPath = resolveOutputPath(templatePath, resolve(globalPlaintext), ptExtension, contentBase)
        } else {
          ptOutputPath = resolveOutputPath(templatePath, outputPath, ptExtension, contentBase)
        }

        mkdirSync(dirname(ptOutputPath), { recursive: true })
        writeFileSync(ptOutputPath, plaintext)
      }

      // Register SFC event handlers that were collected during render
      for (const { name, handler } of rendered.sfcEventHandlers) {
        events.on(name, handler)
      }

      events.clearSfcHandlers()
    }

    await copyStatic(config, outputPath)
    await events.fireAfterBuild({ files: outputFiles, config })
  } finally {
    await renderer.close()
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2)
  const count = outputFiles.length
  spinner.stopAndPersist({
    symbol: '✅',
    text: `Built ${count} template${count !== 1 ? 's' : ''} in ${duration}s`,
  })

  return { files: outputFiles, config }
}

/**
 * Extract the static (non-glob) prefix from content patterns.
 *
 * For example, `['/abs/path/emails/**\/*.vue']` → `'/abs/path/emails'`
 *
 * This is used to strip the content base from template paths
 * so the output preserves only the subdirectory structure.
 */
function computeContentBase(patterns: string[]): string {
  // Use the first non-negated pattern
  const pattern = patterns.find(p => !p.startsWith('!')) ?? patterns[0]

  // Split on first glob character (* { ? [) and take the directory part
  const staticPart = pattern.split(/[*{?[]/)[0]

  // Ensure we have a clean directory path (not a partial segment)
  return resolve(staticPart.endsWith('/') ? staticPart : dirname(staticPart))
}

function resolveOutputPath(templatePath: string, outputDir: string, extension: string, contentBase: string): string {
  const name = basename(templatePath).replace(/\.(vue|md)$/, '')
  const absTemplate = resolve(templatePath)
  const rel = relative(contentBase, dirname(absTemplate))

  return join(outputDir, rel, `${name}.${extension}`)
}

async function copyStatic(config: MaizzleConfig, outputPath: string): Promise<void> {
  const sources = config.static?.source ?? ['public/**/*.*']
  const destination = config.static?.destination ?? 'public'

  const files = await glob(sources)

  for (const file of files) {
    const destPath = join(outputPath, destination, relative(dirname(sources[0]).replace(/\*.*$/, ''), file))
    const destDir = dirname(destPath)

    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }

    cpSync(file, destPath)
  }
}
