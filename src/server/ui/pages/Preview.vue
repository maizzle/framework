<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronUp, ChevronDown, Check } from '@lucide/vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from '@/components/ui/tags-input'

import stripesUrl from '../stripes.svg'
import { applyColorInversion, undoColorInversion } from '@/lib/emulated-dark-mode'

interface Device {
  name: string
  width: number
  height: number
}

interface Template {
  name: string
  path: string
  href: string
}

const props = defineProps<{
  device?: Device | null
  resetKey?: number
  templates?: Template[]
}>()

const viewMode = defineModel<'preview' | 'source'>('viewMode', { default: 'preview' })
const darkMode = defineModel<boolean>('darkMode', { default: false })

const route = useRoute()
const srcdoc = ref('')
const sourceHtml = ref('')
const vueSourceHtml = ref('')
const plaintextContent = ref('')
const sourceView = ref<'compiled' | 'vue' | 'plaintext'>('compiled')
const copied = ref(false)

/**
 * Source views (Compiled HTML, Vue source, Plaintext) refresh lazily. On a
 * save we only refetch the view currently on screen and bump
 * `sourcesGeneration` to mark the others stale. Switching to a stale view
 * keeps its previous content visible while a background refetch replaces it
 * in place — so panels never flash empty. Each fetch stamps the generation
 * it was initiated at so a save mid-fetch correctly leaves the view stale.
 */
const sourcesGeneration = ref(0)
const compiledGen = ref(-1)
const vueGen = ref(-1)
const plaintextGen = ref(-1)

function refreshSourceView(view: 'compiled' | 'vue' | 'plaintext') {
  if (view === 'compiled' && (!sourceHtml.value || compiledGen.value < sourcesGeneration.value)) fetchSource()
  if (view === 'vue' && (!vueSourceHtml.value || vueGen.value < sourcesGeneration.value)) fetchVueSource()
  if (view === 'plaintext' && (!plaintextContent.value || plaintextGen.value < sourcesGeneration.value)) fetchPlaintext()
}

const iframeEl = ref<HTMLIFrameElement>()
const compiledSourceEl = ref<HTMLElement>()
const vueSourceEl = ref<HTMLElement>()
const plaintextEl = ref<HTMLElement>()
const containerEl = ref<HTMLElement>()
const wrapperEl = ref<HTMLElement>()

const panelWidth = defineModel<number>('panelWidth', { default: 0 })
const panelHeight = defineModel<number>('panelHeight', { default: 0 })
/**
 * Container's available area, exposed to the toolbar so size inputs can
 * clamp typed values without paying a layout-recalc cost on
 * every drag tick. Kept in sync via a ResizeObserver.
 */
const maxIframeWidth = defineModel<number>('maxIframeWidth', { default: 0 })
const maxIframeHeight = defineModel<number>('maxIframeHeight', { default: 0 })
const isDragging = defineModel<boolean>('isDragging', { default: false })
const isFullSize = defineModel<boolean>('isFullSize', { default: true })

/**
 * Custom resizable: width/height of the iframe wrapper (null = fill the
 * container). Exposed as v-models so the toolbar's size indicator
 * can drive these too, alongside the drag handles.
 */
const iframeWidth = defineModel<number | null>('iframeWidth', { default: null })
const iframeHeight = defineModel<number | null>('iframeHeight', { default: null })
const iframeContentHeight = ref<number | null>(null)

function copySource() {
  let text: string
  if (sourceView.value === 'compiled') {
    /**
     * `renderedHtml` holds the raw compiled HTML (srcdoc is only populated
     * for the initial iframe load; subsequent renders use doc.write).
     */
    text = renderedHtml || srcdoc.value
  } else if (sourceView.value === 'plaintext') {
    text = plaintextContent.value
  } else {
    const el = document.createElement('div')
    el.innerHTML = vueSourceHtml.value
    text = el.textContent || ''
  }

  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }).catch((err) => {
    console.error('Copy failed:', err)
  })
}

interface CheckIssue {
  kind: 'compat' | 'lint'
  slug?: string
  title: string
  url?: string
  category: string
  line?: number
  file: string
  // compat-only
  supportLevel?: 'unsupported' | 'mitigated' | 'unknown'
  supportLabel?: string
  affectedClients?: string[]
  // lint-only
  severity?: 'error' | 'warning'
  message?: string
}

function supportPrefix(issue: CheckIssue): string {
  if (issue.supportLevel === 'unsupported') return 'Not supported in'
  if (issue.supportLevel === 'mitigated') return 'Partial support in'
  return 'Support unknown in'
}

/**
 * Split a message on backtick-delimited code spans. Returns alternating
 * { text } and { code } segments so the template can render <code> inline
 * without needing v-html.
 */
function messageSegments(raw: string | undefined): Array<{ code: boolean, text: string }> {
  if (!raw) return []
  const out: Array<{ code: boolean, text: string }> = []
  const parts = raw.split('`')
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) out.push({ code: i % 2 === 1, text: parts[i] })
  }
  return out
}

function issueColorClass(issue: CheckIssue): string {
  if (issue.kind === 'lint') {
    return issue.severity === 'error' ? 'text-rose-600' : 'text-amber-600'
  }
  if (issue.supportLevel === 'unsupported') return 'text-rose-600'
  if (issue.supportLevel === 'mitigated') return 'text-amber-600'
  return 'text-gray-500 dark:text-gray-400'
}

interface TemplateStats {
  size: { bytes: number, formatted: string }
  images: number
  links: number
}

const compatibilityIssues = ref<CheckIssue[]>([])
const compatibilityLoading = ref(false)
const compatibilityError = ref('')
const compatibilityCategory = ref('')
/**
 * Injected by serveDevUI into index.html — synchronous, available before
 * any HTTP calls, so the Checks tab never flashes in when disabled.
 */
const checksConfig = (window as any).__MAIZZLE_CONFIG__?.checks
const compatibilityDisabled = ref(checksConfig === false)
const expandedIssueKeys = ref(new Set<string>())
const issueKey = (issue: CheckIssue, i: number): string => `${issue.file}|${issue.line ?? 0}|${issue.slug ?? issue.title}|${i}`
const compatibilityCategories = ['css', 'html', 'image', 'others'] as const
const activeCompatibilityCategories = computed(() =>
  compatibilityCategories.filter(cat => compatibilityIssues.value.some(i => i.category === cat))
)
const filteredCompatibilityIssues = computed(() => {
  if (!compatibilityCategory.value) return compatibilityIssues.value
  return compatibilityIssues.value.filter(i => i.category === compatibilityCategory.value)
})
const stats = ref<TemplateStats | null>(null)
const statsLoading = ref(false)

// Email test state
const emailTo = ref<string[]>([])
const emailSubject = ref('')
const emailSending = ref(false)
const emailPreventThreading = ref(true)
const emailResult = ref<{ success: boolean; message: string; previewUrl?: string } | null>(null)

async function fetchEmailConfig() {
  try {
    const res = await fetch('/__maizzle/email-config')
    const data = await res.json()
    if (data.to?.length && !emailTo.value.length) emailTo.value = data.to
    if (data.subject && !emailSubject.value) emailSubject.value = data.subject
  } catch {}
}

async function sendTestEmail() {
  if (!emailTo.value.length) return
  emailSending.value = true
  emailResult.value = null

  try {
    const res = await fetch(`/__maizzle/email/${route.params.template}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: emailTo.value,
        subject: (() => {
          let subj = emailSubject.value || String(route.params.template)
          if (emailPreventThreading.value) {
            subj += ` | ${new Date().toISOString().slice(0, 19)}`
          }
          return subj
        })(),
      }),
    })
    emailResult.value = await res.json()
  } catch (error: any) {
    emailResult.value = { success: false, message: error.message }
  } finally {
    emailSending.value = false
  }
}

let renderedHtml = ''

function updateIframeContentHeight() {
  const iframe = iframeEl.value
  const doc = iframe?.contentDocument
  if (!iframe || !doc?.documentElement) return

  // Hide iframe body overflow — scrolling is handled by the outer ScrollArea
  if (doc.body) doc.body.style.overflow = 'hidden'

  // Save scroll position of the ScrollArea viewport
  const viewport = wrapperEl.value?.querySelector('[data-slot="scroll-area-viewport"]')
  const scrollTop = viewport?.scrollTop ?? 0

  // Temporarily collapse to measure true content height
  iframe.style.height = '0'
  const contentHeight = doc.documentElement.scrollHeight
  // Fill the preview viewport when the email is shorter than it; grow past it
  // (and let the ScrollArea scroll) when the email is taller.
  const availableHeight = viewport?.clientHeight ?? 0
  iframeContentHeight.value = Math.max(contentHeight, availableHeight)
  iframe.style.height = `${iframeContentHeight.value}px`

  // Restore scroll position
  if (viewport) {
    viewport.scrollTop = scrollTop
  }
}

function onIframeLoad() {
  updateIframeContentHeight()
  const iframe = iframeEl.value
  if (darkMode.value && iframe) applyColorInversion(iframe)
}

watch(darkMode, (on) => {
  const iframe = iframeEl.value
  if (!iframe) return
  if (on) applyColorInversion(iframe)
  else undoColorInversion(iframe)
})

async function fetchTemplate() {
  const res = await fetch(`/__maizzle/render/${route.params.template}`)
  renderedHtml = await res.text()

  const iframe = iframeEl.value
  const doc = iframe?.contentDocument

  /**
   * Write directly into the iframe document to avoid a full reload,
   * which preserves scroll position natively.
   */
  if (doc) {
    doc.open()
    doc.write(renderedHtml)
    doc.close()
    // Hide iframe body overflow — scrolling is handled by the outer ScrollArea
    if (doc.body) doc.body.style.overflow = 'hidden'
    if (darkMode.value && iframe) applyColorInversion(iframe)
    await nextTick()
    updateIframeContentHeight()
  } else {
    // Fallback for initial load
    srcdoc.value = renderedHtml
  }
}

const sourceLoading = ref(false)
const vueSourceLoading = ref(false)
const plaintextLoading = ref(false)

async function fetchSource() {
  if (sourceLoading.value) return
  sourceLoading.value = true
  const gen = sourcesGeneration.value
  try {
    const res = await fetch(`/__maizzle/source/${route.params.template}`)
    sourceHtml.value = await res.text()
    compiledGen.value = gen
  } finally {
    sourceLoading.value = false
  }
}

async function fetchVueSource() {
  if (vueSourceLoading.value) return
  vueSourceLoading.value = true
  const gen = sourcesGeneration.value
  try {
    const res = await fetch(`/__maizzle/vue-source/${route.params.template}`)
    vueSourceHtml.value = await res.text()
    vueGen.value = gen
  } finally {
    vueSourceLoading.value = false
  }
}

async function fetchPlaintext() {
  if (plaintextLoading.value) return
  plaintextLoading.value = true
  const gen = sourcesGeneration.value
  try {
    const res = await fetch(`/__maizzle/plaintext/${route.params.template}`)
    plaintextContent.value = await res.text()
    plaintextGen.value = gen
  } finally {
    plaintextLoading.value = false
  }
}

/**
 * Warm the three source views in the background so switching from the
 * preview is instant. Single-flight guards above prevent duplication
 * with any in-flight fetch from a view-switch watcher.
 */
function prefetchSources() {
  if (!sourceHtml.value) fetchSource()
  if (!vueSourceHtml.value) fetchVueSource()
  if (!plaintextContent.value) fetchPlaintext()
}

async function fetchStats() {
  statsLoading.value = true
  try {
    const res = await fetch(`/__maizzle/stats/${route.params.template}`)
    stats.value = await res.json()
  } catch {
    stats.value = null
  } finally {
    statsLoading.value = false
  }
}

async function fetchCompatibility() {
  if (compatibilityDisabled.value) return
  const template = props.templates?.find(t => t.href === '/' + route.params.template)
  if (!template) return

  compatibilityLoading.value = true
  compatibilityError.value = ''
  try {
    const res = await fetch(`/__maizzle/compatibility/${template.path}`)
    const data = await res.json()
    if (!Array.isArray(data) && data?.error) {
      compatibilityError.value = data.error
      compatibilityIssues.value = []
    } else {
      const issues: CheckIssue[] = Array.isArray(data) ? data : []
      compatibilityIssues.value = issues
      /**
       * Keep the current category if it still has issues; otherwise fall
       * back to the first category that does. Prevents a "refresh"
       * during edits from snapping back to CSS when the user is
       * on HTML/Image.
       */
      const current = compatibilityCategory.value
      const currentStillActive = current && issues.some((i) => i.category === current)
      if (!currentStillActive) {
        const firstCat = compatibilityCategories.find(cat => issues.some((i) => i.category === cat))
        compatibilityCategory.value = firstCat || ''
      }
    }
  } catch {
    compatibilityIssues.value = []
  } finally {
    compatibilityLoading.value = false
  }
}

/** Check if an issue is from the currently viewed template file */
function isCurrentFile(issue: { file: string }): boolean {
  const template = props.templates?.find(t => t.href === '/' + route.params.template)
  if (!template) return true
  return issue.file.endsWith(template.path)
}

/** Get a short display name for a component file path */
function componentName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1]?.replace(/\.vue$/, '') ?? filePath
}

function openInEditor(file: string, line: number) {
  fetch(`/__open-in-editor?file=${encodeURIComponent(file + ':' + line)}`)
}

watch(() => route.params.template, () => {
  sourceHtml.value = ''
  vueSourceHtml.value = ''
  plaintextContent.value = ''
  compatibilityIssues.value = []
  compatibilityError.value = ''
  stats.value = null
  emailResult.value = null
  sourceView.value = 'compiled'
  fetchTemplate().then(prefetchSources)
  fetchCompatibility()
  fetchStats()
  fetchEmailConfig()
  if (viewMode.value === 'source') fetchSource()
}, { immediate: true })

// Templates list loads async from App.vue — re-trigger once available
watch(() => props.templates, (templates) => {
  if (templates?.length && !compatibilityIssues.value.length && !compatibilityLoading.value) {
    fetchCompatibility()
  }
})

watch(viewMode, (mode) => {
  if (mode === 'source') refreshSourceView(sourceView.value)
})

watch(sourceView, (view) => {
  refreshSourceView(view)
})

/**
 * Preserve scrollTop across in-place content updates (HMR refetch).
 * Vue's default `flush: 'pre'` runs the watcher BEFORE the DOM is
 * updated — so we read the current scrollTop, then restore it on the
 * next tick after the new content has rendered. Skip the case where
 * the value transitions from empty (first paint / route change) so a
 * fresh template doesn't snap to a stale offset.
 */
function viewportFor(el: HTMLElement | undefined): HTMLElement | null {
  return (el?.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null) ?? null
}

function preserveScroll(getEl: () => HTMLElement | undefined) {
  return async (newVal: string, oldVal: string) => {
    if (!oldVal || !newVal) return
    const vp = viewportFor(getEl())
    if (!vp) return
    const top = vp.scrollTop
    await nextTick()
    vp.scrollTop = top
  }
}

watch(sourceHtml, preserveScroll(() => compiledSourceEl.value))
watch(vueSourceHtml, preserveScroll(() => vueSourceEl.value))
watch(plaintextContent, preserveScroll(() => plaintextEl.value))

if ((import.meta as any).hot) {
  ;(import.meta as any).hot.on('maizzle:template-updated', () => {
    fetchCompatibility()
    fetchStats()

    /**
     * Refetch in place — don't clear the previous values first. v-html
     * replaces the highlighted block atomically when the new content
     * arrives, and the ScrollArea viewport keeps its scrollTop as
     * long as the new content's height is similar. Plaintext
     * interpolation updates a single text node, so scroll
     * is naturally preserved.
     *
     * Only the preview iframe and the currently-visible source view
     * refresh eagerly; hidden source views are marked stale (via the
     * generation bump) and refresh on next switch, keeping their old
     * content on screen until then so panels never flash empty.
     */
    fetchTemplate()
    sourcesGeneration.value++
    if (viewMode.value === 'source') refreshSourceView(sourceView.value)
  })

  /**
   * Keep the UI in sync with live config edits. Payload is the same shape
   * as the initial `window.__MAIZZLE_CONFIG__` inject — we replace it
   * and derive per-feature flags from there.
   */
  ;(import.meta as any).hot.on('maizzle:config-updated', (data: Record<string, unknown>) => {
    ;(window as any).__MAIZZLE_CONFIG__ = data
    const wasDisabled = compatibilityDisabled.value
    const nowDisabled = data?.checks === false
    compatibilityDisabled.value = nowDisabled
    if (nowDisabled) {
      compatibilityIssues.value = []
      if (activeTab.value === 'compatibility') activeTab.value = 'stats'
    } else if (wasDisabled) {
      fetchCompatibility()
    }
  })
}

async function goToCompiledLine(line: number) {
  viewMode.value = 'source'
  sourceView.value = 'compiled'

  if (!sourceHtml.value) {
    await fetchSource()
  }

  await nextTick()

  const el = compiledSourceEl.value
  if (!el) return

  el.querySelectorAll('.shiki-highlight-line').forEach(l => l.classList.remove('shiki-highlight-line'))

  const lineEl = el.querySelector(`[data-line="${line}"]`)
  if (lineEl) {
    lineEl.classList.add('shiki-highlight-line')
    lineEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

const emit = defineEmits<{ 'clear-device': [] }>()

type Edge = 'left' | 'right' | 'top' | 'bottom'

function onEdgeDrag(e: MouseEvent | TouchEvent, edge: Edge) {
  e.preventDefault()
  isDragging.value = true
  emit('clear-device')

  const container = containerEl.value
  if (!container) return

  const isTouch = e.type === 'touchstart'
  const startPoint = isTouch ? (e as TouchEvent).touches[0] : (e as MouseEvent)
  const startX = startPoint.clientX
  const startY = startPoint.clientY
  const rect = container.getBoundingClientRect()
  const gutter = 40 // 20px padding on each side
  const maxW = rect.width - gutter
  const maxH = rect.height - gutter
  const startW = iframeWidth.value ?? maxW
  const startH = iframeHeight.value ?? maxH

  const isHorizontal = edge === 'left' || edge === 'right'
  const sign = (edge === 'left' || edge === 'top') ? -1 : 1

  document.documentElement.style.cursor = isHorizontal ? 'ew-resize' : 'ns-resize'

  const onMove = (ev: MouseEvent | TouchEvent) => {
    const point = ev.type === 'touchmove' ? (ev as TouchEvent).touches[0] : (ev as MouseEvent)
    if (isHorizontal) {
      // Symmetric: each side moves by the delta, so total change is 2x
      const delta = (point.clientX - startX) * sign
      iframeWidth.value = Math.max(200, Math.min(maxW, startW + delta * 2))
    } else {
      const delta = (point.clientY - startY) * sign
      iframeHeight.value = Math.max(100, Math.min(maxH, startH + delta * 2))
    }
  }

  const onUp = () => {
    isDragging.value = false
    document.documentElement.style.cursor = ''
    updateFullSize()
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.addEventListener('touchmove', onMove, { passive: false })
  document.addEventListener('touchend', onUp)
}

function updateFullSize() {
  const container = containerEl.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const gutter = 40
  isFullSize.value = (iframeWidth.value === null || iframeWidth.value >= rect.width - gutter - 2)
    && (iframeHeight.value === null || iframeHeight.value >= rect.height - gutter - 2)
}


function applyDeviceSize(device: Device | null | undefined) {
  if (!device) {
    iframeWidth.value = null
    iframeHeight.value = null
    updateFullSize()
    return
  }

  const container = containerEl.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const gutter = 40

  iframeWidth.value = Math.min(device.width, rect.width - gutter)
  iframeHeight.value = Math.min(device.height, rect.height - gutter)
  updateFullSize()
}

watch(() => props.device, (device) => {
  if (viewMode.value === 'source') return
  // Only apply when a device is selected, not when cleared (drag start clears device)
  if (device) applyDeviceSize(device)
})

watch(() => props.resetKey, () => {
  applyDeviceSize(null)
})

watch(viewMode, async (mode) => {
  if (mode === 'preview' && props.device) {
    await nextTick()
    applyDeviceSize(props.device)
  }
})

let observer: ResizeObserver | null = null
let containerObserver: ResizeObserver | null = null

function forwardIframeKeys(iframe: HTMLIFrameElement) {
  try {
    const iframeDoc = iframe.contentDocument
    if (!iframeDoc) return

    iframeDoc.addEventListener('keydown', (e: KeyboardEvent) => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        bubbles: true,
      }))
    })
  } catch {}
}

onMounted(() => {
  const wrapper = wrapperEl.value
  if (wrapper) {
    const rect = wrapper.getBoundingClientRect()
    panelWidth.value = Math.round(rect.width)
    panelHeight.value = Math.round(rect.height)
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        panelWidth.value = Math.round(entry.contentRect.width)
        panelHeight.value = Math.round(entry.contentRect.height)
      }
      updateIframeContentHeight()
    })
    observer.observe(wrapper)
  }

  const container = containerEl.value
  if (container) {
    const gutter = 40
    const rect = container.getBoundingClientRect()
    maxIframeWidth.value = Math.max(0, Math.round(rect.width - gutter))
    maxIframeHeight.value = Math.max(0, Math.round(rect.height - gutter))
    containerObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        maxIframeWidth.value = Math.max(0, Math.round(entry.contentRect.width - gutter))
        maxIframeHeight.value = Math.max(0, Math.round(entry.contentRect.height - gutter))
      }
    })
    containerObserver.observe(container)
  }

  const el = iframeEl.value
  if (el) {
    el.addEventListener('load', () => forwardIframeKeys(el))
  }
})

onUnmounted(() => {
  observer?.disconnect()
  containerObserver?.disconnect()
})

const bottomPanelOpen = ref(false)
const tabsPanelHeight = ref(40)
const activeTab = ref<string | undefined>(undefined)

const defaultTab = () => compatibilityDisabled.value ? 'stats' : 'compatibility'

function toggleBottomPanel() {
  bottomPanelOpen.value = !bottomPanelOpen.value
  if (bottomPanelOpen.value) {
    tabsPanelHeight.value = 300
    if (!activeTab.value) activeTab.value = defaultTab()
  } else {
    tabsPanelHeight.value = 40
    activeTab.value = undefined
  }
}

function onTabClick(tab: string) {
  if (tab === activeTab.value && bottomPanelOpen.value) {
    bottomPanelOpen.value = false
    tabsPanelHeight.value = 40
    activeTab.value = undefined
    return
  }
  activeTab.value = tab
  if (!bottomPanelOpen.value) {
    bottomPanelOpen.value = true
    tabsPanelHeight.value = 300
  }
}

const tabsDragging = ref(false)

function onTabsDragStart(e: MouseEvent | TouchEvent) {
  e.preventDefault()
  tabsDragging.value = true
  const isTouch = e.type === 'touchstart'
  const startY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
  const startHeight = tabsPanelHeight.value

  const rootEl = containerEl.value?.closest('.relative.h-full') as HTMLElement | null
  const maxHeight = rootEl ? rootEl.getBoundingClientRect().height : Infinity

  const onMove = (e: MouseEvent | TouchEvent) => {
    const clientY = e.type === 'touchmove' ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
    const newHeight = Math.max(40, Math.min(maxHeight, startHeight + startY - clientY))
    tabsPanelHeight.value = newHeight
    bottomPanelOpen.value = newHeight > 40

    if (!bottomPanelOpen.value) {
      activeTab.value = undefined
    } else if (!activeTab.value) {
      activeTab.value = defaultTab()
    }
  }

  const onEnd = () => {
    tabsDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
  }

  document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove)
  document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd)
}

const stripeBg = {
  backgroundImage: `url(${stripesUrl})`,
  backgroundRepeat: 'repeat',
  backgroundAttachment: 'fixed',
}
</script>

<template>
  <div class="relative h-full">
    <div class="absolute inset-0 bottom-10 overflow-hidden">
      <!-- Source code view -->
      <div v-show="viewMode === 'source'" class="absolute inset-0 min-w-0 overflow-hidden">
        <div class="absolute top-3 left-6 z-10">
          <DropdownMenu :modal="false">
            <DropdownMenuTrigger class="inline-flex items-center gap-1 rounded-md bg-[#27212e]/80 dark:bg-gray-950/80 backdrop-blur-md border border-white/10 px-2.5 h-7 text-xs font-medium text-gray-300 hover:bg-[#27212e] dark:hover:bg-gray-950 transition-colors">
              {{ sourceView === 'compiled' ? 'HTML' : sourceView === 'vue' ? 'Source' : 'Plaintext' }}
              <ChevronDown class="size-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="min-w-32 bg-[#27212e]/80 dark:bg-gray-950/80 backdrop-blur-md border-white/10">
              <DropdownMenuItem class="text-xs font-medium text-gray-400 focus:text-gray-200 focus:bg-white/10" @click="sourceView = 'vue'">
                <Check v-if="sourceView === 'vue'" class="size-3 text-gray-200" />
                <span :class="[sourceView === 'vue' ? 'text-gray-200' : 'pl-5']">Source</span>
              </DropdownMenuItem>
              <DropdownMenuItem class="text-xs font-medium text-gray-400 focus:text-gray-200 focus:bg-white/10" @click="sourceView = 'compiled'">
                <Check v-if="sourceView === 'compiled'" class="size-3 text-gray-200" />
                <span :class="[sourceView === 'compiled' ? 'text-gray-200' : 'pl-5']">HTML</span>
              </DropdownMenuItem>
              <DropdownMenuItem class="text-xs font-medium text-gray-400 focus:text-gray-200 focus:bg-white/10" @click="sourceView = 'plaintext'">
                <Check v-if="sourceView === 'plaintext'" class="size-3 text-gray-200" />
                <span :class="[sourceView === 'plaintext' ? 'text-gray-200' : 'pl-5']">Plaintext</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <button
          class="absolute top-3 right-[26px] z-10 inline-flex items-center justify-center rounded-md size-7 bg-[#27212e]/80 dark:bg-gray-950/80 backdrop-blur-md border border-white/10 hover:bg-[#27212e] dark:hover:bg-gray-950 group disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="copied"
          @click="copySource"
        >
          <svg v-if="!copied" class="size-3.5 text-gray-400 group-hover:text-gray-300" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.25 5.25H7.25C6.14543 5.25 5.25 6.14543 5.25 7.25V14.25C5.25 15.3546 6.14543 16.25 7.25 16.25H14.25C15.3546 16.25 16.25 15.3546 16.25 14.25V7.25C16.25 6.14543 15.3546 5.25 14.25 5.25Z" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" /><path d="M2.80103 11.998L1.77203 5.07397C1.61003 3.98097 2.36403 2.96397 3.45603 2.80197L10.38 1.77297C11.313 1.63397 12.19 2.16297 12.528 3.00097" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <svg v-else class="size-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </button>
        <ScrollArea v-show="sourceView === 'compiled'" class="h-full [&_[data-slot=scroll-area-viewport]>div]:flex [&_[data-slot=scroll-area-viewport]>div]:flex-col [&_[data-slot=scroll-area-viewport]>div]:min-h-full">
          <div
            ref="compiledSourceEl"
            class="flex-1 bg-[#27212e] dark:bg-gray-950 shiki-line-numbers [&_pre]:p-6 [&_pre]:pt-14 [&_pre]:text-base [&_pre]:leading-6 [&_pre]:min-h-full dark:[&_pre]:bg-gray-950!"
            v-html="sourceHtml"
          />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <ScrollArea v-show="sourceView === 'vue'" class="h-full [&_[data-slot=scroll-area-viewport]>div]:flex [&_[data-slot=scroll-area-viewport]>div]:flex-col [&_[data-slot=scroll-area-viewport]>div]:min-h-full">
          <div
            ref="vueSourceEl"
            class="flex-1 bg-[#27212e] dark:bg-gray-950 shiki-line-numbers [&_pre]:p-6 [&_pre]:pt-14 [&_pre]:text-base [&_pre]:leading-6 [&_pre]:min-h-full dark:[&_pre]:bg-gray-950!"
            v-html="vueSourceHtml"
          />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <ScrollArea v-show="sourceView === 'plaintext'" class="h-full [&_[data-slot=scroll-area-viewport]>div]:flex [&_[data-slot=scroll-area-viewport]>div]:flex-col [&_[data-slot=scroll-area-viewport]>div]:min-h-full">
          <pre
            ref="plaintextEl"
            class="p-6 pt-14 text-sm leading-6 flex-1 text-gray-300 bg-[#27212e] dark:bg-gray-950 whitespace-pre-wrap break-words"
          >{{ plaintextContent }}</pre>
        </ScrollArea>
      </div>

      <!-- Blocks iframe from stealing pointer events while dragging tabs -->
      <div v-if="tabsDragging" class="fixed inset-0 z-50" />

      <!-- Preview view -->
      <div v-show="viewMode !== 'source'" class="absolute inset-0">
        <div class="relative h-full opacity-5" :style="stripeBg" />
      </div>

      <div v-show="viewMode !== 'source'" ref="containerEl" class="absolute inset-0 z-10 flex items-center justify-center">
        <!-- Blocks iframe from stealing pointer events while dragging -->
        <div v-if="isDragging" class="absolute inset-0 z-20" />
        <div
          class="relative"
          :style="{
            width: iframeWidth != null ? `${iframeWidth + 40}px` : '100%',
            height: iframeHeight != null ? `${iframeHeight + 40}px` : '100%',
            transition: isDragging ? 'none' : 'width 0.2s ease, height 0.2s ease',
          }"
        >
          <!-- Top handle -->
          <div class="group hidden min-[430px]:flex absolute top-0 left-5 right-5 h-5 items-center justify-center cursor-ns-resize" @mousedown="onEdgeDrag($event, 'top')" @touchstart.prevent="onEdgeDrag($event, 'top')">
            <div class="h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 group-active:bg-gray-500 dark:group-hover:bg-gray-500 dark:group-active:bg-gray-400 transition-colors" />
          </div>
          <!-- Bottom handle -->
          <div class="group hidden min-[430px]:flex absolute bottom-0 left-5 right-5 h-5 items-center justify-center cursor-ns-resize" @mousedown="onEdgeDrag($event, 'bottom')" @touchstart.prevent="onEdgeDrag($event, 'bottom')">
            <div class="h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 group-active:bg-gray-500 dark:group-hover:bg-gray-500 dark:group-active:bg-gray-400 transition-colors" />
          </div>
          <!-- Left handle -->
          <div class="group hidden min-[430px]:flex absolute left-0 top-5 bottom-5 w-5 items-center justify-center cursor-ew-resize" @mousedown="onEdgeDrag($event, 'left')" @touchstart.prevent="onEdgeDrag($event, 'left')">
            <div class="w-1 h-12 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 group-active:bg-gray-500 dark:group-hover:bg-gray-500 dark:group-active:bg-gray-400 transition-colors" />
          </div>
          <!-- Right handle -->
          <div class="group hidden min-[430px]:flex absolute right-0 top-5 bottom-5 w-5 items-center justify-center cursor-ew-resize" @mousedown="onEdgeDrag($event, 'right')" @touchstart.prevent="onEdgeDrag($event, 'right')">
            <div class="w-1 h-12 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 group-active:bg-gray-500 dark:group-hover:bg-gray-500 dark:group-active:bg-gray-400 transition-colors" />
          </div>
          <!-- Iframe -->
          <div ref="wrapperEl" class="absolute inset-0 min-[430px]:inset-5 border border-gray-200 dark:border-gray-800">
            <ScrollArea class="h-full w-full bg-white dark:bg-gray-950">
              <iframe
                ref="iframeEl"
                :srcdoc="srcdoc"
                @load="onIframeLoad"
                class="w-full border-0 bg-white dark:bg-gray-950"
                :style="{ height: iframeContentHeight ? `${iframeContentHeight}px` : '100%' }"
              />
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs panel (overlay) -->
    <div
      class="absolute bottom-0 left-0 right-0 z-20 overflow-hidden border-t border-gray-200 dark:border-gray-800/50"
      :class="[
        !tabsDragging ? 'transition-[height] duration-200 ease-in-out' : '',
        'bg-white dark:bg-gray-950',
      ]"
      :style="{ height: `${tabsPanelHeight}px` }"
    >
        <div
          class="relative h-0 cursor-row-resize before:absolute before:top-0 before:left-0 before:right-0 before:h-3.25 before:content-['']"
          @mousedown="onTabsDragStart"
          @touchstart.prevent="onTabsDragStart"
        />
        <Tabs :model-value="activeTab" class="flex flex-col min-h-0 h-full">
          <div class="flex items-center justify-between min-h-10 pl-2 pr-3 shrink-0" :class="bottomPanelOpen ? 'border-b' : ''">
            <TabsList class="h-full bg-transparent! rounded-none! p-0 gap-1">
              <TabsTrigger v-if="!compatibilityDisabled" value="compatibility" class="text-xs font-normal px-3 h-full rounded-none! border-0! shadow-none! border-b! border-transparent select-none data-[state=active]:border-gray-400 data-[state=active]:dark:border-gray-600 data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent dark:bg-transparent! dark:hover:bg-transparent!" @click="onTabClick('compatibility')">
                Checks
              </TabsTrigger>
              <TabsTrigger value="stats" class="text-xs font-normal px-3 h-full rounded-none! border-0! shadow-none! border-b! border-transparent select-none data-[state=active]:border-gray-400 data-[state=active]:dark:border-gray-600 data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent dark:bg-transparent! dark:hover:bg-transparent!" @click="onTabClick('stats')">
                Stats
              </TabsTrigger>
              <TabsTrigger value="test" class="text-xs font-normal px-3 h-full rounded-none! border-0! shadow-none! border-b! border-transparent select-none data-[state=active]:border-gray-400 data-[state=active]:dark:border-gray-600 data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent dark:bg-transparent! dark:hover:bg-transparent!" @click="onTabClick('test')">
                Test
              </TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon" class="h-7 w-7 hover:bg-transparent!" @click="toggleBottomPanel">
              <ChevronUp v-if="!bottomPanelOpen" class="size-4 dark:text-gray-400" :stroke-width="1" />
              <ChevronDown v-else class="size-4 dark:text-gray-400" :stroke-width="1" />
            </Button>
          </div>
          <div class="flex-1 min-h-0">
            <TabsContent value="compatibility" class="mt-0 h-full flex flex-col"><div v-if="!compatibilityLoading && !compatibilityError && compatibilityIssues.length > 0" class="flex gap-1 pl-3 pr-4 py-2 border-b border-gray-200 dark:border-white/10 shrink-0">
                <button
                  v-for="cat in activeCompatibilityCategories"
                  :key="cat"
                  class="px-2 py-0.5 text-[11px] rounded-full cursor-default transition-colors"
                  :class="compatibilityCategory === cat
                    ? 'bg-gray-900 text-white dark:bg-gray-600 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'"
                  @click="compatibilityCategory = cat"
                >
                  {{ cat === 'css' ? 'CSS' : cat === 'html' ? 'HTML' : cat.charAt(0).toUpperCase() + cat.slice(1) }}
                  <span class="ml-0.5 tabular-nums">{{ compatibilityIssues.filter(i => i.category === cat).length }}</span>
                </button>
              </div>
              <ScrollArea class="h-full flex-1 min-h-0 pl-5">
                <p v-if="compatibilityLoading" class="pr-4 py-3 text-xs text-gray-500 dark:text-gray-400">Running checks...</p>
                <p v-else-if="compatibilityError" class="pr-4 py-3 text-xs text-red-500 dark:text-red-400">{{ compatibilityError }}</p>
                <p v-else-if="compatibilityIssues.length === 0" class="pr-4 py-3 text-xs text-gray-500 dark:text-gray-400">No issues found.</p>
                <ul v-else class="text-xs divide-y">
                  <li
                    v-for="(issue, i) in filteredCompatibilityIssues"
                    :key="i"
                    class="pr-4 py-2"
                  >
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <a v-if="issue.url" :href="issue.url" target="_blank" rel="noopener" class="font-medium hover:underline" :class="issueColorClass(issue)">
                          {{ issue.title }}
                        </a>
                        <span v-else class="font-medium" :class="issueColorClass(issue)">
                          {{ issue.title }}
                        </span>
                        <div class="text-gray-500 dark:text-gray-400 mt-0.5">
                          <template v-if="issue.kind === 'lint'">
                            <template v-for="(seg, j) in messageSegments(issue.message)" :key="j">
                              <code v-if="seg.code" class="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono text-[11px]">{{ seg.text }}</code>
                              <template v-else>{{ seg.text }}</template>
                            </template>
                          </template>
                          <template v-else>
                            {{ supportPrefix(issue) }}
                            <template v-if="(issue.affectedClients?.length ?? 0) <= 4 || expandedIssueKeys.has(issueKey(issue, i))">
                              {{ (issue.affectedClients ?? []).join(', ') }}
                            </template>
                            <template v-else>
                              {{ issue.affectedClients!.slice(0, 4).join(', ') }}
                              <button class="underline cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" @click="expandedIssueKeys.add(issueKey(issue, i)); expandedIssueKeys = new Set(expandedIssueKeys)">
                                + {{ issue.affectedClients!.length - 4 }} others
                              </button>
                            </template>
                          </template>
                        </div>
                      </div>
                      <button v-if="issue.line" class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer tabular-nums shrink-0" @click="openInEditor(issue.file, issue.line!)">{{ isCurrentFile(issue) ? `L${issue.line}` : `${componentName(issue.file)}:${issue.line}` }}</button>
                    </div>
                  </li>
                </ul>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="stats" class="mt-0 h-full">
                <ScrollArea class="h-full pl-5">
                <p v-if="statsLoading" class="pr-4 py-3 text-xs text-gray-500 dark:text-gray-400">Loading stats...</p>
                <p v-else-if="!stats" class="pr-4 py-3 text-xs text-gray-500 dark:text-gray-400">No stats available.</p>
                <ul v-else class="text-xs divide-y divide-gray-200 dark:divide-white/10">
                  <li class="pr-4 py-2">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <span class="font-medium" :class="stats.size.bytes > 102400 ? 'text-red-600' : stats.size.bytes > 51200 ? 'text-amber-600' : 'text-gray-900 dark:text-gray-300'">Size</span>
                        <div class="text-gray-500 dark:text-gray-400 mt-0.5">Compiled HTML size. Gmail clips emails larger than ~100KB.</div>
                      </div>
                      <span class="font-medium tabular-nums shrink-0" :class="stats.size.bytes > 102400 ? 'text-red-600' : stats.size.bytes > 51200 ? 'text-amber-600' : 'text-gray-900 dark:text-gray-300'">{{ stats.size.formatted }}</span>
                    </div>
                  </li>
                  <li class="pr-4 py-2">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <span class="font-medium text-gray-900 dark:text-gray-300">Images</span>
                        <div class="text-gray-500 dark:text-gray-400 mt-0.5">Total from &lt;img&gt; tags and CSS background images.</div>
                      </div>
                      <span class="font-medium tabular-nums shrink-0">{{ stats.images }}</span>
                    </div>
                  </li>
                  <li class="pr-4 py-2">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <span class="font-medium text-gray-900 dark:text-gray-300">Links</span>
                        <div class="text-gray-500 dark:text-gray-400 mt-0.5">Total &lt;a&gt; tags with an href attribute.</div>
                      </div>
                      <span class="font-medium tabular-nums shrink-0">{{ stats.links }}</span>
                    </div>
                  </li>
                </ul>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="test" class="mt-0 h-full">
              <ScrollArea class="h-full pl-5">
                <div class="pr-4 py-3 max-w-md">
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <label for="email-to" class="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0 cursor-pointer">To</label>
                      <TagsInput v-model="emailTo" delimiter=" " add-on-paste add-on-blur class="flex-1 min-h-7 gap-1 px-2 py-1">
                        <TagsInputItem v-for="item in emailTo" :key="item" :value="item" class="h-5 text-xs rounded">
                          <TagsInputItemText class="px-1.5 py-0 text-xs" />
                          <TagsInputItemDelete class="size-3.5" />
                        </TagsInputItem>
                        <TagsInputInput id="email-to" class="text-xs min-h-5 px-0.5" placeholder="Add emails..." />
                      </TagsInput>
                    </div>
                    <div class="flex items-center gap-2">
                      <label for="email-subject" class="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0 cursor-pointer">Subject</label>
                      <div class="flex-1 flex items-center gap-3">
                        <Input id="email-subject" v-model="emailSubject" :placeholder="String(route.params.template)" class="flex-1 h-7 text-xs! px-2" />
                        <label class="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                          <Checkbox v-model="emailPreventThreading" :default-checked="true" class="size-3.5" />
                          <span class="text-xs text-gray-500 dark:text-gray-400">Prevent threading</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 mt-3">
                    <Button
                      size="sm"
                      class="h-7 text-xs px-3"
                      :disabled="!emailTo.length || emailSending"
                      @click="sendTestEmail"
                    >
                      <svg v-if="emailSending" class="size-3.5 animate-spin [animation-duration:0.6s]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      {{ emailSending ? 'Sending' : 'Send' }}
                    </Button>
                  </div>
                  <div v-if="emailResult" class="mt-2">
                    <p class="text-xs" :class="emailResult.success ? 'text-gray-950 dark:text-white' : 'text-red-600'">
                      {{ emailResult.message }}
                      <a
                        v-if="emailResult.previewUrl"
                        :href="emailResult.previewUrl"
                        target="_blank"
                        rel="noopener"
                        class="text-gray-500 dark:text-gray-400 hover:underline"
                      >
                        (view)
                      </a>
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
  </div>
</template>
