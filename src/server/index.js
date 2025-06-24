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
let templatePaths = []
const serverStartTime = Date.now()

function getTemplateFolders(config) {
  return Array.isArray(get(config, 'build.content'))
    ? config.build.content
    : [config.build.content]
}

async function getTemplatePaths(templateFolders) {
  return await fg.glob([...new Set(templateFolders)])
}

async function getUpdatedRoutes(_app, config) {
  return getTemplatePaths(getTemplateFolders(config))
}

async function renderUpdatedFile(file, config) {
  try {
    const startTime = Date.now()
    spinner.start('Building...')

    /**
     * Add current template path info to the config
     *
     * Can be used in events like `beforeRender` to determine
     * which template file is being rendered.
     */
    config.build.current = {
      path: path.parse(file),
    }

    // Read the file
    const fileContent = await fs.readFile(file, 'utf8')

    // Set a `dev` flag on the config
    config._dev = true

    // Render the file with PostHTML
    let { html } = await render(fileContent, config)

    // Update console message
    const shouldReportFileSize = get(config, 'server.reportFileSize', false)

    spinner.succeed(
      `Done in ${formatTime(Date.now() - startTime)}`
      + `${pico.gray(` [${path.relative(cwd(), file)}]`)}`
      + `${shouldReportFileSize ? ' · ' + getColorizedFileSize(html) : ''}`
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
}

export default async (config = {}) => {
  // Read the Maizzle config file
  config = await readFileConfig(config).catch(() => { throw new Error('Could not compute config') })

  /**
   * Dev server settings
  */
  spinner.spinner = get(config, 'server.spinner', 'circleHalves')
  spinner.start('Starting server...')

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
  initWebSockets(wss, { shouldScroll, useHmr })

  // Register routes
  templatePaths = await getUpdatedRoutes(app, config)

  /**
   * Store template paths on the request object
   *
   * We use it in the index view to list all templates.
   * */
  app.request.templatePaths = templatePaths

  app.request.maizzleConfig = config

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

  const routePattern = Array.isArray(getTemplateFolders(config))
    ? `*/:file.(${extensions})`
    : `:file.(${extensions})`

  /**
   * Loop over the source folders and create route for each file
   */
  templatePaths.forEach(() => {
    app.get(routePattern, async (req, res, next) => {
      // Run beforeCreate event
      if (typeof config.beforeCreate === 'function') {
        await config.beforeCreate({ config })
      }

      try {
        const filePath = templatePaths.find(t => t.endsWith(decodeURI(req.url.slice(1))))

        // Set the file being viewed
        viewing = filePath

        // Add current template path info to the config
        config.build.current = {
          path: path.parse(filePath),
        }

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

  /**
   * Components watcher
   *
   * Watches for changes in the configured Templates and Components paths
   */
  let isWatcherReady = false
  chokidar
    .watch(
      [
        ...templatePaths,
        ...get(config, 'components.folders', defaultComponentsConfig.folders)
      ],
      {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 150,
          pollInterval: 25,
        },
      }
    )
    .on('change', async () => {
      if (viewing) {
        await renderUpdatedFile(viewing, config)
      }
    })
    .on('ready', () => {
      /**
       * `add` fires immediately when the watcher is created,
       * so we use this trick to detect new files added
       * after it has started.
       */
      isWatcherReady = true
    })
    .on('add', async () => {
      if (isWatcherReady) {
        templatePaths = await getUpdatedRoutes(app, config)
        app.request.templatePaths = templatePaths
      }
    })
    .on('unlink', async () => {
      if (isWatcherReady) {
        templatePaths = await getUpdatedRoutes(app, config)
        app.request.templatePaths = templatePaths
      }
    })

  let staticFiles = get(config, 'build.static', [])

  if (!Array.isArray(staticFiles)) {
    staticFiles = [staticFiles]
  }

  const staticFilesSourcePaths = staticFiles.flatMap((definition) => definition.source)

  /**
   * Global watcher
   *
   * Watch for changes in the config files, Tailwind CSS config, CSS files,
   * configured static assets, and user-defined watch paths.
   */
  const globalWatchedPaths = new Set([
    'config*.{js,cjs,ts}',
    'maizzle.config*.{js,cjs,ts}',
    'tailwind*.config.{js,ts}',
    '**/*.css',
    ...staticFilesSourcePaths,
    ...get(config, 'server.watch', []),
  ])

  async function globalPathsHandler(file, eventType) {
    // Update express.static to serve new files
    if (eventType === 'add') {
      app.use(express.static(path.dirname(file)))
    }

    // Stop serving deleted files
    if (eventType === 'unlink') {
      app._router.stack = app._router.stack.filter(
        layer => layer.regexp.source !== path.dirname(file).replace(/\\/g, '/')
      )
    }

    // Not viewing a component in the browser, no need to rebuild
    if (!viewing) {
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
        await config.beforeCreate({ config })
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
        + `${shouldReportFileSize ? ' · ' + getColorizedFileSize(html) : ''}`
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
      spinner.fail(`Failed to render template: ${file}`)
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
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 25,
      },
    })
    .on('change', async file => await globalPathsHandler(file, 'change'))
    .on('add', async file => await globalPathsHandler(file, 'add'))
    .on('unlink', async file => await globalPathsHandler(file, 'unlink'))

  /**
   * Serve all folders in the cwd as static files
   */
  const srcFoldersList = await fg.glob(
    [
      '**/*/',
      ...staticFilesSourcePaths,
    ], {
    onlyFiles: false,
    ignore: [
      'node_modules',
      `${get(config, 'build.output.path', 'build_*')}/**`,
    ]
  })

  srcFoldersList.forEach(folder => {
    app.use(express.static(path.join(config.cwd, folder)))
  })

  // Error-handling middleware
  app.use(async (req, res) => {
    const view = await fs.readFile(path.join(__dirname, 'views', '404.html'), 'utf8')
    const { html } = await render(view, {
      url: req.url,
    })

    res.status(404).send(html)
  })

  /**
   * Start the server
   */
  let retryCount = 0
  const port = get(config, 'server.port', 3000)
  const maxRetries = get(config, 'server.maxRetries', 10)

  function startServer(port) {
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
        text: `\n${pico.bgBlue(` Maizzle v${version} `)} ready in ${pico.bold(formatTime(Date.now() - serverStartTime))}`
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
