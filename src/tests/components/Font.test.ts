import { describe, it, expect } from 'vitest'
import { createSSRApp, h, defineComponent } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Font from '../../components/Font.vue'
import { RenderContextKey, type RenderContext } from '../../composables/renderContext.ts'

async function renderFont(props: Record<string, any>): Promise<RenderContext> {
  const ctx: RenderContext = { sfcEventHandlers: [] }
  const Wrapper = defineComponent({
    setup() {
      return () => h(Font, props)
    },
  })
  const app = createSSRApp(Wrapper)
  app.provide(RenderContextKey, ctx)
  await renderToString(app)
  return ctx
}

describe('Font', () => {
  it('registers a font in the render context', async () => {
    const ctx = await renderFont({ family: 'Roboto' })
    expect(ctx.fonts).toHaveLength(1)
    expect(ctx.fonts![0].family).toBe('Roboto')
  })

  describe('Google Fonts URL', () => {
    it('builds default URL with single weight', async () => {
      const ctx = await renderFont({ family: 'Roboto' })
      expect(ctx.fonts![0].url).toBe('https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap')
    })

    it('sorts multiple weights ascending', async () => {
      const ctx = await renderFont({ family: 'Roboto', weights: [600, 400] })
      expect(ctx.fonts![0].url).toContain('family=Roboto:wght@400;600')
    })

    it('encodes spaces in family as +', async () => {
      const ctx = await renderFont({ family: 'Open Sans' })
      expect(ctx.fonts![0].url).toContain('family=Open+Sans')
    })

    it('respects display prop', async () => {
      const ctx = await renderFont({ family: 'Roboto', display: 'optional' })
      expect(ctx.fonts![0].url).toContain('display=optional')
    })

    it('builds italic axis when styles includes italic', async () => {
      const ctx = await renderFont({ family: 'Roboto', weights: [400, 600], styles: ['normal', 'italic'] })
      expect(ctx.fonts![0].url).toContain('family=Roboto:ital,wght@0,400;1,400;0,600;1,600')
    })

    it('emits italic-only axis when styles is [italic]', async () => {
      const ctx = await renderFont({ family: 'Roboto', styles: ['italic'] })
      expect(ctx.fonts![0].url).toContain('family=Roboto:ital,wght@1,400')
    })
  })

  describe('custom URL', () => {
    it('uses provided url as-is', async () => {
      const url = 'https://fonts.bunny.net/css?family=roboto:400,600'
      const ctx = await renderFont({ family: 'Roboto', url })
      expect(ctx.fonts![0].url).toBe(url)
    })
  })

  describe('provider', () => {
    it('builds a Bunny Fonts URL when provider="bunny"', async () => {
      const ctx = await renderFont({ family: 'Open Sans', provider: 'bunny', weights: [400, 700] })
      expect(ctx.fonts![0].url).toBe('https://fonts.bunny.net/css2?family=Open+Sans:wght@400;700&display=swap')
    })

    it('respects display + italic on Bunny URL', async () => {
      const ctx = await renderFont({
        family: 'Roboto',
        provider: 'bunny',
        weights: [400],
        styles: ['normal', 'italic'],
        display: 'optional',
      })
      expect(ctx.fonts![0].url).toBe('https://fonts.bunny.net/css2?family=Roboto:ital,wght@0,400;1,400&display=optional')
    })

    it('defaults to google when provider is omitted', async () => {
      const ctx = await renderFont({ family: 'Roboto' })
      expect(ctx.fonts![0].url).toContain('fonts.googleapis.com')
    })

    it('user-supplied url wins over provider', async () => {
      const ctx = await renderFont({
        family: 'Roboto',
        provider: 'bunny',
        url: 'https://example.com/custom.css',
      })
      expect(ctx.fonts![0].url).toBe('https://example.com/custom.css')
    })
  })

  describe('declaration', () => {
    it('does not quote single-word families', async () => {
      const ctx = await renderFont({ family: 'Roboto' })
      expect(ctx.fonts![0].declaration).toBe(`Roboto, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`)
    })

    it('double-quotes multi-word families', async () => {
      const ctx = await renderFont({ family: 'Open Sans' })
      expect(ctx.fonts![0].declaration).toBe(`"Open Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`)
    })

    it('uses category-default fallback for known serif family', async () => {
      const ctx = await renderFont({ family: 'Merriweather' })
      expect(ctx.fonts![0].declaration).toBe(`Merriweather, ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`)
    })

    it('uses category-default fallback for known display family', async () => {
      const ctx = await renderFont({ family: 'Lobster' })
      expect(ctx.fonts![0].declaration).toBe(`Lobster, Impact, "Arial Black", system-ui, sans-serif`)
    })

    it('uses category-default fallback for known mono family', async () => {
      const ctx = await renderFont({ family: 'JetBrains Mono' })
      expect(ctx.fonts![0].declaration).toBe(`"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`)
    })

    it('uses category-default fallback for known handwriting family', async () => {
      const ctx = await renderFont({ family: 'Caveat' })
      expect(ctx.fonts![0].declaration).toBe(`Caveat, "Segoe Script", "Brush Script MT", cursive`)
    })

    it('falls back to sans default for unknown family', async () => {
      const ctx = await renderFont({ family: 'Unknown Family', url: 'https://fonts.bunny.net/css?family=unknown' })
      expect(ctx.fonts![0].declaration).toBe(`"Unknown Family", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`)
    })

    it('user-provided fallback overrides default', async () => {
      const ctx = await renderFont({ family: 'Roboto', fallback: 'Verdana, sans-serif' })
      expect(ctx.fonts![0].declaration).toBe('Roboto, Verdana, sans-serif')
    })

    it('applies default fallback when using a custom url', async () => {
      const ctx = await renderFont({
        family: 'Lobster',
        url: 'https://fonts.bunny.net/css?family=lobster',
      })
      expect(ctx.fonts![0].declaration).toBe(`Lobster, Impact, "Arial Black", system-ui, sans-serif`)
    })
  })

  describe('slug', () => {
    it('lowercases single-word family', async () => {
      const ctx = await renderFont({ family: 'Roboto' })
      expect(ctx.fonts![0].slug).toBe('roboto')
    })

    it('hyphenates multi-word family', async () => {
      const ctx = await renderFont({ family: 'Open Sans' })
      expect(ctx.fonts![0].slug).toBe('open-sans')
    })
  })

  it('renders no DOM output', async () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    const Wrapper = defineComponent({
      setup() {
        return () => h(Font, { family: 'Roboto' })
      },
    })
    const app = createSSRApp(Wrapper)
    app.provide(RenderContextKey, ctx)
    const html = await renderToString(app)
    expect(html).toBe('<!---->')
  })
})
