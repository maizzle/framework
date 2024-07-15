import WebSocket from 'ws'

export function initWebSockets(wss, options = {}) {
  options.shouldScroll = options.shouldScroll || false
  options.useHmr = options.useHmr || true

  wss.on('connection', ws => {
    // Handle incoming messages from the client
    ws.on('message', message => {
      const parsedMessage = JSON.parse(message)

      /**
       * Broadcast message back to all connected clients
       * We use it to send the scroll position back so other clients can follow
       */
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            ...parsedMessage,
            scrollSync: options.shouldScroll,
            hmr: options.useHmr
          }))
        }
      })
    })
  })
}
