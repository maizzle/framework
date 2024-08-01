import path from 'pathe'
import express from 'express'
const route = express.Router()
import posthtml from 'posthtml'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import expressions from 'posthtml-expressions'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

route.get(['/', '/index.html'], async (req, res) => {
  const view = await fs.readFile(path.join(__dirname, '../views', 'index.html'), 'utf8')

  // Group by `dir`
  const groupedByDir = {}

  req.templatePaths
    .map(t => path.parse(t))
    .forEach(file => {
      if (!groupedByDir[file.dir]) {
        groupedByDir[file.dir] = []
      }

      file.href = [file.dir.replace(file.root, ''), file.base].join('/')
      groupedByDir[file.dir].push(file)
    })

  const { html } = await posthtml()
    .use(expressions({
      locals: {
        templates: groupedByDir
      }
    }))
    .process(view)

  res.send(html)
})

export default route
