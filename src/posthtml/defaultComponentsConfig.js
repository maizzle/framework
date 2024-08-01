export default {
  root: './',
  folders: ['src/components', 'src/layouts', 'src/templates'],
  fileExtension: 'html',
  tag: 'component',
  expressions: {
    loopTags: ['each', 'for'],
    missingLocal: '{local}',
    strictMode: false,
  },
}
