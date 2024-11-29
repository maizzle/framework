export default {
  root: './',
  tag: 'component',
  fileExtension: ['html'],
  folders: [
    'layouts',
    'emails',
    'templates',
    'components',
    'src/layouts',
    'src/templates',
    'src/components'
  ],
  expressions: {
    loopTags: ['each', 'for'],
    missingLocal: '{local}',
    strictMode: false,
  },
}
