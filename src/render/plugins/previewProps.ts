import { parseAst } from 'vite'
import type { Plugin } from 'vite'

const MACRO = 'definePreviewProps'

/**
 * Collect binding names from a declaration target: `a`, `{ a, b: c }`,
 * `[a, ...rest]`, `a = 1`.
 */
function patternNames(node: any, out: Set<string>): void {
  if (!node) return
  if (node.type === 'Identifier') out.add(node.name)
  else if (node.type === 'ObjectPattern') node.properties.forEach((p: any) => patternNames(p.type === 'RestElement' ? p : p.value, out))
  else if (node.type === 'ArrayPattern') node.elements.forEach((e: any) => patternNames(e, out))
  else if (node.type === 'AssignmentPattern') patternNames(node.left, out)
  else if (node.type === 'RestElement') patternNames(node.argument, out)
}

/**
 * Names declared directly in a statement list (not in nested blocks).
 * Imports are left out on purpose: they're allowed in the macro.
 */
function declaredNames(statements: any[], out: Set<string>): void {
  for (let node of statements) {
    if (node.type === 'ExportNamedDeclaration') node = node.declaration
    if (!node) continue
    if (node.type === 'VariableDeclaration') node.declarations.forEach((d: any) => patternNames(d.id, out))
    else if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) out.add(node.id.name)
  }
}

/**
 * Identifiers an expression reads, minus the ones it declares itself
 * (arrow function params, inner variables) and property names.
 */
function referencedNames(root: any): string[] {
  const refs = new Set<string>()
  const own = new Set<string>()

  const visit = (node: any, parent?: any, key?: string): void => {
    if (!node || typeof node.type !== 'string') return
    if (node.type === 'Identifier') {
      const isPropertyName = !parent?.computed && (
        (parent?.type === 'MemberExpression' && key === 'property')
        || ((parent?.type === 'Property' || parent?.type === 'MethodDefinition') && key === 'key')
      )
      if (!isPropertyName) refs.add(node.name)
      return
    }
    if (node.type === 'VariableDeclarator') patternNames(node.id, own)
    if (node.params) node.params.forEach((p: any) => patternNames(p, own))
    if (node.type === 'CatchClause') patternNames(node.param, own)
    for (const [k, value] of Object.entries(node)) {
      if (Array.isArray(value)) value.forEach(child => visit(child, node, k))
      else if (value && typeof value === 'object') visit(value, node, k)
    }
  }
  visit(root)

  return [...refs].filter(name => !own.has(name))
}

/**
 * Imports read only by the macro argument, plus the `__returned__` getters
 * Vue adds for them in non-TS templates. Every other identifier counts
 * as a use (even property names like `$setup.x`), so when in doubt
 * an import stays where it is.
 */
function previewOnlyImports(ast: any, arg: any): { imports: any[]; getters: any[] } {
  const imports = ast.body.filter((n: any) => n.type === 'ImportDeclaration' && n.specifiers.length && !n.attributes?.length)
  const names = new Set<string>(imports.flatMap((n: any) => n.specifiers.map((s: any) => s.local.name)))

  let getters: any[] = []
  const used = new Set<string>()
  const skip = new Set([arg, ...imports])

  const visit = (node: any, parent?: any, key?: string): void => {
    if (!node || typeof node.type !== 'string' || skip.has(node)) return
    if (node.type === 'VariableDeclarator' && node.id.name === '__returned__' && node.init?.type === 'ObjectExpression') {
      getters = node.init.properties.filter((p: any) => p.kind === 'get' && names.has(p.key?.name))
      getters.forEach(p => skip.add(p))
    }
    if (node.type === 'Identifier') {
      if (!(parent?.type === 'Property' && key === 'key' && !parent.computed)) used.add(node.name)
      return
    }
    for (const [k, value] of Object.entries(node)) {
      if (Array.isArray(value)) value.forEach(child => visit(child, node, k))
      else if (value && typeof value === 'object') visit(value, node, k)
    }
  }
  visit(ast)

  const inArg = new Set(referencedNames(arg))
  const moved = imports.filter((n: any) =>
    n.specifiers.every((s: any) => !used.has(s.local.name))
    && n.specifiers.some((s: any) => inArg.has(s.local.name)),
  )
  const movedNames = new Set(moved.flatMap((n: any) => n.specifiers.map((s: any) => s.local.name)))

  return { imports: moved, getters: getters.filter(p => movedNames.has(p.key.name)) }
}

/**
 * `import a, { b as c } from 'x'` -> `const { default: a, b: c } = await import('x')`
 */
function dynamicImport(node: any): string {
  const source = JSON.stringify(node.source.value)
  const namespace = node.specifiers.find((s: any) => s.type === 'ImportNamespaceSpecifier')
  const named = node.specifiers
    .filter((s: any) => s.type !== 'ImportNamespaceSpecifier')
    .map((s: any) => {
      if (s.type === 'ImportDefaultSpecifier') return `default: ${s.local.name}`
      const imported = s.imported.type === 'Identifier' ? s.imported.name : JSON.stringify(s.imported.value)
      return `${imported}: ${s.local.name}`
    })

  return [
    namespace && `const ${namespace.local.name} = await import(${source})`,
    named.length && `const { ${named.join(', ')} } = await import(${source})`,
  ].filter(Boolean).join('; ')
}

/**
 * Vite plugin that compiles the `definePreviewProps()` macro.
 *
 * Runs after plugin-vue (and TS stripping), so it sees plain JS. Blanks
 * out the call inside `setup()`, then re-exports the component wrapped
 * with `withPreviewProps()`, which gets the macro argument as a
 * lazy factory evaluated at module scope.
 */
export function previewProps(runtimePath: string): Plugin {
  return {
    name: 'maizzle:preview-props',
    enforce: 'post',
    transform(code, id) {
      if (!id.endsWith('.vue') || !code.includes(MACRO)) return

      const ast = parseAst(code) as any
      const calls: { node: any; block: any[] }[] = []

      const walk = (node: any, block: any[]): void => {
        if (!node || typeof node.type !== 'string') return
        if (
          node.type === 'ExpressionStatement'
          && node.expression.type === 'CallExpression'
          && node.expression.callee.type === 'Identifier'
          && node.expression.callee.name === MACRO
        ) {
          calls.push({ node, block })
          return
        }
        const inner = node.type === 'BlockStatement' ? node.body : block
        for (const value of Object.values(node)) {
          if (Array.isArray(value)) value.forEach(child => walk(child, inner))
          else if (value && typeof value === 'object') walk(value, inner)
        }
      }
      walk(ast, ast.body)

      if (calls.length === 0) return

      const exportDefault = ast.body.find((n: any) => n.type === 'ExportDefaultDeclaration')
      if (!exportDefault) return

      const [{ node: call, block }] = calls
      const arg = call.expression.arguments[0]

      /**
       * The argument is moved out of `setup()` to module scope, where
       * template variables don't exist. Vue hoists literal consts there
       * though, so check both scopes and reject either one, keeping
       * the rule simple: inline values and imports only.
       */
      let error: string | undefined
      if (calls.length > 1) {
        error = `${MACRO}() can only be called once per template.`
      } else if (arg) {
        const declared = new Set<string>()
        declaredNames(ast.body, declared)
        declaredNames(block, declared)

        const local = referencedNames(arg).find(name => declared.has(name))
        if (local) {
          error = `${MACRO}() cannot use \`${local}\` declared in this template.\nMove it to an import, or write the value inline.`
        }
      }

      /**
       * Mistakes throw from the factory instead of failing the compile:
       * it only runs in the dev server, so preview data can never
       * break `build` or a production `render()`.
       */
      const moved = !error && arg ? previewOnlyImports(ast, arg) : { imports: [], getters: [] }

      let factory = '() => ({})'
      if (error) {
        factory = `() => { throw new Error(${JSON.stringify(`[maizzle] ${error}`)}) }`
      } else if (moved.imports.length) {
        factory = `async () => { ${moved.imports.map(dynamicImport).join('; ')}; return (${code.slice(arg.start, arg.end)}) }`
      } else if (arg) {
        factory = `() => (${code.slice(arg.start, arg.end)})`
      }

      /**
       * Blank the calls, moved imports and their getters in place (keeping
       * newlines) so line numbers don't shift. A getter takes its comma
       * along, so the `__returned__` object stays valid.
       */
      const blank = (s: string) => s.replace(/[^\n]/g, ' ')
      const ranges = [
        ...calls.map(({ node }) => [node.start, node.end]),
        ...moved.imports.map(node => [node.start, node.end]),
        ...moved.getters.map(node => [node.start, node.end + (/^\s*,/.exec(code.slice(node.end))?.[0].length ?? 0)]),
      ].sort((a, b) => a[0] - b[0])

      let out = ''
      let cursor = 0
      for (const [start, end] of ranges) {
        out += code.slice(cursor, start) + blank(code.slice(start, end))
        cursor = end
      }

      out += code.slice(cursor, exportDefault.start)
        + 'const __maizzle_sfc = '
        + code.slice(exportDefault.declaration.start)
        + `\nimport { withPreviewProps as __maizzle_withPreviewProps } from ${JSON.stringify(runtimePath)}`
        + `\nexport default __maizzle_withPreviewProps(__maizzle_sfc, ${factory})\n`

      return { code: out, map: null }
    },
  }
}
