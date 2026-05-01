import type { InjectionKey } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'
import type { EventName, EventMap } from '../events/index.ts'
import type { UsePlaintextOptions } from './usePlaintext.ts'

export interface FontRegistration {
  family: string
  slug: string
  declaration: string
  url: string
}

export interface TailwindBlock {
  id: string
  /** Optional raw CSS from the component's `#config` slot. */
  css?: string
}

export interface RenderContext {
  doctype?: string
  preheader?: { text: string; fillerCount: number; shyCount: number }
  sfcConfig?: MaizzleConfig
  sfcEventHandlers: Array<{ name: EventName; handler: EventMap[EventName] }>
  plaintext?: UsePlaintextOptions
  fonts?: FontRegistration[]
  tailwindBlocks?: TailwindBlock[]
}

export const RenderContextKey: InjectionKey<RenderContext> = Symbol('RenderContext')
