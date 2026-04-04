import type { ChildNode } from 'domhandler'

export function walk(ast: ChildNode[], callback: (node: ChildNode) => void): void {
  function traverse(node: ChildNode) {
    callback(node)

    if ('children' in node && node.children && node.children.length > 0) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  for (const node of ast) {
    traverse(node)
  }
}
