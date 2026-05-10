import type { ParsedPath } from 'node:path'
import type { MaizzleConfig } from '../types/index.ts'

export type EventName = 'beforeCreate' | 'beforeRender' | 'afterRender' | 'afterTransform' | 'afterBuild'

/**
 * Info about the template currently being processed, passed to per-template
 * event handlers. `source` is the SFC file contents; `path` is the result of
 * `path.parse(absolutePath)` — `{ root, dir, base, ext, name }`.
 */
export interface TemplateInfo {
  source: string
  path: ParsedPath
}

export interface EventMap {
  beforeCreate: (params: { config: MaizzleConfig }) => void | Promise<void>
  beforeRender: (params: { config: MaizzleConfig; template: TemplateInfo }) => string | void | Promise<string | void>
  afterRender: (params: { config: MaizzleConfig; template: TemplateInfo; html: string }) => string | void | Promise<string | void>
  afterTransform: (params: { config: MaizzleConfig; template: TemplateInfo; html: string }) => string | void | Promise<string | void>
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
  // Snapshot of config-handler counts per event, captured at registerConfig().
  // clearSfcHandlers() truncates each list back to this count, dropping any
  // SFC-registered handlers that were appended after.
  private configHandlerCount = new Map<EventName, number>()

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
      this.configHandlerCount.set(name, this.handlers.get(name)?.length ?? 0)
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
   * Fire beforeRender — if a handler returns a string, it replaces
   * `template.source` for subsequent handlers and the renderer.
   */
  async fireBeforeRender(params: { config: MaizzleConfig; template: TemplateInfo }): Promise<string> {
    const handlers = this.handlers.get('beforeRender') ?? []

    for (const handler of handlers) {
      const result = await (handler as EventMap['beforeRender'])(params)

      if (typeof result === 'string') {
        params.template.source = result
      }
    }

    return params.template.source
  }

  /**
   * Fire afterRender — if a handler returns a string, it replaces `html`.
   */
  async fireAfterRender(params: { config: MaizzleConfig; template: TemplateInfo; html: string }): Promise<string> {
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
  async fireAfterTransform(params: { config: MaizzleConfig; template: TemplateInfo; html: string }): Promise<string> {
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
   * Drop SFC-registered handlers, keep config-registered ones.
   *
   * Per default, only clears events whose scope is per-template
   * (`beforeRender`, `afterRender`, `afterTransform`). Build-scoped events
   * (`afterBuild`) accumulate across all templates and fire once at end of
   * build. Pass an explicit list to override.
   */
  clearSfcHandlers(events: EventName[] = ['beforeRender', 'afterRender', 'afterTransform']) {
    for (const name of events) {
      const handlers = this.handlers.get(name)
      if (!handlers) continue
      const keep = this.configHandlerCount.get(name) ?? 0
      if (handlers.length > keep) {
        this.handlers.set(name, handlers.slice(0, keep))
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
