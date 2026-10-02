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
      const factory = error
        ? `() => { throw new Error(${JSON.stringify(`[maizzle] ${error}`)}) }`
        : arg ? `() => (${code.slice(arg.start, arg.end)})` : '() => ({})'

      // Blank the calls in place (keeping newlines) so line numbers don't shift.
      const blank = (s: string) => s.replace(/[^\n]/g, ' ')

      let out = ''
      let cursor = 0
      for (const { node } of calls) {
        out += code.slice(cursor, node.start) + blank(code.slice(node.start, node.end))
        cursor = node.end
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
