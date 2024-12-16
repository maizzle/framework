import { defu as merge } from 'defu'

export function getPosthtmlOptions(userConfigOptions = {}) {
  return merge(
    userConfigOptions,
    {
      recognizeNoValueAttribute: true,
      recognizeSelfClosing: true,
      directives: [
        { name: '?php', start: '<', end: '>' },
      ],
    }
  )
}
