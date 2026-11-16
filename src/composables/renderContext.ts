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

/**
 * `<Raw>` contents, keyed by marker index. Lives on the
 * per-render context, never at module level, so
 * concurrent renders can't see each other's.
 */
export interface RawBlocks {
  nonce: string
  blocks: string[]
}

export interface RenderContext {
  doctype?: string
  preheader?: { text: string; fillerCount: number }
  sfcConfig?: MaizzleConfig
  sfcEventHandlers: Array<{ name: EventName; handler: EventMap[EventName] }>
  plaintext?: UsePlaintextOptions
  outputPath?: string
  fonts?: FontRegistration[]
  tailwindBlocks?: TailwindBlock[]
  raw?: RawBlocks
  nonce?: string
  outputMarkerCount?: number
}

/**
 * Per-render random nonce for the markers that components
 * emit for the build to act on later, so they can't be
 * forged from data rendered into the template.
 */
export function renderNonce(ctx: RenderContext): string {
  return ctx.nonce ??= crypto.randomUUID().replaceAll('-', '')
}

// Global symbol registry — same rationale as MaizzleConfigKey in useConfig.ts.
export const RenderContextKey: InjectionKey<RenderContext> = Symbol.for('maizzle.renderContext')
