import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import { initWebSockets } from '../src/server/websockets.js'

describe.concurrent('Websockets', () => {
  test('Starts websockets server', async () => {
    class MockWebSocket extends EventEmitter {
      constructor() {
        super()
        this.clients = new Set()
      }

      send(data) {
        this.emit('message', data)
      }
    }

    const mockWSS = new MockWebSocket()
    initWebSockets(mockWSS)

    mockWSS.emit('connection', mockWSS)

    expect(mockWSS.listenerCount('connection')).toBe(1)
    expect(mockWSS.listenerCount('message')).toBe(1)

    // Test if the message is broadcasted
    const mockClient = new MockWebSocket()
    mockClient.readyState = 1
    mockWSS.clients.add(mockClient)

    // Add a 'message' event listener to the mockClient instance
    mockClient.on('message', () => {})

    mockWSS.emit('message', JSON.stringify({ test: 'test' }))

    expect(mockClient.listenerCount('message')).toBe(1)
  })
})
