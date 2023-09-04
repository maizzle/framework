const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const tailwindcss = require('tailwindcss')
const postcssImport = require('postcss-import')
const {get, isObject, isEmpty} = require('lodash')
const postcssNested = require('tailwindcss/nesting')
const {merge, requireUncached} = require('../utils/helpers')
const mergeLonghand = require('postcss-merge-longhand')
const defaultComponentsConfig = require('./posthtml/defaultComponentsConfig')

const addImportantPlugin = () => {
  return {
    postcssPlugin: 'add-important',
    Rule(rule) {
      const shouldAddImportant = get(rule, 'raws.tailwind.layer') === 'variants'
      || get(rule, 'parent.type') === 'atrule'

      if (shouldAddImportant) {
        rule.walkDecls(decl => {
          decl.important = true
        })
      }
    }
  }
}

module.exports = {
  compile: async ({css = '', html = '', config = {}}) => {
    // Compute the Tailwind config to use
    const userConfig = config => {
      const tailwindUserConfig = get(config, 'build.tailwind.config', 'tailwind.config.js')

      // If a custom config object was passed, use that
      if (isObject(tailwindUserConfig) && !isEmpty(tailwindUserConfig)) {
        return tailwindUserConfig
      }

      /**
       * Try loading a fresh tailwind.config.js, with fallback to an empty object.
       * This will use the default Tailwind config (with rem units etc)
       */
      try {
        return requireUncached(path.resolve(process.cwd(), tailwindUserConfig))
      } catch {
        return {}
      }
    }

    // Merge user's Tailwind config on top of a 'base' config
    const layoutsRoot = get(config, 'build.layouts.root')
    const componentsRoot = get(config, 'build.components.root', defaultComponentsConfig.root)

    const layoutsPath = typeof layoutsRoot === 'string' && layoutsRoot ?
      `${layoutsRoot}/**/*.*`.replace(/\/\//g, '/') :
      'src/layouts/**/*.*'

    const componentsPath = defaultComponentsConfig.folders.map(folder => {
      return path
        .join(componentsRoot, folder, `**/*.${defaultComponentsConfig.fileExtension}`)
        .replace(/\\/g, '/')
        .replace(/\/\//g, '/')
    })

    const tailwindConfig = merge({
      content: {
        files: [
          ...componentsPath,
          layoutsPath
        ]
      }
    }, userConfig(config))

    // If `content` is an array, add it to `content.files`
    if (Array.isArray(tailwindConfig.content)) {
      tailwindConfig.content = {
        files: [
          ...componentsPath,
          layoutsPath,
          ...tailwindConfig.content
        ]
      }
    }

    // Add raw HTML if using API
    if (html) {
      tailwindConfig.content.files.push({raw: html, extension: 'html'})
    }

    // Include all `build.templates.source` paths when scanning for selectors to preserve
    const buildTemplates = get(config, 'build.templates')

    if (buildTemplates) {
      const templateObjects = Array.isArray(buildTemplates) ? buildTemplates : [buildTemplates]
      const configFileTypes = get(buildTemplates, 'filetypes', ['html'])
      const fileTypes = Array.isArray(configFileTypes) ? configFileTypes : configFileTypes.split('|')
      const fileTypesPattern = fileTypes.length > 1 ? `{${fileTypes.join(',')}}` : fileTypes[0]

      templateObjects.forEach(template => {
        const source = get(template, 'source')

        if (typeof source === 'function') {
          const sources = source(config)

          if (Array.isArray(sources)) {
            sources.map(s => tailwindConfig.content.files.push(`${s}/**/*.${fileTypesPattern}`))
          } else if (typeof sources === 'string') {
            tailwindConfig.content.files.push(sources)
          }
        }

        // Support single-file sources i.e. src/templates/index.html
        else if (typeof source === 'string' && Boolean(path.extname(source))) {
          tailwindConfig.content.files.push(source)
        }

        // Default behavior - directory sources as a string
        else {
          tailwindConfig.content.files.push(`${source}/**/*.${fileTypesPattern}`)
        }
      })
    }

    // Filter out any duplicate content paths
    tailwindConfig.content.files = [...new Set(tailwindConfig.content.files)]

    const userFilePath = get(config, 'build.tailwind.css', path.join(process.cwd(), 'src/css/tailwind.css'))
    const userFileExists = await fs.pathExists(userFilePath)

    const toProcess = [
      postcssNested(),
      tailwindcss(tailwindConfig),
      get(tailwindConfig, 'important') === false ? () => {} : addImportantPlugin(),
      get(config, 'shorthandCSS', get(config, 'shorthandInlineCSS')) === true ?
        mergeLonghand() :
        () => {},
      ...get(config, 'build.postcss.plugins', [])
    ]

    if (userFileExists) {
      css = await fs.readFile(path.resolve(userFilePath), 'utf8') + css

      toProcess.unshift(
        postcssImport({path: path.dirname(userFilePath)})
      )
    } else {
      css = `@tailwind components; @tailwind utilities; ${css}`
    }

    return postcss([...toProcess])
      .process(css, {from: userFileExists ? userFilePath : undefined})
      .then(result => result.css)
      .catch(error => {
        throw new SyntaxError(error)
      })
  }
}
