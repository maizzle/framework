<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronUp, ChevronDown, Check } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

import stripesUrl from '../stripes.svg'

interface Device {
  name: string
  width: number
  height: number
}

const props = defineProps<{
  device?: Device | null
  resetKey?: number
}>()

const viewMode = defineModel<'preview' | 'source'>('viewMode', { default: 'preview' })

const route = useRoute()
const srcdoc = ref('')
const sourceHtml = ref('')
const vueSourceHtml = ref('')
const plaintextContent = ref('')
const sourceView = ref<'compiled' | 'vue' | 'plaintext'>('compiled')
const copied = ref(false)

const iframeEl = ref<HTMLIFrameElement>()
const vueSourceEl = ref<HTMLElement>()
const containerEl = ref<HTMLElement>()
const previewEl = ref<InstanceType<typeof ResizablePanel>>()
const leftPanel = ref<InstanceType<typeof ResizablePanel>>()
const rightPanel = ref<InstanceType<typeof ResizablePanel>>()
const topPanel = ref<InstanceType<typeof ResizablePanel>>()
const bottomPanel = ref<InstanceType<typeof ResizablePanel>>()

const panelWidth = defineModel<number>('panelWidth', { default: 0 })
const panelHeight = defineModel<number>('panelHeight', { default: 0 })
const isDragging = defineModel<boolean>('isDragging', { default: false })
const isFullSize = defineModel<boolean>('isFullSize', { default: true })

const sideSizes = ref({ left: 0, right: 0, top: 0, bottom: 0 })

function updateFullSize() {
  isFullSize.value = sideSizes.value.left < 0.5
    && sideSizes.value.right < 0.5
    && sideSizes.value.top < 0.5
    && sideSizes.value.bottom < 0.5
}

async function copySource() {
  if (sourceView.value === 'compiled') {
    await navigator.clipboard.writeText(srcdoc.value)
  } else if (sourceView.value === 'plaintext') {
    await navigator.clipboard.writeText(plaintextContent.value)
  } else {
    const el = document.createElement('div')
    el.innerHTML = vueSourceHtml.value
    await navigator.clipboard.writeText(el.textContent || '')
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

interface CompatibilityIssue {
  type: 'error' | 'warning'
  title: string
  clients: Array<{ name: string, notes: string[] }>
  url?: string
  line?: number
}

interface LintIssue {
  type: 'error' | 'warning'
  title: string
  message: string
  line?: number
}

interface TemplateStats {
  size: { bytes: number, formatted: string }
  images: number
  links: number
}

const compatibilityIssues = ref<CompatibilityIssue[]>([])
const compatibilityLoading = ref(false)
const lintIssues = ref<LintIssue[]>([])
const lintLoading = ref(false)
const stats = ref<TemplateStats | null>(null)
const statsLoading = ref(false)

async function fetchTemplate() {
  const res = await fetch(`/__maizzle/render/${route.params.template}`)
  const html = await res.text()

  const iframe = iframeEl.value
  const doc = iframe?.contentDocument

  // Write directly into the iframe document to avoid a full reload,
  // which preserves scroll position natively.
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()
  } else {
    // Fallback for initial load
    srcdoc.value = html
  }
}

async function fetchSource() {
  const res = await fetch(`/__maizzle/source/${route.params.template}`)
  sourceHtml.value = await res.text()
}

async function fetchVueSource() {
  const res = await fetch(`/__maizzle/vue-source/${route.params.template}`)
  vueSourceHtml.value = await res.text()
}

async function fetchPlaintext() {
  const res = await fetch(`/__maizzle/plaintext/${route.params.template}`)
  plaintextContent.value = await res.text()
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
  compatibilityLoading.value = true
  try {
    const res = await fetch(`/__maizzle/compatibility/${route.params.template}`)
    compatibilityIssues.value = await res.json()
  } catch {
    compatibilityIssues.value = []
  } finally {
    compatibilityLoading.value = false
  }
}

async function fetchLint() {
  lintLoading.value = true
  try {
    const res = await fetch(`/__maizzle/lint/${route.params.template}`)
    lintIssues.value = await res.json()
  } catch {
    lintIssues.value = []
  } finally {
    lintLoading.value = false
  }
}

watch(() => route.params.template, () => {
  sourceHtml.value = ''
  vueSourceHtml.value = ''
  plaintextContent.value = ''
  compatibilityIssues.value = []
  lintIssues.value = []
  stats.value = null
  sourceView.value = 'compiled'
  fetchTemplate()
  fetchCompatibility()
  fetchLint()
  fetchStats()
  if (viewMode.value === 'source') fetchSource()
}, { immediate: true })

watch(viewMode, (mode) => {
  if (mode === 'source') {
    if (sourceView.value === 'compiled' && !sourceHtml.value) fetchSource()
    if (sourceView.value === 'vue' && !vueSourceHtml.value) fetchVueSource()
    if (sourceView.value === 'plaintext' && !plaintextContent.value) fetchPlaintext()
  }
})

watch(sourceView, (view) => {
  if (view === 'vue' && !vueSourceHtml.value) fetchVueSource()
  if (view === 'compiled' && !sourceHtml.value) fetchSource()
  if (view === 'plaintext' && !plaintextContent.value) fetchPlaintext()
})

if ((import.meta as any).hot) {
  ;(import.meta as any).hot.on('maizzle:template-updated', () => {
    fetchTemplate()
    fetchCompatibility()
    fetchLint()
    fetchStats()

    // Always clear all source views so they re-fetch when switched to
    sourceHtml.value = ''
    vueSourceHtml.value = ''
    plaintextContent.value = ''

    // Re-fetch the active source view immediately if currently visible
    if (viewMode.value === 'source') {
      if (sourceView.value === 'compiled') fetchSource()
      if (sourceView.value === 'vue') fetchVueSource()
      if (sourceView.value === 'plaintext') fetchPlaintext()
    }
  })
}


async function goToLine(line: number) {
  // Switch to source view showing Vue source
  viewMode.value = 'source'
  sourceView.value = 'vue'

  // Ensure vue source is loaded
  if (!vueSourceHtml.value) {
    await fetchVueSource()
  }

  await nextTick()

  const el = vueSourceEl.value
  if (!el) return

  // Remove previous highlight
  el.querySelectorAll('.shiki-highlight-line').forEach(l => l.classList.remove('shiki-highlight-line'))

  // Find and highlight the line
  const lineEl = el.querySelector(`[data-line="${line}"]`)
  if (lineEl) {
    lineEl.classList.add('shiki-highlight-line')
    lineEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

// Track which axis is being user-dragged so we can sync the opposite panel
let hDragging = false
let vDragging = false

const emit = defineEmits<{ 'clear-device': [] }>()

function onHDragStart() { hDragging = true; isDragging.value = true; emit('clear-device') }
function onHDragEnd() { setTimeout(() => { hDragging = false }, 50); isDragging.value = false }
function onVDragStart() { vDragging = true; isDragging.value = true; emit('clear-device') }
function onVDragEnd() { setTimeout(() => { vDragging = false }, 50); isDragging.value = false }

function onHorizontalLayout(sizes: number[]) {
  if (!hDragging) return

  const [left, , right] = sizes
  if (Math.abs(left - right) < 0.5) return

  hDragging = false
  const side = Math.max(left, right)
  if (left < side) leftPanel.value?.resize(side)
  if (right < side) rightPanel.value?.resize(side)
}

function onVerticalLayout(sizes: number[]) {
  if (!vDragging) return

  const [top, , bottom] = sizes
  if (Math.abs(top - bottom) < 0.5) return

  vDragging = false
  const side = Math.max(top, bottom)
  if (top < side) topPanel.value?.resize(side)
  if (bottom < side) bottomPanel.value?.resize(side)
}

function applyDeviceSize(device: Device | null | undefined) {
  const el = containerEl.value
  if (!el) return

  if (!device) {
    if (!hDragging && !vDragging) {
      leftPanel.value?.resize(0)
      rightPanel.value?.resize(0)
      topPanel.value?.resize(0)
      bottomPanel.value?.resize(0)
    }
    return
  }

  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const handleSize = 16
  const hPanelSpace = rect.width - handleSize * 2
  const vPanelSpace = rect.height - handleSize * 2

  const hSide = Math.max(0, ((hPanelSpace - device.width) / 2) / hPanelSpace * 100)
  const vSide = Math.max(0, ((vPanelSpace - device.height) / 2) / vPanelSpace * 100)

  leftPanel.value?.resize(hSide)
  rightPanel.value?.resize(hSide)
  topPanel.value?.resize(vSide)
  bottomPanel.value?.resize(vSide)
}

watch(() => props.device, (device) => {
  if (viewMode.value === 'source') return
  applyDeviceSize(device)
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
      }))
    })
  } catch {}
}

onMounted(() => {
  const el = iframeEl.value
  if (el) {
    const rect = el.getBoundingClientRect()
    panelWidth.value = Math.round(rect.width)
    panelHeight.value = Math.round(rect.height)
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        panelWidth.value = Math.round(entry.contentRect.width)
        panelHeight.value = Math.round(entry.contentRect.height)
      }
    })
    observer.observe(el)
    el.addEventListener('load', () => forwardIframeKeys(el))
  }
})

onUnmounted(() => {
  observer?.disconnect()
})

const bottomPanelOpen = ref(false)
const tabsPanelHeight = ref(40)
const activeTab = ref<string | undefined>(undefined)

function toggleBottomPanel() {
  bottomPanelOpen.value = !bottomPanelOpen.value
  if (bottomPanelOpen.value) {
    tabsPanelHeight.value = 200
    if (!activeTab.value) activeTab.value = 'compatibility'
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
    tabsPanelHeight.value = 200
  }
}

const tabsDragging = ref(false)

function onTabsDragStart(e: MouseEvent) {
  e.preventDefault()
  tabsDragging.value = true
  const startY = e.clientY
  const startHeight = tabsPanelHeight.value

  const onMouseMove = (e: MouseEvent) => {
    const newHeight = Math.max(40, startHeight + startY - e.clientY)
    tabsPanelHeight.value = newHeight
    bottomPanelOpen.value = newHeight > 40

    if (!bottomPanelOpen.value) {
      activeTab.value = undefined
    } else if (!activeTab.value) {
      activeTab.value = 'compatibility'
    }
  }

  const onMouseUp = () => {
    tabsDragging.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const stripeBg = {
  backgroundImage: `url(${stripesUrl})`,
  backgroundRepeat: 'repeat',
  backgroundAttachment: 'fixed',
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="relative flex-1 min-h-0">
      <!-- Source code view -->
      <div v-show="viewMode === 'source'" class="absolute inset-0 min-w-0 overflow-hidden">
        <div class="absolute top-3 left-6 z-10">
          <DropdownMenu :modal="false">
            <DropdownMenuTrigger class="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 h-7 text-xs font-medium text-gray-300 hover:bg-white/15 transition-colors">
              {{ sourceView === 'compiled' ? 'HTML' : sourceView === 'vue' ? 'Source' : 'Plaintext' }}
              <ChevronDown class="size-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="min-w-0 bg-white/10 backdrop-blur-md border-white/10">
              <DropdownMenuItem class="text-xs font-medium text-gray-300 hover:text-white focus:bg-white/10 focus:text-white" @click="sourceView = 'vue'">
                <Check v-if="sourceView === 'vue'" class="size-3.5" />
                <span :class="sourceView === 'vue' ? '' : 'pl-5.5'">Source</span>
              </DropdownMenuItem>
              <DropdownMenuItem class="text-xs font-medium text-gray-300 hover:text-white focus:bg-white/10 focus:text-white" @click="sourceView = 'compiled'">
                <Check v-if="sourceView === 'compiled'" class="size-3.5" />
                <span :class="sourceView === 'compiled' ? '' : 'pl-5.5'">HTML</span>
              </DropdownMenuItem>
              <DropdownMenuItem class="text-xs font-medium text-gray-300 hover:text-white focus:bg-white/10 focus:text-white" @click="sourceView = 'plaintext'">
                <Check v-if="sourceView === 'plaintext'" class="size-3.5" />
                <span :class="sourceView === 'plaintext' ? '' : 'pl-5.5'">Plaintext</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <button
          class="absolute top-3 right-6 z-10 inline-flex items-center justify-center rounded-md px-2.5 h-8 bg-transparent hover:bg-transparent group disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          :disabled="copied"
          @click="copySource"
        >
          <svg v-if="!copied" class="size-5 text-gray-400 group-hover:text-gray-300" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.25 5.25H7.25C6.14543 5.25 5.25 6.14543 5.25 7.25V14.25C5.25 15.3546 6.14543 16.25 7.25 16.25H14.25C15.3546 16.25 16.25 15.3546 16.25 14.25V7.25C16.25 6.14543 15.3546 5.25 14.25 5.25Z" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" /><path d="M2.80103 11.998L1.77203 5.07397C1.61003 3.98097 2.36403 2.96397 3.45603 2.80197L10.38 1.77297C11.313 1.63397 12.19 2.16297 12.528 3.00097" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <svg v-else class="size-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </button>
        <div
          v-show="sourceView === 'compiled'"
          class="shiki-line-numbers h-full overflow-auto [&_pre]:p-6 [&_pre]:pt-14 [&_pre]:text-base [&_pre]:leading-6 [&_pre]:min-h-full [&_pre]:overflow-x-auto"
          v-html="sourceHtml"
        />
        <div
          ref="vueSourceEl"
          v-show="sourceView === 'vue'"
          class="shiki-line-numbers h-full overflow-auto [&_pre]:p-6 [&_pre]:pt-14 [&_pre]:text-base [&_pre]:leading-6 [&_pre]:min-h-full [&_pre]:overflow-x-auto"
          v-html="vueSourceHtml"
        />
        <pre
          v-show="sourceView === 'plaintext'"
          class="h-full overflow-auto p-6 pt-14 text-sm leading-6 min-h-full text-gray-300 bg-[#27212e] whitespace-pre-wrap break-words"
        >{{ plaintextContent }}</pre>
      </div>

      <!-- Preview view -->
      <div v-show="viewMode !== 'source'" class="absolute inset-0">
        <div class="relative h-full opacity-5" :style="stripeBg" />
      </div>

      <div v-show="viewMode !== 'source'" ref="containerEl" class="absolute inset-0 z-10 flex flex-col">
        <div class="flex-1 min-h-0">
          <ResizablePanelGroup direction="vertical" class="h-full" @layout="onVerticalLayout">
            <ResizablePanel ref="topPanel" :default-size="0" @resize="(s: number) => { sideSizes.top = s; updateFullSize() }" />
            <ResizableHandle class="h-4! bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 transition-colors after:hidden!" @dragging="(v: boolean) => v ? onVDragStart() : onVDragEnd()" />
            <ResizablePanel :default-size="100" :min-size="20">
              <ResizablePanelGroup direction="horizontal" class="h-full" @layout="onHorizontalLayout">
                <ResizablePanel ref="leftPanel" :default-size="0" @resize="(s: number) => { sideSizes.left = s; updateFullSize() }" />
                <ResizableHandle class="w-4 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 transition-colors after:hidden!" @dragging="(v: boolean) => v ? onHDragStart() : onHDragEnd()" />
                <ResizablePanel ref="previewEl" :default-size="100" :min-size="20">
                  <iframe
                    ref="iframeEl"
                    :srcdoc="srcdoc"
                    class="h-full w-full border-0 bg-white"
                  />
                </ResizablePanel>
                <ResizableHandle class="w-4 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 transition-colors after:hidden!" @dragging="(v: boolean) => v ? onHDragStart() : onHDragEnd()" />
                <ResizablePanel ref="rightPanel" :default-size="0" @resize="(s: number) => { sideSizes.right = s; updateFullSize() }" />
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle class="h-4! bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 transition-colors after:hidden!" @dragging="(v: boolean) => v ? onVDragStart() : onVDragEnd()" />
            <ResizablePanel ref="bottomPanel" :default-size="0" @resize="(s: number) => { sideSizes.bottom = s; updateFullSize() }" />
          </ResizablePanelGroup>
        </div>
      </div>
    </div>

    <!-- Tabs panel (always visible) -->
    <div
      class="shrink-0 bg-white dark:bg-gray-950 overflow-hidden"
      :class="!tabsDragging ? 'transition-[height] duration-200 ease-in-out' : ''"
      :style="{ height: `${tabsPanelHeight}px` }"
    >
        <div
          class="relative h-px bg-gray-200 dark:bg-gray-800 cursor-row-resize before:absolute before:-top-2 before:left-0 before:right-0 before:h-5 before:content-['']"
          @mousedown="onTabsDragStart"
        />
        <Tabs :model-value="activeTab" class="flex flex-col min-h-0 h-full">
          <div class="flex items-center justify-between min-h-10 px-4 shrink-0" :class="bottomPanelOpen ? 'border-b' : ''">
            <TabsList class="h-full bg-transparent! rounded-none! p-0 gap-1">
              <TabsTrigger value="compatibility" class="text-xs px-3 h-full rounded-none! border-0! shadow-none! border-b! border-transparent data-[state=active]:border-gray-400 data-[state=active]:dark:border-gray-600 data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent" @click="onTabClick('compatibility')">
                Compatibility
              </TabsTrigger>
              <TabsTrigger value="lint" class="text-xs px-3 h-full rounded-none! border-0! shadow-none! border-b! border-transparent data-[state=active]:border-gray-400 data-[state=active]:dark:border-gray-600 data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent" @click="onTabClick('lint')">
                Linter
              </TabsTrigger>
              <TabsTrigger value="stats" class="text-xs px-3 h-full rounded-none! border-0! shadow-none! border-b! border-transparent data-[state=active]:border-gray-400 data-[state=active]:dark:border-gray-600 data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent" @click="onTabClick('stats')">
                Stats
              </TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon" class="h-7 w-7 hover:bg-transparent!" @click="toggleBottomPanel">
              <ChevronUp v-if="!bottomPanelOpen" class="size-4" />
              <ChevronDown v-else class="size-4" />
            </Button>
          </div>
          <div class="flex-1 overflow-auto">
            <TabsContent value="compatibility" class="mt-0">
              <p v-if="compatibilityLoading" class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">Checking compatibility...</p>
              <p v-else-if="compatibilityIssues.length === 0" class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">No compatibility issues found.</p>
              <ul v-else class="text-xs divide-y">
                <li
                  v-for="(issue, i) in compatibilityIssues"
                  :key="i"
                  class="px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <a v-if="issue.url" :href="issue.url" target="_blank" rel="noopener" class="font-medium hover:underline" :class="issue.type === 'error' ? 'text-red-600' : 'text-amber-600'">
                        {{ issue.title }}
                      </a>
                      <span v-else class="font-medium" :class="issue.type === 'error' ? 'text-red-600' : 'text-amber-600'">
                        {{ issue.title }}
                      </span>
                      <div class="text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        <div v-for="client in issue.clients" :key="client.name">
                          <span class="text-gray-700 dark:text-gray-300">{{ client.name }}</span><span v-if="client.notes.length">: {{ client.notes.join('. ') }}</span>
                        </div>
                      </div>
                    </div>
                    <button v-if="issue.line" class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer tabular-nums shrink-0" @click="goToLine(issue.line!)">L{{ issue.line }}</button>
                  </div>
                </li>
              </ul>
            </TabsContent>
            <TabsContent value="lint" class="mt-0">
              <p v-if="lintLoading" class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">Linting...</p>
              <p v-else-if="lintIssues.length === 0" class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">No issues found.</p>
              <ul v-else class="text-xs divide-y">
                <li
                  v-for="(issue, i) in lintIssues"
                  :key="i"
                  class="px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <span class="font-medium" :class="issue.type === 'error' ? 'text-red-600' : 'text-amber-600'">
                        {{ issue.title }}
                      </span>
                      <div class="text-gray-500 dark:text-gray-400 mt-0.5">{{ issue.message }}</div>
                    </div>
                    <button v-if="issue.line" class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer tabular-nums shrink-0" @click="goToLine(issue.line!)">L{{ issue.line }}</button>
                  </div>
                </li>
              </ul>
            </TabsContent>
            <TabsContent value="stats" class="mt-0">
              <p v-if="statsLoading" class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">Loading stats...</p>
              <p v-else-if="!stats" class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">No stats available.</p>
              <div v-else class="px-4 py-3 flex items-center gap-6 text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="text-gray-500 dark:text-gray-400">Size</span>
                  <span
                    class="font-medium tabular-nums"
                    :class="stats.size.bytes > 102400 ? 'text-red-600' : stats.size.bytes > 51200 ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100'"
                  >{{ stats.size.formatted }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-gray-500 dark:text-gray-400">Images</span>
                  <span class="font-medium tabular-nums">{{ stats.images }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-gray-500 dark:text-gray-400">Links</span>
                  <span class="font-medium tabular-nums">{{ stats.links }}</span>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
  </div>
</template>
