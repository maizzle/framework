const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const tailwindcss = require('tailwindcss')
const postcssImport = require('postcss-import')
const postcssNested = require('tailwindcss/nesting')
const {requireUncached} = require('../utils/helpers')
const mergeLonghand = require('postcss-merge-longhand')
const {get, isObject, isEmpty, merge} = require('lodash')

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
    const componentsRoot = get(config, 'build.components.root')

    const layoutsPath = typeof layoutsRoot === 'string' && layoutsRoot ?
      `${layoutsRoot}/**/*.html`.replace(/\/\//g, '/') :
      './src/layouts/**/*.html'

    const componentsPath = typeof componentsRoot === 'string' && componentsRoot ?
      `${componentsRoot}/**/*.html`.replace(/\/\//g, '/') :
      './src/components/**/*.html'

    const tailwindConfig = merge({
      content: {
        files: [
          layoutsPath,
          componentsPath,
          {raw: html, extension: 'html'}
        ]
      }
    }, userConfig(config))

    // If `content` is an array, add it to `content.files`
    if (Array.isArray(tailwindConfig.content)) {
      tailwindConfig.content = {
        files: [
          layoutsPath,
          componentsPath,
          ...tailwindConfig.content,
          {raw: html, extension: 'html'}
        ]
      }
    }

    // Include all `build.templates.source` paths when scanning for selectors to preserve
    const buildTemplates = get(config, 'build.templates')

    if (buildTemplates) {
      const templateObjects = Array.isArray(buildTemplates) ? buildTemplates : [buildTemplates]
      const templateSources = templateObjects.map(template => {
        const source = get(template, 'source')

        if (typeof source === 'function') {
          const sources = source(config)

          if (Array.isArray(sources)) {
            sources.map(s => tailwindConfig.content.files.push(s))
          } else if (typeof sources === 'string') {
            tailwindConfig.content.files.push(sources)
          }

          // Must return a valid `content` entry
          return {raw: '', extension: 'html'}
        }

        // Support single-file sources i.e. src/templates/index.html
        if (typeof source === 'string' && Boolean(path.extname(source))) {
          tailwindConfig.content.files.push(source)

          return {raw: '', extension: 'html'}
        }

        return `${source}/**/*.*`
      })

      tailwindConfig.content.files.push(...templateSources)
    }

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
