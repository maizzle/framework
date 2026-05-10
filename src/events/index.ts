import type { MaizzleConfig } from '../types/index.ts'

export type EventName = 'beforeCreate' | 'beforeRender' | 'afterRender' | 'afterTransform' | 'afterBuild'

export interface EventMap {
  beforeCreate: (params: { config: MaizzleConfig }) => void | Promise<void>
  beforeRender: (params: { config: MaizzleConfig; template: string }) => string | void | Promise<string | void>
  afterRender: (params: { config: MaizzleConfig; template: string; html: string }) => string | void | Promise<string | void>
  afterTransform: (params: { config: MaizzleConfig; template: string; html: string }) => string | void | Promise<string | void>
  afterBuild: (params: { files: string[]; config: MaizzleConfig }) => void | Promise<void>
}

export type SfcHandlerEntry = { name: EventName; handler: EventMap[EventName] }

/**
 * Central event manager that holds config-registered handlers.
 *
 * SFC handlers are NOT stored on the manager — they're passed per-fire as
 * `extraHandlers`, so concurrent renders can each carry their own handler
 * set without racing on shared state.
 *
 * Order: config handlers first, then per-call SFC handlers (in registration
 * order). For events that return a value (beforeRender, afterRender,
 * afterTransform), the returned value replaces the input for the next handler.
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
   * Register a config-level handler (build-scoped, persistent).
   */
  on<K extends EventName>(name: K, handler: EventMap[K]) {
    if (!this.handlers.has(name)) {
      this.handlers.set(name, [])
    }

    this.handlers.get(name)!.push(handler)
  }

  private collect<K extends EventName>(name: K, extraHandlers?: SfcHandlerEntry[]): EventMap[K][] {
    const config = (this.handlers.get(name) ?? []) as EventMap[K][]
    if (!extraHandlers || extraHandlers.length === 0) return config
    const sfc = extraHandlers
      .filter(e => e.name === name)
      .map(e => e.handler as EventMap[K])
    return [...config, ...sfc]
  }

  /**
   * Fire beforeCreate — runs all handlers, config is mutated in place.
   */
  async fireBeforeCreate(params: { config: MaizzleConfig }) {
    for (const handler of this.collect('beforeCreate')) {
      await handler(params)
    }
  }

  /**
   * Fire beforeRender — if a handler returns a string, it replaces `template`.
   */
  async fireBeforeRender(
    params: { config: MaizzleConfig; template: string },
    extraHandlers?: SfcHandlerEntry[],
  ): Promise<string> {
    let { template } = params

    for (const handler of this.collect('beforeRender', extraHandlers)) {
      const result = await handler({ config: params.config, template })
      if (typeof result === 'string') {
        template = result
      }
    }

    return template
  }

  /**
   * Fire afterRender — if a handler returns a string, it replaces `html`.
   */
  async fireAfterRender(
    params: { config: MaizzleConfig; template: string; html: string },
    extraHandlers?: SfcHandlerEntry[],
  ): Promise<string> {
    let { html } = params

    for (const handler of this.collect('afterRender', extraHandlers)) {
      const result = await handler({ config: params.config, template: params.template, html })
      if (typeof result === 'string') {
        html = result
      }
    }

    return html
  }

  /**
   * Fire afterTransform — if a handler returns a string, it replaces `html`.
   */
  async fireAfterTransform(
    params: { config: MaizzleConfig; template: string; html: string },
    extraHandlers?: SfcHandlerEntry[],
  ): Promise<string> {
    let { html } = params

    for (const handler of this.collect('afterTransform', extraHandlers)) {
      const result = await handler({ config: params.config, template: params.template, html })
      if (typeof result === 'string') {
        html = result
      }
    }

    return html
  }

  /**
   * Fire afterBuild — runs all handlers with the file list.
   */
  async fireAfterBuild(
    params: { files: string[]; config: MaizzleConfig },
    extraHandlers?: SfcHandlerEntry[],
  ) {
    for (const handler of this.collect('afterBuild', extraHandlers)) {
      await handler(params)
    }
  }

  /**
   * Clear all handlers entirely.
   */
  clear() {
    this.handlers.clear()
  }
}
