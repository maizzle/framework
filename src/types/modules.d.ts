declare module 'postcss-sort-media-queries' {
  import type postcss from 'postcss'
  function sortMediaQueries(options?: { sort?: 'mobile-first' | 'desktop-first' | ((a: string, b: string) => number) }): postcss.Plugin
  export = sortMediaQueries
}
