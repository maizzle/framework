import path from 'pathe'
import express from 'express'
const route = express.Router()
import posthtml from 'posthtml'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import expressions from 'posthtml-expressions'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function groupFilesByDirectories(globs, files) {
  const result = {}
  let current = {}

  globs.forEach(glob => {
    // biome-ignore lint: needs to be escaped
    const rootPath = glob.split(/[\*\!\{\}]/)[0].replace(/\/+$/, '')

    files.forEach(file => {
      if (file.startsWith(rootPath)) {
        const relativePath = file.slice(rootPath.length + 1)
        const parts = relativePath.split('/')
        current = result[rootPath] = result[rootPath] || {}

        for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]] = current[parts[i]] || {}
        }

        const fileName = parts[parts.length - 1]
        current[fileName] = {
          name: fileName,
          href: encodeURI(file),
        }
      }
    })
  })

  return result
}

function flattenPaths(paths, parentPath = '', currentDepth = 0) {
  const flatArray = []

  for (const [key, value] of Object.entries(paths)) {
    const fullPath = parentPath ? `${parentPath}/${key}` : key

    if (value && typeof value === 'object' && !value.name) {
      // If it's a folder, add it with the current depth and recurse into its contents
      flatArray.push({ name: key, path: fullPath, depth: currentDepth, type: 'folder' })
      flatArray.push(...flattenPaths(value, fullPath, currentDepth + 1))
    } else if (value && typeof value === 'object' && value.name) {
      // If it's a file, add it with the current depth
      flatArray.push({ name: value.name, href: value.href, path: fullPath, depth: currentDepth, type: 'file' })
    }
  }

  return flatArray
}

route.get(['/', '/index.html'], async (req, res) => {
  const view = await fs.readFile(path.join(__dirname, '../views', 'index.html'), 'utf8')

  const content = new Set(req.maizzleConfig.build.content)

  const groupedByDir = groupFilesByDirectories(content, req.templatePaths)

  const { html } = await posthtml()
    .use(expressions({
      locals: {
        paths: flattenPaths(groupedByDir)
      }
    }))
    .process(view)

  res.send(html)
})

export default route
