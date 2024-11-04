export default {
  root: './',
  tag: 'component',
  fileExtension: 'html',
  folders: ['src/components', 'src/layouts', 'src/templates'],
  expressions: {
    loopTags: ['each', 'for'],
    missingLocal: '{local}',
    strictMode: false,
  },
  parserOptions: {
    directives: [
      { name: '?php', start: '<', end: '>' },
    ]
  },
}
