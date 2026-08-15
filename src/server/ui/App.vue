<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { Monitor, CodeXml, Smartphone, ChevronDown, ArrowUp, ArrowDown, CornerDownLeft, Check, Search, FileCode, FileText, Code, BookText, MailQuestion, Moon, Sun } from '@lucide/vue'
import SidebarClose from '@/components/SidebarClose.vue'
import logoUrl from '@/logo.svg'
import logoGradientUrl from '@/logo-gradient.svg'
import { Kbd } from '@/components/ui/kbd'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { useFilter } from 'reka-ui'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'


interface Template {
  name: string
  path: string
  href: string
}

const route = useRoute()

watchEffect(() => {
  const slug = route.path === '/' ? '' : route.path.split('/').pop()
  if (!slug) {
    document.title = 'Maizzle Dev'
    return
  }
  const tpl = templates.value.find(t => t.href === route.path)
  const ext = tpl?.path.endsWith('.md') ? '.md' : '.vue'
  document.title = `Maizzle Dev - ${slug}${ext}`
})

const templates = ref<Template[]>([])
const loading = ref(true)
const viewMode = ref<'preview' | 'source'>('preview')
const sidebarOpen = ref(localStorage.getItem('maizzle:sidebar') !== 'closed')

interface DevicePreset {
  name: string
  width: number
  height: number
}

const devicePresets: DevicePreset[] = [
  { name: 'iPhone 17 Pro', width: 390, height: 844 },
  { name: 'iPhone 17 Pro Max', width: 430, height: 932 },
  { name: 'iPad Pro 11"', width: 834, height: 1194 },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366 },
  { name: 'Galaxy S26 Ultra', width: 412, height: 915 },
  { name: 'Pixel 9 Pro', width: 393, height: 873 },
  { name: 'Redmi Note 13 Lite', width: 360, height: 800 },
]

const selectedDevice = ref<DevicePreset | null>(null)
const deviceMenuOpen = ref(false)
const darkMode = ref(false)
const panelWidth = ref(0)
const panelHeight = ref(0)
const iframeWidth = ref<number | null>(null)
const iframeHeight = ref<number | null>(null)
const maxIframeWidth = ref(0)
const maxIframeHeight = ref(0)
const isDragging = ref(false)
const isFullSize = ref(true)
const resetKey = ref(0)

function selectDevice(device: DevicePreset) {
  selectedDevice.value = device
  viewMode.value = 'preview'
}

/**
 * Writable proxies for the toolbar's size-indicator inputs. Display falls back
 * to the measured panel size when the iframe dimension is null (the axis
 * hasn't been explicitly set yet — e.g. user only dragged one axis).
 * Setter rejects non-finite/non-positive values and clamps to
 * [200, maxIframeWidth] / [100, maxIframeHeight] so users
 * can't push the drag handles off-screen via the input.
 */
const widthInput = computed<number>({
  get: () => Math.round(iframeWidth.value ?? panelWidth.value),
  set: (v) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return
    const max = maxIframeWidth.value || v
    iframeWidth.value = Math.max(200, Math.min(max, Math.round(v)))
  },
})
const heightInput = computed<number>({
  get: () => Math.round(iframeHeight.value ?? panelHeight.value),
  set: (v) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return
    const max = maxIframeHeight.value || v
    iframeHeight.value = Math.max(100, Math.min(max, Math.round(v)))
  },
})

watch(sidebarOpen, (open) => {
  localStorage.setItem('maizzle:sidebar', open ? 'open' : 'closed')
})

async function fetchTemplates(revealActive = false) {
  const res = await fetch('/__maizzle/templates')
  templates.value = await res.json()
  loading.value = false
  // On first load (e.g. after a dev-server restart) reveal the template being
  // viewed so a restart doesn't leave you lost in a long sidebar.
  if (revealActive && isPreviewRoute.value) {
    await nextTick()
    scrollSidebarToTemplate(route.path)
  }
}

onMounted(() => fetchTemplates(true))

if ((import.meta as any).hot) {
  (import.meta as any).hot.on('maizzle:templates-changed', () => fetchTemplates())
}

const grouped = computed(() => {
  const groups: Record<string, Template[]> = {}

  for (const t of templates.value) {
    const parts = t.path.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
    if (!groups[dir]) groups[dir] = []
    groups[dir].push(t)
  }

  return groups
})

const filteredCount = computed(() => {
  return Object.values(grouped.value).reduce((sum, items) => sum + items.length, 0)
})

const isActive = (href: string) => route.path === href

const isPreviewRoute = computed(() => route.path !== '/')

// Command palette
const router = useRouter()
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const modKey = isMac ? '⌘' : 'Ctrl'
const commandOpen = ref(false)
const commandSearch = ref('')

/**
 * The search survives closing the palette so you can refine a query instead
 * of retyping it (handy when hunting through hundreds of emails). It is only
 * cleared when an actual command runs; selecting a template keeps the query
 * so you can come back to the same list.
 *
 * Reka resets its filter whenever an item is selected, which would wipe the
 * query, so template selection restores it on the next tick.
 */
function closeCommandPalette(clear = false) {
  commandOpen.value = false
  if (clear) commandSearch.value = ''
}


async function copyHtml() {
  closeCommandPalette(true)
  const slug = route.params.template as string
  if (!slug) return
  const res = await fetch(`/__maizzle/render/${slug}`)
  await navigator.clipboard.writeText(await res.text())
}

async function copyPlaintext() {
  closeCommandPalette(true)
  const slug = route.params.template as string
  if (!slug) return
  const res = await fetch(`/__maizzle/plaintext/${slug}`)
  await navigator.clipboard.writeText(await res.text())
}

async function copySource() {
  closeCommandPalette(true)
  const slug = route.params.template as string
  if (!slug) return
  const res = await fetch(`/__maizzle/vue-source/${slug}`)
  const html = await res.text()
  const el = document.createElement('div')
  el.innerHTML = html
  await navigator.clipboard.writeText(el.textContent || '')
}

const { contains } = useFilter({ sensitivity: 'base' })

/**
 * Cap how many template results render at once. Rendering every template as
 * a CommandItem freezes the palette on the first keystroke in large projects
 * (100s–1000s of templates), so we only render the matches, up to this many.
 */
const MAX_TEMPLATE_RESULTS = 50

/**
 * Match templates against the search in a single pass: count every match for
 * the footer, but only group the first MAX_TEMPLATE_RESULTS for rendering.
 */
const templateResults = computed(() => {
  const groups: Record<string, Template[]> = {}
  const tokens = commandSearch.value.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { groups, total: 0 }
  let total = 0
  for (const t of templates.value) {
    const haystack = `${getFileName(t.path)} ${t.path.split('/').join(' ')}`
    if (!tokens.every(token => contains(haystack, token))) continue
    total++
    if (total <= MAX_TEMPLATE_RESULTS) {
      const parts = t.path.split('/')
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
      ;(groups[dir] ??= []).push(t)
    }
  }
  return { groups, total }
})

const filteredCommandGrouped = computed(() => templateResults.value.groups)
const filteredTemplatesCount = computed(() => templateResults.value.total)
const templatesTruncated = computed(() => templateResults.value.total > MAX_TEMPLATE_RESULTS)

function getFileName(path: string) {
  return path.split('/').pop() || path
}

/**
 * Reveal a template in the sidebar. Jumping via the palette (or landing on a
 * template after a dev-server restart) otherwise leaves the active item
 * scrolled out of view in large projects.
 */
function scrollSidebarToTemplate(href: string) {
  // CSS.escape the value — hrefs come from file paths and may contain
  // characters that would otherwise break the attribute selector.
  document.querySelector(`[data-sidebar-template=${CSS.escape(href)}]`)?.scrollIntoView({ block: 'center' })
}

function onCommandSelect(href: string) {
  // Keep the query so navigating to a template doesn't lose the search;
  // restore it after Reka's select-reset has wiped the filter.
  const query = commandSearch.value
  closeCommandPalette()
  router.push(href)
  nextTick(() => {
    commandSearch.value = query
    scrollSidebarToTemplate(href)
  })
}

function openExternal(url: string) {
  closeCommandPalette(true)
  window.open(url, '_blank', 'noopener')
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    commandOpen.value = !commandOpen.value
    return
  }

  if (e.key === '/' && !isInputFocused()) {
    e.preventDefault()
    commandOpen.value = true
    return
  }

  // Copy shortcuts (Cmd on Mac, Alt on Win/Linux)
  if ((isMac ? e.metaKey : e.altKey) && !e.shiftKey && isPreviewRoute.value) {
    switch (e.key.toLowerCase()) {
      case 'c':
        e.preventDefault()
        copyHtml()
        return
      case 'p':
        e.preventDefault()
        copyPlaintext()
        return
      case 'u':
        e.preventDefault()
        copySource()
        return
    }
  }
}

function isInputFocused() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable
}

function onWindowBlur() {
  deviceMenuOpen.value = false
}

function toggleDarkMode() {
  closeCommandPalette(true)
  darkMode.value = !darkMode.value
}

const vFade = {
  mounted(el: HTMLElement) {
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      el.style.setProperty('--fade-l', el.scrollLeft > 1 ? 'transparent' : '#000')
      el.style.setProperty('--fade-r', el.scrollLeft < max - 1 ? 'transparent' : '#000')
    }
    ;(el as any)._fade = update
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const observer = new ResizeObserver(update)
    observer.observe(el)
    ;(el as any)._fadeObserver = observer
    requestAnimationFrame(update)
  },
  updated(el: HTMLElement) {
    requestAnimationFrame((el as any)._fade)
  },
  unmounted(el: HTMLElement) {
    el.removeEventListener('scroll', (el as any)._fade)
    window.removeEventListener('resize', (el as any)._fade)
    ;(el as any)._fadeObserver?.disconnect()
  },
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('blur', onWindowBlur)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('blur', onWindowBlur)
})
</script>

<template>
  <SidebarProvider v-model:open="sidebarOpen">
    <Sidebar collapsible="offcanvas" class="border-r border-gray-200 dark:border-gray-800">
      <SidebarHeader class="h-12 flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4">
        <RouterLink to="/" class="flex items-center gap-2">
          <img :src="logoUrl" alt="Maizzle" class="h-4 dark:hidden">
          <img :src="logoGradientUrl" alt="Maizzle" class="hidden h-4 dark:block">
        </RouterLink>
        <button class="hidden md:inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="commandOpen = true">
          <Search class="size-3.5 text-gray-500 dark:text-gray-300" :stroke-width="1" />
          <kbd class="flex items-center gap-0.5 text-[10px] font-sans">
            <span>{{ modKey }}</span>
            <span class="text-gray-300 dark:text-gray-600">K</span>
          </kbd>
        </button>
        <SidebarClose />
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea class="flex-1 min-h-0">
          <SidebarGroup v-if="loading">
            <p class="px-2 py-4 text-xs text-gray-500 dark:text-gray-400">Loading emails...</p>
          </SidebarGroup>

          <SidebarGroup v-else-if="filteredCount === 0">
            <p class="px-2 py-4 text-xs text-gray-500 dark:text-gray-400">No emails found.</p>
          </SidebarGroup>

          <SidebarGroup v-for="(items, dir) in grouped" :key="dir" v-else>
            <SidebarGroupLabel>
              <span v-fade class="min-w-0 overflow-x-auto whitespace-nowrap scrollbar-hide fade-scroll">{{ dir }}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem v-for="t in items" :key="t.path">
                  <SidebarMenuButton
                    as-child
                    size="sm"
                    :is-active="isActive(t.href)"
                    class="data-[active=true]:font-semibold"
                  >
                    <RouterLink :to="t.href" :data-sidebar-template="t.href" class="truncate">
                      <span class="mz-tpl-icon size-4 shrink-0 opacity-70" :class="t.path.endsWith('.md') ? 'mz-tpl-icon-md' : 'mz-tpl-icon-vue'" />
                      <span class="truncate">{{ t.name }}</span>
                    </RouterLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter class="h-10 justify-center border-t border-gray-200 dark:border-gray-800">
        <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ templates.length }} email{{ templates.length !== 1 ? 's' : '' }}</p>
      </SidebarFooter>
    </Sidebar>

    <SidebarInset>
      <!-- Header toolbar -->
      <header class="grid h-12 grid-cols-[1fr_auto_1fr] items-center border-b px-4">
        <div class="flex items-center">
          <SidebarTrigger />
        </div>

        <!-- View mode toggles (centered) -->
        <ToggleGroup v-if="isPreviewRoute" v-model="viewMode" type="single" variant="outline" size="sm">
          <ToggleGroupItem value="preview">
            <Monitor class="size-4 dark:text-gray-400" :stroke-width="1" />
          </ToggleGroupItem>
          <ToggleGroupItem value="source">
            <CodeXml class="size-4 dark:text-gray-400" :stroke-width="1" />
          </ToggleGroupItem>
        </ToggleGroup>
        <div v-else />

        <div class="flex items-center justify-end gap-3">
          <span
            v-if="isPreviewRoute && (!isFullSize || selectedDevice) && panelWidth"
            class="hidden min-[430px]:inline text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400 select-none"
          >
            <input
              v-model.number="widthInput"
              type="number"
              min="200"
              :max="maxIframeWidth || undefined"
              aria-label="Preview width"
              class="bg-transparent border-0 outline-none p-0 m-0 text-inherit font-inherit text-center tabular-nums w-[4.5ch] focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            >
            <button class="hover:text-gray-700 dark:hover:text-gray-300" @click="selectedDevice = null; isFullSize = true; viewMode = 'preview'; resetKey++">&times;</button>
            <input
              v-model.number="heightInput"
              type="number"
              min="100"
              :max="maxIframeHeight || undefined"
              aria-label="Preview height"
              class="bg-transparent border-0 outline-none p-0 m-0 text-inherit font-inherit text-center tabular-nums w-[4.5ch] focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            >
          </span>
          <div v-if="isPreviewRoute" class="flex items-center gap-1">
            <DropdownMenu v-model:open="deviceMenuOpen" :modal="false">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="hidden min-[430px]:inline-flex gap-1.5 shadow-none border-none hover:bg-transparent">
                <Smartphone class="size-4 dark:text-gray-400" :stroke-width="1" />
                <span v-if="selectedDevice" class="text-xs">{{ selectedDevice.name }}</span>
                <ChevronDown class="size-3 opacity-50" :stroke-width="1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="min-w-52 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md dark:border-white/10">
              <DropdownMenuItem class="text-xs font-medium text-gray-600 dark:text-gray-400 focus:text-gray-900 dark:focus:text-gray-200" @click="selectedDevice = null; isFullSize = true; viewMode = 'preview'; resetKey++">
                <Check v-if="!selectedDevice && isFullSize" class="size-3 text-gray-900 dark:text-gray-200" />
                <span :class="[!selectedDevice && isFullSize ? 'text-gray-900 dark:text-gray-200' : 'pl-5']">Full size</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                v-for="device in devicePresets"
                :key="device.name"
                class="text-xs font-medium text-gray-600 dark:text-gray-400 focus:text-gray-900 dark:focus:text-gray-200"
                @click="selectDevice(device)"
              >
                <Check v-if="selectedDevice?.name === device.name" class="size-3 text-gray-900 dark:text-gray-200" />
                <span :class="[selectedDevice?.name === device.name ? 'text-gray-900 dark:text-gray-200' : 'pl-5']">{{ device.name }}</span>
                <span class="ml-auto text-[11px] text-gray-400 dark:text-gray-500 tabular-nums tracking-tight">{{ device.width }}&times;{{ device.height }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <!-- Main content -->
      <div class="flex-1 overflow-hidden">
        <RouterView v-slot="{ Component }">
          <component :is="Component" v-model:view-mode="viewMode" :device="selectedDevice" :reset-key="resetKey" :templates="templates" v-model:panel-width="panelWidth" v-model:panel-height="panelHeight" v-model:iframe-width="iframeWidth" v-model:iframe-height="iframeHeight" v-model:max-iframe-width="maxIframeWidth" v-model:max-iframe-height="maxIframeHeight" v-model:is-dragging="isDragging" v-model:is-full-size="isFullSize" v-model:dark-mode="darkMode" @clear-device="selectedDevice = null; isFullSize = false" />
        </RouterView>
      </div>
    </SidebarInset>

    <CommandDialog v-model:open="commandOpen" title="Command palette" description="Run commands or search emails">
      <CommandInput v-model="commandSearch" placeholder="Type a command or find an email..." />
      <CommandList class="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>

        <!-- Preview commands -->
        <CommandGroup v-if="isPreviewRoute && viewMode === 'preview'" heading="Preview">
          <CommandItem
            :value="darkMode ? 'Disable dark mode' : 'Emulate dark mode'"
            @select="toggleDarkMode"
          >
            <Sun v-if="darkMode" class="size-3 shrink-0 opacity-50" />
            <Moon v-else class="size-3 shrink-0 opacity-50" />
            <span>{{ darkMode ? 'Disable dark mode' : 'Emulate dark mode' }}</span>
          </CommandItem>
        </CommandGroup>

        <!-- Copy to clipboard commands -->
        <CommandGroup v-if="isPreviewRoute" heading="Copy to clipboard">
          <CommandItem
            value="HTML"
            @select="copyHtml"
          >
            <FileCode class="size-3 shrink-0 opacity-70" :stroke-width="1" />
            <span>HTML</span>
            <CommandShortcut>{{ isMac ? '⌘' : 'ALT+' }}C</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="Plaintext"
            @select="copyPlaintext"
          >
            <FileText class="size-3 shrink-0 opacity-70" :stroke-width="1" />
            <span>Plaintext</span>
            <CommandShortcut>{{ isMac ? '⌘' : 'ALT+' }}P</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="Vue source"
            @select="copySource"
          >
            <Code class="size-3 shrink-0 opacity-70" :stroke-width="1" />
            <span>Vue source</span>
            <CommandShortcut>{{ isMac ? '⌘' : 'ALT+' }}U</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <!-- Resources -->
        <CommandGroup heading="Resources">
          <CommandItem
            value="Documentation"
            @select="openExternal('https://maizzle.com')"
          >
            <BookText class="size-3 shrink-0 opacity-70" :stroke-width="1" />
            <span>Documentation</span>
          </CommandItem>
          <CommandItem
            value="Can I Email"
            @select="openExternal('https://www.caniemail.com')"
          >
            <MailQuestion class="size-3 shrink-0 opacity-70" :stroke-width="1" />
            <span>Can I Email</span>
          </CommandItem>
        </CommandGroup>

        <!-- Templates -->
        <template v-if="commandSearch">
          <CommandGroup v-for="(items, dir) in filteredCommandGrouped" :key="dir" :heading="String(dir)">
            <CommandItem
              v-for="t in items"
              :key="t.path"
              :value="t.path"
              @select="onCommandSelect(t.href)"
            >
              <span class="mz-tpl-icon size-3 shrink-0 opacity-70" :class="t.path.endsWith('.md') ? 'mz-tpl-icon-md' : 'mz-tpl-icon-vue'" />
              <span>{{ getFileName(t.path) }}</span>
              <span class="sr-only">{{ ' ' + t.path.split('/').join(' ') }}</span>
            </CommandItem>
          </CommandGroup>
        </template>
      </CommandList>
      <div class="flex items-center gap-4 border-t px-3 py-2 text-xs text-gray-500 dark:text-gray-400 cursor-default select-none">
        <span class="inline-flex items-center gap-1">
          <Kbd><ArrowUp class="size-3" /></Kbd>
          <Kbd><ArrowDown class="size-3" /></Kbd>
          Navigate
        </span>
        <span class="inline-flex items-center gap-1">
          <Kbd><CornerDownLeft class="size-3" /></Kbd>
          {{ commandSearch ? 'View' : 'Run' }}
        </span>
        <span class="inline-flex items-center gap-1">
          <Kbd>Esc</Kbd>
          Close
        </span>
        <span v-if="commandSearch" class="ml-auto">
          <template v-if="templatesTruncated">Showing {{ MAX_TEMPLATE_RESULTS }} of {{ filteredTemplatesCount }} — refine to narrow</template>
          <template v-else>{{ filteredTemplatesCount }} {{ filteredTemplatesCount === 1 ? 'result' : 'results' }}</template>
        </span>
      </div>
    </CommandDialog>
  </SidebarProvider>
</template>
