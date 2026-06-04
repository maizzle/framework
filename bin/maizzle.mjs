#!/usr/bin/env node

import { createJiti } from 'jiti'
import { fileURLToPath } from 'node:url'

const jiti = createJiti(fileURLToPath(import.meta.url), { interopDefault: true })
const { default: bootstrap } = await jiti.import('maizzle')
const framework = await jiti.import('../dist/index.js')

await bootstrap(framework)
