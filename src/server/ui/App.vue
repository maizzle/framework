<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { Monitor, CodeXml, Smartphone, ChevronDown, ArrowUp, ArrowDown, CornerDownLeft, Check, Search, FileCode, FileText, Code, BookText, MailQuestion } from 'lucide-vue-next'
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
  document.title = slug ? `Maizzle Dev - ${slug}.vue` : 'Maizzle Dev'
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
const panelWidth = ref(0)
const panelHeight = ref(0)
const isDragging = ref(false)
const isFullSize = ref(true)
const resetKey = ref(0)

function selectDevice(device: DevicePreset) {
  selectedDevice.value = device
  viewMode.value = 'preview'
}

watch(sidebarOpen, (open) => {
  localStorage.setItem('maizzle:sidebar', open ? 'open' : 'closed')
})

async function fetchTemplates() {
  const res = await fetch('/__maizzle/templates')
  templates.value = await res.json()
  loading.value = false
}

onMounted(fetchTemplates)

if ((import.meta as any).hot) {
  (import.meta as any).hot.on('maizzle:templates-changed', fetchTemplates)
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

watch(commandOpen, (open) => {
  if (!open) commandSearch.value = ''
})


async function copyHtml() {
  commandOpen.value = false
  const slug = route.params.template as string
  if (!slug) return
  const res = await fetch(`/__maizzle/render/${slug}`)
  await navigator.clipboard.writeText(await res.text())
}

async function copyPlaintext() {
  commandOpen.value = false
  const slug = route.params.template as string
  if (!slug) return
  const res = await fetch(`/__maizzle/plaintext/${slug}`)
  await navigator.clipboard.writeText(await res.text())
}

async function copySource() {
  commandOpen.value = false
  const slug = route.params.template as string
  if (!slug) return
  const res = await fetch(`/__maizzle/vue-source/${slug}`)
  const html = await res.text()
  const el = document.createElement('div')
  el.innerHTML = html
  await navigator.clipboard.writeText(el.textContent || '')
}

const commandGrouped = computed(() => {
  const groups: Record<string, Template[]> = {}

  for (const t of templates.value) {
    const parts = t.path.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
    if (!groups[dir]) groups[dir] = []
    groups[dir].push(t)
  }

  return groups
})


function getFileName(path: string) {
  return path.split('/').pop() || path
}

function onCommandSelect(href: string) {
  commandOpen.value = false
  router.push(href)
}

function openExternal(url: string) {
  commandOpen.value = false
  window.open(url, '_blank', 'noopener')
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    commandOpen.value = !commandOpen.value
    return
  }

  if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
    e.preventDefault()
    sidebarOpen.value = !sidebarOpen.value
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
          <Search class="size-3.5" />
          <kbd class="flex items-center gap-0.5 text-[10px] font-sans">
            <span>{{ modKey }}</span>
            <span class="text-gray-300 dark:text-gray-600">K</span>
          </kbd>
        </button>
        <SidebarClose />
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea class="flex-1">
          <SidebarGroup v-if="loading">
            <p class="px-2 py-4 text-xs text-gray-500 dark:text-gray-400">Loading emails...</p>
          </SidebarGroup>

          <SidebarGroup v-else-if="filteredCount === 0">
            <p class="px-2 py-4 text-xs text-gray-500 dark:text-gray-400">No emails found.</p>
          </SidebarGroup>

          <SidebarGroup v-for="(items, dir) in grouped" :key="dir" v-else>
            <SidebarGroupLabel>{{ dir }}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem v-for="t in items" :key="t.path">
                  <SidebarMenuButton
                    as-child
                    size="sm"
                    :is-active="isActive(t.href)"
                  >
                    <RouterLink :to="t.href" class="truncate">
                      <svg class="size-3 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                      </svg>
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
            {{ panelWidth }} <button class="hover:text-gray-700 dark:hover:text-gray-300" @click="selectedDevice = null; isFullSize = true; viewMode = 'preview'; resetKey++">&times;</button> {{ panelHeight }}
          </span>
          <DropdownMenu v-if="isPreviewRoute" v-model:open="deviceMenuOpen" :modal="false">
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
      </header>

      <!-- Main content -->
      <div class="flex-1 overflow-hidden">
        <RouterView v-slot="{ Component }">
          <component :is="Component" v-model:view-mode="viewMode" :device="selectedDevice" :reset-key="resetKey" :templates="templates" v-model:panel-width="panelWidth" v-model:panel-height="panelHeight" v-model:is-dragging="isDragging" v-model:is-full-size="isFullSize" @clear-device="selectedDevice = null; isFullSize = false" />
        </RouterView>
      </div>
    </SidebarInset>

    <CommandDialog v-model:open="commandOpen" title="Command palette" description="Run commands or search emails">
      <CommandInput v-model="commandSearch" placeholder="Type a command or find an email..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <!-- Copy to clipboard commands -->
        <CommandGroup v-if="isPreviewRoute" heading="Copy to clipboard">
          <CommandItem
            value="HTML"
            @select="copyHtml"
          >
            <FileCode class="size-3 shrink-0 opacity-50" />
            <span>HTML</span>
            <CommandShortcut>{{ isMac ? '⌘' : 'ALT+' }}C</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="Plaintext"
            @select="copyPlaintext"
          >
            <FileText class="size-3 shrink-0 opacity-50" />
            <span>Plaintext</span>
            <CommandShortcut>{{ isMac ? '⌘' : 'ALT+' }}P</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="Vue source"
            @select="copySource"
          >
            <Code class="size-3 shrink-0 opacity-50" />
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
            <BookText class="size-3 shrink-0 opacity-50" />
            <span>Documentation</span>
          </CommandItem>
          <CommandItem
            value="Can I Email"
            @select="openExternal('https://www.caniemail.com')"
          >
            <MailQuestion class="size-3 shrink-0 opacity-50" />
            <span>Can I Email</span>
          </CommandItem>
        </CommandGroup>

        <!-- Templates -->
        <template v-if="commandSearch">
          <CommandGroup v-for="(items, dir) in commandGrouped" :key="dir" :heading="String(dir)">
            <CommandItem
              v-for="t in items"
              :key="t.path"
              :value="t.path"
              @select="onCommandSelect(t.href)"
            >
              <svg class="size-3 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              </svg>
              <span>{{ getFileName(t.path) }}</span>
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
      </div>
    </CommandDialog>
  </SidebarProvider>
</template>
