declare module 'postcss-sort-media-queries' {
  import type postcss from 'postcss'
  function sortMediaQueries(options?: { sort?: 'mobile-first' | 'desktop-first' | ((a: string, b: string) => number) }): postcss.Plugin
  export = sortMediaQueries
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
