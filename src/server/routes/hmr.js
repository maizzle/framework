import express from 'express'
import fs from 'node:fs/promises'
import { dirname, join } from 'pathe'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const router = express.Router()
const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

router.get('/hmr.js', async (_req, res) => {
  try {
    const morphdomPath = require.resolve('morphdom/dist/morphdom-umd.js')
    const morphdomScript = await fs.readFile(morphdomPath, 'utf8')

    const clientScript = await fs.readFile(join(__dirname, '../client.js'), 'utf8')

    res.setHeader('Content-Type', 'application/javascript')
    res.send(morphdomScript + clientScript)
  } catch (error) {
    console.error('Error reading files:', error)
    res.status(500).send('Internal Server Error')
  }
})

export default router
