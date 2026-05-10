import { parentPort, workerData } from 'node:worker_threads'
import { bundleEmails } from './bundleEmails.ts'

if (!parentPort) {
  throw new Error('bundleWorker must be run as a worker thread')
}

const result = await bundleEmails(workerData)
parentPort.postMessage(result)
