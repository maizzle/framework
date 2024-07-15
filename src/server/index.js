import path from 'pathe'
import fs from 'node:fs/promises'
import { createServer } from 'node:http'
import { cwd, exit } from 'node:process'

import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

import ora from 'ora'
import fg from 'fast-glob'
import express from 'express'
import pico from 'picocolors'
import get from 'lodash-es/get.js'
import * as chokidar from 'chokidar'
import { isBinary } from 'istextorbinary'

import WebSocket, { WebSocketServer } from 'ws'
import { initWebSockets } from './websockets.js'

import {
  getLocalIP,
  getColorizedFileSize,
} from '../utils/node.js'
import { injectScript, formatTime } from '../utils/string.js'

import { render } from '../generators/render.js'
import { readFileConfig } from '../utils/getConfigByFilePath.js'
import defaultComponentsConfig from '../posthtml/defaultComponentsConfig.js'

// Routes
import hmrRoute from './routes/hmr.js'
import indexRoute from './routes/index.js'

const app = express()
const wss = new WebSocketServer({ noServer: true })

// Register routes
app.use(indexRoute)
app.use(hmrRoute)

let viewing = ''
const spinner = ora()

export default async (config = {}) => {
  // Read the Maizzle config file
  config = await readFileConfig(config).catch(() => { throw new Error('Could not compute config') })

  /**
   * Dev server settings
   */
  const shouldScroll = get(config, 'server.scrollSync', false)
  const useHmr = get(config, 'server.hmr', true)

  // Add static assets root prefix so user doesn't have to
  if (!config.baseURL) {
    config.baseURL = '/'
  }

  /**
   * Initialize WebSocket server
   * Used to send messages between the server and the browser
   */
  initWebSockets(wss, { scrollSync: shouldScroll, hmr: useHmr })

  // Get a list of all template paths
  const templateFolders = Array.isArray(get(config, 'build.content'))
    ? config.build.content
    : [config.build.content]

  const templatePaths = await fg.glob([...new Set(templateFolders)])

  // Set the template paths on the app, we use them in the index view
  app.request.templatePaths = templatePaths

  /**
   * Create route pattern
   * Only allow files with the following extensions
   */
  const extensions = [
    ...new Set(templatePaths
      .filter(p => !isBinary(p)) // exclude binary files from routes
      .map(p => path.extname(p).slice(1).toLowerCase())
    )
  ].join('|')

  const routePattern = Array.isArray(templateFolders)
    ? `*/:file.(${extensions})`
    : `:file.(${extensions})`

  /**
   * Loop over the source folders and create route for each file
   */
  templatePaths.forEach(() => {
    app.get(routePattern, async (req, res, next) => {
      // Run beforeCreate event
      if (typeof config.beforeCreate === 'function') {
        config.beforeCreate(config)
      }

      try {
        const filePath = templatePaths.find(t => t.endsWith(req.url.slice(1)))

        // Set the file being viewed
        viewing = filePath

        // Read the file
        const fileContent = await fs.readFile(filePath, 'utf8')

        // Set a `dev` flag on the config
        config._dev = true

        // Render the file with PostHTML
        let { html } = await render(fileContent, config)

        /**
         * Inject HMR script
         */
        html = injectScript(html, '<script src="/hmr.js"></script>')

        res.send(html)
      } catch (error) {
        spinner.fail(`Failed to render template: ${req.url}\n`)
        next(error)
      }
    })
  })

  // Error-handling middleware
  app.use(async (error, req, res, next) => { // eslint-disable-line
    console.error(error)

    const view = await fs.readFile(path.join(__dirname, 'views', 'error.html'), 'utf8')
    const { html } = await render(view, {
      method: req.method,
      url: req.url,
      error
    })

    res.status(500).send(html)
  })

  /**
   * Components watcher
   *
   * Watches for changes in the configured Templates and Components paths
   */
  chokidar
    .watch([...templatePaths, ...get(config, 'components.folders', defaultComponentsConfig.folders) ])
    .on('change', async () => {
      // Not viewing a component in the browser, no need to rebuild
      if (!viewing) {
        return
      }

      try {
        const startTime = Date.now()
        spinner.start('Building...')

        // beforeCreate event
        if (typeof config.beforeCreate === 'function') {
          await config.beforeCreate(config)
        }

        // Read the file
        const fileContent = await fs.readFile(viewing, 'utf8')

        // Set a `dev` flag on the config
        config._dev = true

        // Render the file with PostHTML
        let { html } = await render(fileContent, config)

        // Update console message
        const shouldReportFileSize = get(config, 'server.reportFileSize', false)

        spinner.succeed(
          `Done in ${formatTime(Date.now() - startTime)}`
          + `${pico.gray(` [${path.relative(cwd(), viewing)}]`)}`
          + `${ shouldReportFileSize ? ' · ' + getColorizedFileSize(html) : ''}`
        )

        /**
         * Inject HMR script
         */
        html = injectScript(html, '<script src="/hmr.js"></script>')

        // Notify connected websocket clients about the change
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'change',
              content: html,
              scrollSync: get(config, 'server.scrollSync', false),
              hmr: get(config, 'server.hmr', true),
            }))
          }
        })
      } catch (error) {
        spinner.fail('Failed to render template.')
        throw error
      }
    })

  /**
   * Global watcher
   *
   * Watch for changes in the config file, Tailwind CSS config, and CSS files
   */
  const globalWatchedPaths = new Set([
    'config*.js',
    'maizzle.config*.js',
    'tailwind*.config.js',
    '**/*.css',
    ...get(config, 'server.watch', [])
  ])

  async function globalPathsHandler(file, eventType) {
    // Not viewing a component in the browser, no need to rebuild
    if (!viewing) {
      spinner.info(`file ${eventType}: ${file}`)
      return
    }

    try {
      const startTime = Date.now()
      spinner.start('Building...')

      // Read the Maizzle config file
      config = await readFileConfig()

      // Add static assets root prefix so user doesn't have to
      if (!config.baseURL) {
        config.baseURL = '/'
      }

      // Run beforeCreate event
      if (typeof config.beforeCreate === 'function') {
        await config.beforeCreate(config)
      }

      // Read the file
      const filePath = templatePaths.find(t => t.endsWith(viewing))
      const fileContent = await fs.readFile(path.normalize(filePath), 'utf8')

      // Set a `dev` flag on the config
      config._dev = true

      // Render the file with PostHTML
      let { html } = await render(fileContent, config)

      // Update console message
      const shouldReportFileSize = get(config, 'server.reportFileSize', false)

      spinner.succeed(
        `Done in ${formatTime(Date.now() - startTime)}`
        + `${pico.gray(` [${path.relative(cwd(), filePath)}]`)}`
        + `${ shouldReportFileSize ? ' · ' + getColorizedFileSize(html) : ''}`
      )

      /**
       * Inject HMR script
       */
      html = injectScript(html, '<script src="/hmr.js"></script>')

      // Notify connected websocket clients about the change
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: eventType,
            content: html,
            scrollSync: get(config, 'server.scrollSync', false),
            hmr: get(config, 'server.hmr', true),
          }))
        }
      })
    } catch (error) {
      spinner.fail('Failed to render template.')
      throw error
    }
  }

  chokidar
    .watch([...globalWatchedPaths], {
      ignored: [
        'node_modules',
        get(config, 'build.output.path', 'build_production'),
      ],
      ignoreInitial: true,
    })
    .on('change', async file => await globalPathsHandler(file, 'change'))
    .on('add', async file => await globalPathsHandler(file, 'add'))
    .on('unlink', async file => await globalPathsHandler(file, 'unlink'))

  /**
   * Serve all folders in the cwd as static files
   *
   * TODO: change to include build.assets or build.static, which may be outside cwd
   */
  const srcFoldersList = await fg.glob(
    [
      '**/*/',
      ...get(config, 'build.static.source', [])
    ], {
      onlyFiles: false,
      ignore: [
        'node_modules',
        get(config, 'build.output.path', 'build_*'),
      ]
    })

  srcFoldersList.forEach(folder => {
    app.use(express.static(path.join(config.cwd, folder)))
  })

  /**
   * Start the server
   */
  let retryCount = 0
  const port = get(config, 'server.port', 3000)
  const maxRetries = get(config, 'server.maxRetries', 10)

  function startServer(port) {
    const serverStartTime = Date.now()
    spinner.start('Starting server...')

    const server = createServer(app)

    /**
     * Handle WebSocket upgrades
     * Attaches the WebSocket server to the Express server.
     */
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request)
      })
    })

    server.listen(port, async () => {
      const { version } = JSON.parse(
        await fs.readFile(
          new URL('../../package.json', import.meta.url)
        )
      )

      spinner.stopAndPersist({
        text: `${pico.bgBlue(` Maizzle v${version} `)} ready in ${pico.bold(Date.now() - serverStartTime)} ms`
          + '\n\n'
          + `  → Local:   http://localhost:${port}`
          + '\n'
          + `  → Network: http://${getLocalIP()}:${port}\n`
      })
    })

    server.on('error', error => {
      try {
        if (error.code === 'EADDRINUSE') {
          server.close()
          retryPort()
        }
      } catch (error) {
        spinner.fail(error.message)
        exit(1)
      }
    })

    return server
  }

  function retryPort() {
    retryCount++

    if (retryCount <= maxRetries) {
      const nextPort = port + retryCount
      startServer(nextPort)
    } else {
      spinner.fail(`Exceeded maximum number of retries (${maxRetries}). Unable to find a free port.`)

      exit(1)
    }
  }

  startServer(port)
}
