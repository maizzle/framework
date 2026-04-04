import type { InjectionKey } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'
import type { EventName, EventMap } from '../events/index.ts'
import type { UsePlaintextOptions } from './usePlaintext.ts'

export interface RenderContext {
  doctype?: string
  sfcConfig?: MaizzleConfig
  sfcEventHandlers: Array<{ name: EventName; handler: EventMap[EventName] }>
  plaintext?: UsePlaintextOptions
}

export const RenderContextKey: InjectionKey<RenderContext> = Symbol('RenderContext')
