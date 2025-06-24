// biome-ignore lint: need it globally
var lastKnownScrollPosition = 0

function connectWebSocket() {
  if (!('WebSocket' in window)) {
    // Force reload if WebSocket is not supported
    window.location.reload()
  }

  const { hostname, port } = window.location
  const socket = new WebSocket(`ws://${hostname}:${port}`)

  /**
   * Synchronized scrolling
   * Sends the scroll position to the server
   */
  function handleScroll() {
    socket.send(JSON.stringify({
      type: 'scroll',
      position: window.scrollY
    }))
  }

  function scrollHandler() {
    lastKnownScrollPosition = window.scrollY
    requestAnimationFrame(handleScroll)
  }

  window.addEventListener('scroll', scrollHandler)

  socket.addEventListener('message', async event => {
    const data = JSON.parse(event.data)

    if (data.type === 'scroll' && data.scrollSync === true) {
      window.scrollTo(0, data.position)
    }

    if (data.type === 'change') {
      if (data.hmr === true) {
        // Use morphdom to update the existing DOM with the new content
        morphdom(document.documentElement, data.content, {
          childrenOnly: true,
          onBeforeElUpdated(fromEl, toEl) {
            // Speed-up trick from morphdom docs - https://dom.spec.whatwg.org/#concept-node-equals
            if (fromEl.isEqualNode(toEl)) {
              return false
            }

            return true
          },
          onElUpdated(el) {
            // Handle broken images updates, like incorrect file paths
            if (el.tagName === 'IMG' && !el.complete) {
              const img = new Image()
              img.src = el.src
              el.src = ''

              img.onload = () => {
                el.src = img.src
              }
            }
          },
        })
      } else {
        // Reload the page
        window.location.reload()
      }

      /**
       * Fix for attributes not being updated on <html> tag
       * Borrowed from https://github.com/11ty/eleventy-dev-server/
       */
      const parser = new DOMParser()
      const parsed = parser.parseFromString(data.content, 'text/html')
      const parsedDoc = parsed.documentElement
      const newAttrs = parsedDoc.getAttributeNames()
      const docEl = document.documentElement

      // Remove old attributes
      const removedAttrs = docEl.getAttributeNames().filter(name => !newAttrs.includes(name))
      for (const attr of removedAttrs) {
        docEl.removeAttribute(attr)
      }

      // Add new attributes
      for (const attr of newAttrs) {
        docEl.setAttribute(attr, parsedDoc.getAttribute(attr))
      }
    }

    if (['add', 'unlink'].includes(data.type)) {
      if (data.hmr === true) {
        const randomNumber = Math.floor(Math.random() * 10 ** 16).toString().padStart(16, '0')

        /**
         * Cache busting for images
         *
         * Appends a `?v=` cache-busting parameter to image sources
         * every time a file is added or removed. This forces the
         * browser to re-download the image and immediately
         * reflect the changes through HMR.
         */

        // For all elements with `src` attributes
        const srcElements = document.querySelectorAll('[src]')

        srcElements.forEach(el => {
          // Update the value of 'v' parameter if it already exists
          if (el.src.includes('?')) {
            el.src = el.src.replace(/([?&])v=[^&]*/, `$1v=${randomNumber}`)
          } else {
            // Add 'v' parameter
            el.src += `?v=${randomNumber}`
          }
        })

        // For `background` attributes
        const htmlBgElements = document.querySelectorAll('[background]')

        htmlBgElements.forEach(el => {
          const bgValue = el.getAttribute('background')
          if (bgValue) {
            // Update the value of 'v' parameter if it already exists
            if (bgValue.includes('?')) {
              el.setAttribute('background', bgValue.replace(/([?&])v=[^&]*/, `$1v=${randomNumber}`))
            } else {
              // Add 'v' parameter
              el.setAttribute('background', `${bgValue}?v=${randomNumber}`)
            }
          }
        })

        // For inline CSS `background` properties
        const styleElements = document.querySelectorAll('[style]')

        styleElements.forEach(el => {
          const styleAttribute = el.getAttribute('style')
          if (styleAttribute) {
            const urlPattern = /(url\(["']?)(.*?)(["']?\))/g
            // Replace URLs in style attribute with cache-busting parameter
            const updatedStyleAttribute = styleAttribute.replace(urlPattern, (_match, p1, p2, p3) => {
              // Update the value of 'v' parameter if it already exists
              if (p2.includes('?')) {
                  return `${p1}${p2.replace(/([?&])v=[^&]*/, `$1v=${randomNumber}`)}${p3}`
              }

              // Add 'v' parameter
              return `${p1}${p2}?v=${randomNumber}${p3}`
            })

            // Update style attribute
            el.setAttribute('style', updatedStyleAttribute)
          }
        })
      } else {
        // Reload the page
        window.location.reload()
      }
    }
  })

  socket.addEventListener('close', () => {
    window.removeEventListener('scroll', scrollHandler)

    // debug only:
    console.log('WebSocket connection closed. Reconnecting...')

    // Reconnect after a short delay
    setTimeout(() => {
      connectWebSocket()
    }, 1000)
  })

  // Handle connection opened
  socket.addEventListener('open', _event => {
    console.log('WebSocket connection opened')
  })

  return socket
}

connectWebSocket()
