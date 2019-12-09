class ComponentExtension {
  constructor (e) {
    this.engine = e
    this.tags = ['component']

    this.parse = function (parser, nodes, lexer) {
      // get the tag token
      const tok = parser.nextToken()

      // parse the args and move after the block end. passing true
      // as the second arg is required if there are no parentheses
      const args = parser.parseSignature(null, true)
      parser.advanceAfterBlockEnd(tok.value)

      // parse the body and possibly the error block, which is optional
      const body = parser.parseUntilBlocks('endcomponent')
      parser.advanceAfterBlockEnd()

      // See above for notes about CallExtension
      return new nodes.CallExtension(this, 'run', args, [body])
    }

    this.run = function (context, path, data, body) {
      if (typeof path !== 'string') {
        return
      }

      if (typeof data === 'function') {
        return new this.engine.runtime.SafeString(this.engine.render(path, { content: data() }))
      }

      return new this.engine.runtime.SafeString(this.engine.render(path, { content: body(), data }))
    }
  }
}

module.exports = ComponentExtension
