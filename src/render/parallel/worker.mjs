// Tinypool worker entry. Plain JS so it loads in a raw worker thread without a
// TS toolchain. In the published dist the implementation is already compiled to
// `.js` and is imported natively (fast); during dev/tests only the `.ts` source
// exists and is loaded through jiti.
import { fileURLToPath, pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'

let implPromise

function loadImpl() {
  if (!implPromise) {
    const jsPath = fileURLToPath(new URL('./buildWorker.js', import.meta.url))
    if (existsSync(jsPath)) {
      implPromise = import(pathToFileURL(jsPath).href)
    } else {
      const tsPath = fileURLToPath(new URL('./buildWorker.ts', import.meta.url))
      implPromise = import('jiti').then(({ createJiti }) =>
        createJiti(fileURLToPath(import.meta.url)).import(tsPath),
      )
    }
  }
  return implPromise
}

export default async function buildWorker(data) {
  const impl = await loadImpl()
  return impl.run(data)
}
