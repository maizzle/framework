import { Parser, type ParserOptions } from 'htmlparser2'
import { DomHandler } from 'domhandler'
import type { ChildNode } from 'domhandler'

export function parse(html: string, options: ParserOptions = {}): ChildNode[] {
  const handler = new DomHandler()
  const parser = new Parser(handler, options)
  parser.write(html)
  parser.end()
  return handler.dom
}
