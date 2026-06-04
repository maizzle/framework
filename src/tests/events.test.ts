import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { EventManager } from '../events/index.ts'

const template = () => ({ source: 'original', path: path.parse('/emails/welcome.vue') })

describe('EventManager', () => {
  describe('fireBeforeRender', () => {
    it('replaces template.source when a handler returns a string', async () => {
      const events = new EventManager()
      events.on('beforeRender', () => 'replaced')

      const tpl = template()
      const result = await events.fireBeforeRender({ config: {}, template: tpl })

      expect(result).toBe('replaced')
      expect(tpl.source).toBe('replaced')
    })

    it('keeps the original source when a handler returns nothing', async () => {
      const events = new EventManager()
      events.on('beforeRender', () => {})

      const tpl = template()
      const result = await events.fireBeforeRender({ config: {}, template: tpl })

      expect(result).toBe('original')
      expect(tpl.source).toBe('original')
    })
  })

  describe('fireAfterRender', () => {
    it('replaces html when a handler returns a string', async () => {
      const events = new EventManager()
      events.on('afterRender', () => '<p>replaced</p>')

      const result = await events.fireAfterRender({ config: {}, template: template(), html: '<p>original</p>' })

      expect(result).toBe('<p>replaced</p>')
    })

    it('keeps html when a handler returns nothing', async () => {
      const events = new EventManager()
      events.on('afterRender', () => {})

      const result = await events.fireAfterRender({ config: {}, template: template(), html: '<p>original</p>' })

      expect(result).toBe('<p>original</p>')
    })
  })

  describe('fireAfterTransform', () => {
    it('replaces html when a handler returns a string', async () => {
      const events = new EventManager()
      events.on('afterTransform', () => '<p>replaced</p>')

      const result = await events.fireAfterTransform({ config: {}, template: template(), html: '<p>original</p>' })

      expect(result).toBe('<p>replaced</p>')
    })

    it('keeps html when a handler returns nothing', async () => {
      const events = new EventManager()
      events.on('afterTransform', () => {})

      const result = await events.fireAfterTransform({ config: {}, template: template(), html: '<p>original</p>' })

      expect(result).toBe('<p>original</p>')
    })
  })

  describe('clearSfcHandlers', () => {
    it('keeps config handlers and drops SFC handlers', async () => {
      const events = new EventManager()
      events.registerConfig({ beforeRender: () => 'config' })
      events.on('beforeRender', () => 'sfc')

      events.clearSfcHandlers()

      const result = await events.fireBeforeRender({ config: {}, template: template() })
      expect(result).toBe('config')
    })

    it('drops every handler when no config was registered', async () => {
      const events = new EventManager()
      events.on('beforeRender', () => 'sfc')

      events.clearSfcHandlers()

      const result = await events.fireBeforeRender({ config: {}, template: template() })
      expect(result).toBe('original')
    })
  })

  describe('clear', () => {
    it('removes all registered handlers', async () => {
      const events = new EventManager()
      events.on('beforeRender', () => 'replaced')

      events.clear()

      const tpl = template()
      const result = await events.fireBeforeRender({ config: {}, template: tpl })

      expect(result).toBe('original')
    })
  })
})
