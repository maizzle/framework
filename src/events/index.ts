import type { MaizzleConfig } from '../types/index.ts'

export type EventName = 'beforeCreate' | 'beforeRender' | 'afterRender' | 'afterTransform' | 'afterBuild'

export interface EventMap {
  beforeCreate: (params: { config: MaizzleConfig }) => void | Promise<void>
  beforeRender: (params: { config: MaizzleConfig; template: string }) => string | void | Promise<string | void>
  afterRender: (params: { config: MaizzleConfig; template: string; html: string }) => string | void | Promise<string | void>
  afterTransform: (params: { config: MaizzleConfig; template: string; html: string }) => string | void | Promise<string | void>
  afterBuild: (params: { files: string[]; config: MaizzleConfig }) => void | Promise<void>
}

/**
 * Central event manager that collects handlers from config and useEvent() calls.
 *
 * Handlers are run in order: config handler first, then SFC handlers in registration order.
 * For events that return a value (beforeRender, afterRender, afterTransform),
 * the returned value replaces the corresponding input for the next handler.
 */
export class EventManager {
  private handlers = new Map<EventName, EventMap[EventName][]>()

  /**
   * Register handlers from the Maizzle config.
   */
  registerConfig(config: MaizzleConfig) {
    const eventNames: EventName[] = ['beforeCreate', 'beforeRender', 'afterRender', 'afterTransform', 'afterBuild']

    for (const name of eventNames) {
      const handler = config[name]
      if (typeof handler === 'function') {
        this.on(name, handler as EventMap[typeof name])
      }
    }
  }

  /**
   * Register a handler for an event (used by useEvent composable).
   */
  on<K extends EventName>(name: K, handler: EventMap[K]) {
    if (!this.handlers.has(name)) {
      this.handlers.set(name, [])
    }

    this.handlers.get(name)!.push(handler)
  }

  /**
   * Fire beforeCreate — runs all handlers, config is mutated in place.
   */
  async fireBeforeCreate(params: { config: MaizzleConfig }) {
    const handlers = this.handlers.get('beforeCreate') ?? []

    for (const handler of handlers) {
      await (handler as EventMap['beforeCreate'])(params)
    }
  }

  /**
   * Fire beforeRender — if a handler returns a string, it replaces `template`.
   */
  async fireBeforeRender(params: { config: MaizzleConfig; template: string }): Promise<string> {
    const handlers = this.handlers.get('beforeRender') ?? []

    let { template } = params

    for (const handler of handlers) {
      const result = await (handler as EventMap['beforeRender'])({ config: params.config, template })

      if (typeof result === 'string') {
        template = result
      }
    }

    return template
  }

  /**
   * Fire afterRender — if a handler returns a string, it replaces `html`.
   */
  async fireAfterRender(params: { config: MaizzleConfig; template: string; html: string }): Promise<string> {
    const handlers = this.handlers.get('afterRender') ?? []

    let { html } = params

    for (const handler of handlers) {
      const result = await (handler as EventMap['afterRender'])({ config: params.config, template: params.template, html })

      if (typeof result === 'string') {
        html = result
      }
    }

    return html
  }

  /**
   * Fire afterTransform — if a handler returns a string, it replaces `html`.
   */
  async fireAfterTransform(params: { config: MaizzleConfig; template: string; html: string }): Promise<string> {
    const handlers = this.handlers.get('afterTransform') ?? []

    let { html } = params

    for (const handler of handlers) {
      const result = await (handler as EventMap['afterTransform'])({ config: params.config, template: params.template, html })

      if (typeof result === 'string') {
        html = result
      }
    }

    return html
  }

  /**
   * Fire afterBuild — runs all handlers with the file list.
   */
  async fireAfterBuild(params: { files: string[]; config: MaizzleConfig }) {
    const handlers = this.handlers.get('afterBuild') ?? []

    for (const handler of handlers) {
      await (handler as EventMap['afterBuild'])(params)
    }
  }

  /**
   * Clear all handlers (useful between builds or for per-template SFC handlers).
   */
  clearSfcHandlers() {
    // We keep the first handler per event (from config) and remove the rest (from SFCs)
    for (const [name, handlers] of this.handlers) {
      if (handlers.length > 1) {
        this.handlers.set(name, [handlers[0]])
      }
    }
  }

  /**
   * Clear all handlers entirely.
   */
  clear() {
    this.handlers.clear()
  }
}
