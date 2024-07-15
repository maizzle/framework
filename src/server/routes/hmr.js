import express from 'express'
const router = express.Router()
import fs from 'node:fs/promises'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'pathe'

const __dirname = dirname(fileURLToPath(import.meta.url))

router.get('/hmr.js', async (req, res) => {
  const morphdomScript = await fs.readFile(
    resolve(cwd(), 'node_modules/morphdom/dist/morphdom-umd.js'),
    'utf8'
  )

  const clientScript = await fs.readFile(
    join(__dirname, '../client.js'),
    'utf8'
  )

  res.setHeader('Content-Type', 'application/javascript')
  res.send(morphdomScript + clientScript)
})

export default router
