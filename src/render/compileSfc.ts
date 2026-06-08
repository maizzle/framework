import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { transform as sucrase } from 'sucrase'
import type { Component } from 'vue'
import { moduleRegistry, autoImportScope } from './browserModules.ts'

export interface CompileSfcOptions {
  /** Virtual filename for the SFC (affects error messages + scope id). */
  filename?: string
  /** Extra bare specifiers resolvable via `import` inside the SFC. */
  modules?: Record<string, unknown>
}

let uid = 0

function hashId(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i)
  return (h >>> 0).toString(36)
}

const isCustomElement = (tag: string) => tag.startsWith('amp-')

/**
 * Compile a single-file-component source string into a runnable Vue
 * component, in-process and without a bundler. Mirrors what Vite +
 * `@vitejs/plugin-vue` do at build time:
 *
 * 1. parse the SFC, 2. compile `<script>`/`<script setup>` and the template
 * (SSR codegen), 3. stitch them into one ES module, 4. rewrite every
 * `import` to a lookup against {@link moduleRegistry} (+ caller `modules`),
 * 5. evaluate via `new Function` with the auto-import scope in scope.
 *
 * Requires a runtime that permits code evaluation (browser, Node, Bun,
 * Deno). V8-isolate edge runtimes (Cloudflare Workers, Vercel Edge) forbid
 * `new Function` — render precompiled components there instead.
 */
export async function compileSfcToComponent(source: string, opts: CompileSfcOptions = {}): Promise<Component> {
  const filename = opts.filename ?? `MaizzleSfc${uid++}.vue`
  const id = hashId(filename + source)

  const { descriptor, errors } = parse(source, { filename })
  if (errors.length) {
    throw new Error(`[maizzle] SFC parse error in ${filename}:\n${errors.map(e => e.message).join('\n')}`)
  }

  const hasScript = !!(descriptor.script || descriptor.scriptSetup)

  let scriptCode: string
  let bindings: Record<string, any> | undefined
  if (hasScript) {
    const script = compileScript(descriptor, {
      id,
      inlineTemplate: false,
    })
    bindings = script.bindings
    // Turn the component's default export into a named local we can augment.
    scriptCode = rewriteDefaultExport(script.content)
  }
  else {
    scriptCode = 'const __sfc_main = {}'
  }

  let templateCode = ''
  if (descriptor.template) {
    const template = compileTemplate({
      source: descriptor.template.content,
      filename,
      id,
      ssr: true,
      ssrCssVars: [],
      compilerOptions: {
        bindingMetadata: bindings,
        isCustomElement,
      },
    })
    if (template.errors.length) {
      throw new Error(`[maizzle] SFC template error in ${filename}:\n${template.errors.map(String).join('\n')}`)
    }
    // `export function ssrRender` -> local function we attach to the component.
    templateCode = template.code.replace(/export\s+function\s+ssrRender/, 'function ssrRender')
  }

  const assembled = [
    scriptCode,
    templateCode,
    descriptor.template ? '__sfc_main.ssrRender = ssrRender' : '',
    `__sfc_main.__file = ${JSON.stringify(filename)}`,
    'export default __sfc_main',
  ].filter(Boolean).join('\n')

  // `compileScript`/`compileTemplate` leave TypeScript in both the script
  // (`x as T`, type imports) and template expressions (`$attrs.style as any`,
  // `foo!`). Vite transpiles this downstream — do it here with sucrase.
  const transpiled = sucrase(assembled, { transforms: ['typescript'], filePath: filename }).code

  const requireFn = (spec: string): unknown => {
    const mod = opts.modules?.[spec] ?? moduleRegistry[spec]
    if (mod === undefined) {
      throw new Error(`[maizzle] Cannot resolve import "${spec}" while compiling ${filename}. Pass it via the \`modules\` option or register the referenced component.`)
    }
    return mod
  }

  const component = await evaluateModule(transpiled, requireFn)
  return component as Component
}

/** Replace the first `export default` with a named binding we can extend. */
function rewriteDefaultExport(code: string): string {
  const idx = code.indexOf('export default')
  if (idx === -1) return `${code}\nconst __sfc_main = {}`
  return `${code.slice(0, idx)}const __sfc_main =${code.slice(idx + 'export default'.length)}`
}

/**
 * Pick the execution engine. `new Function` is the fast path, but V8-isolate
 * edge runtimes (Cloudflare Workers, Vercel Edge) forbid it — there we fall
 * back to a pure-JS interpreter (sval), which walks the AST without host eval.
 * `MZ_ENGINE` forces a choice (testing). Result is cached.
 */
let cachedEngine: 'native' | 'interpreter' | null = null
function selectEngine(): 'native' | 'interpreter' {
  if (cachedEngine) return cachedEngine
  const forced = typeof process !== 'undefined' ? process.env?.MZ_ENGINE : undefined
  if (forced === 'native' || forced === 'interpreter') return (cachedEngine = forced)
  try {
    // eslint-disable-next-line no-new-func
    new Function('return 1')()
    cachedEngine = 'native'
  }
  catch {
    cachedEngine = 'interpreter'
  }
  return cachedEngine
}

/**
 * Rewrite imports/exports to a manual module system and evaluate. Imports
 * become `const` bindings from `__require`; the default export is assigned to
 * `__exports`; auto-import names (`ref`, `useConfig`, …) resolve from the
 * injected scope (a `with` block on the native path, injected globals on the
 * interpreter path), so local declarations shadow them without collisions.
 */
async function evaluateModule(code: string, requireFn: (spec: string) => unknown): Promise<unknown> {
  let body = code

  /**
   * Rewrite static imports to `const` bindings from `__require`. We use a
   * regex rather than `es-module-lexer` because the lexer isn't no-eval-safe
   * (under `--disallow-code-generation-from-strings` / V8-isolate edges it
   * returns `undefined` specifiers). The input is clean machine-generated code
   * (Vue codegen + sucrase), so a regex is robust here. Dynamic `import(...)`
   * has no `from`/leading quote, so it's left untouched.
   */
  // Lookbehind `(?<![\w$.])` anchors on a real `import` keyword (after `}`,
  // newline, `;`, … but not inside an identifier or property access) — sucrase
  // hoists helpers that can end in `}` right before an import, so a fixed
  // leading-char anchor isn't enough. Dynamic `import(...)` has no `from`/
  // leading quote, so it's left untouched.
  body = body.replace(
    /(?<![\w$.])import\b([\s\S]*?)\bfrom\s*['"]([^'"]+)['"][ \t]*;?/g,
    (_m, clause: string, spec: string) => rewriteImportClause(clause.trim(), spec),
  )
  // Side-effect import: `import "x"` (no bindings)
  body = body.replace(
    /(?<![\w$.])import\s*['"]([^'"]+)['"][ \t]*;?/g,
    (_m, spec: string) => `__require(${JSON.stringify(spec)});`,
  )

  // Default export -> __exports.default
  body = body.replace(/export\s+default\s+/, '__exports.default = ')
  // Drop strict-mode directive (illegal inside the `with` block below).
  body = body.replace(/^\s*["']use strict["'];?/m, '')

  const exportsObj: Record<string, unknown> = {}
  // `with (__scope)` lets free identifiers resolve to auto-imports while local
  // declarations shadow them — same semantics on both engines (sval supports
  // `with`), so neither lexically declares the scope names (no collisions).
  const wrapped = `with (__scope) {\n${body}\n}`

  if (selectEngine() === 'interpreter') {
    const Sval = (await import('sval')).default
    const sval = new Sval({ ecmaVer: 2023, sandBox: true })
    sval.import({ __require: requireFn, __exports: exportsObj, __scope: autoImportScope })
    sval.run(wrapped)
    return exportsObj.default
  }

  // eslint-disable-next-line no-new-func
  const fn = new Function('__require', '__exports', '__scope', wrapped)
  fn(requireFn, exportsObj, autoImportScope)
  return exportsObj.default
}

/** Translate one import clause (the part between `import` and `from`) into `const` bindings. */
function rewriteImportClause(clause: string, spec: string): string {
  const mod = `__require(${JSON.stringify(spec)})`
  const parts: string[] = []

  const braceStart = clause.indexOf('{')
  const head = (braceStart === -1 ? clause : clause.slice(0, braceStart)).replace(/,\s*$/, '').trim()
  const braces = braceStart === -1 ? '' : clause.slice(braceStart + 1, clause.lastIndexOf('}'))

  if (head.startsWith('* as ')) {
    parts.push(`const ${head.slice(5).trim()} = ${mod};`)
  }
  else if (head) {
    // default import with interop (real ESM default or namespace-as-default)
    parts.push(`const ${head} = (${mod} && ${mod}.default !== undefined) ? ${mod}.default : ${mod};`)
  }

  if (braces.trim()) {
    const specifiers = braces.split(',').map(s => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^(\S+)\s+as\s+(\S+)$/)
      return m ? `${m[1]}: ${m[2]}` : s
    })
    parts.push(`const { ${specifiers.join(', ')} } = ${mod};`)
  }

  return parts.join('\n')
}
