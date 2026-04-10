<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { Monitor, CodeXml, Smartphone, ChevronDown, ArrowUp, ArrowDown, CornerDownLeft, Check, X, Search } from 'lucide-vue-next'
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
  SidebarInput,
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
const search = ref('')
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
  const filtered = templates.value.filter(t =>
    t.name.toLowerCase().includes(search.value.toLowerCase())
    || t.path.toLowerCase().includes(search.value.toLowerCase())
  )

  const groups: Record<string, Template[]> = {}

  for (const t of filtered) {
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
const commandOpen = ref(false)

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
  }
}

function isInputFocused() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <SidebarProvider v-model:open="sidebarOpen">
    <Sidebar collapsible="offcanvas" class="border-r border-gray-200 dark:border-gray-800">
      <SidebarHeader class="h-12 flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4">
        <RouterLink to="/" class="flex items-center gap-2">
          <img :src="logoUrl" alt="Maizzle" class="h-4 dark:hidden">
          <img :src="logoGradientUrl" alt="Maizzle" class="hidden h-4 dark:block">
        </RouterLink>
        <SidebarTrigger class="-mr-1" />
      </SidebarHeader>

      <div class="px-3 pt-3 pb-1">
        <div class="relative flex items-center">
          <Search class="absolute left-2.5 size-3.5 text-gray-400 pointer-events-none" />
          <SidebarInput
            v-model="search"
            placeholder="Search emails..."
            class="text-xs! pl-8 pr-14"
            @keydown.esc="search && (search = '')"
          />
          <button
            v-if="search"
            class="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            @click="search = ''"
          >
            <X class="size-3.5" />
          </button>
          <kbd v-else class="absolute right-2 flex items-center gap-0.5 text-[10px] font-sans cursor-pointer" @click="commandOpen = true">
            <span class="text-gray-400 dark:text-gray-500">{{ typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl' }}</span>
            <span class="text-gray-300 dark:text-gray-600">K</span>
          </kbd>
        </div>
      </div>

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
        <div>
          <Transition
            enter-from-class="opacity-0"
            enter-active-class="transition-opacity duration-150 delay-200"
            leave-active-class="transition-opacity duration-0"
            leave-to-class="opacity-0"
          >
            <SidebarTrigger v-show="!sidebarOpen" />
          </Transition>
        </div>

        <!-- View mode toggles (centered) -->
        <ToggleGroup v-if="isPreviewRoute" v-model="viewMode" type="single" variant="outline" size="sm">
          <ToggleGroupItem value="preview">
            <Monitor class="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="source">
            <CodeXml class="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <div v-else />

        <div class="flex items-center justify-end gap-3">
          <span
            v-if="isPreviewRoute && (!isFullSize || selectedDevice) && panelWidth"
            class="text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400 select-none"
          >
            {{ panelWidth }} &times; {{ panelHeight }}
          </span>
          <DropdownMenu v-if="isPreviewRoute">
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm" class="gap-1.5">
                <Smartphone class="size-4" />
                <span v-if="selectedDevice" class="text-xs">{{ selectedDevice.name }}</span>
                <ChevronDown class="size-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="selectedDevice = null; viewMode = 'preview'; resetKey++">
                <Check v-if="!selectedDevice" class="size-3.5" />
                <span :class="!selectedDevice ? '' : 'pl-5.5'">Responsive</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                v-for="device in devicePresets"
                :key="device.name"
                @click="selectDevice(device)"
              >
                <Check v-if="selectedDevice?.name === device.name" class="size-3.5" />
                <span :class="selectedDevice?.name === device.name ? '' : 'pl-5.5'">{{ device.name }}</span>
                <span class="ml-auto text-xs text-gray-500 dark:text-gray-400 tabular-nums">{{ device.width }}&times;{{ device.height }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <!-- Main content -->
      <div class="flex-1 overflow-hidden">
        <RouterView v-slot="{ Component }">
          <component :is="Component" v-model:view-mode="viewMode" :device="selectedDevice" :reset-key="resetKey" v-model:panel-width="panelWidth" v-model:panel-height="panelHeight" v-model:is-dragging="isDragging" v-model:is-full-size="isFullSize" @clear-device="selectedDevice = null" />
        </RouterView>
      </div>
    </SidebarInset>

    <CommandDialog v-model:open="commandOpen" title="Search emails" description="Search and navigate to an email">
      <CommandInput placeholder="Search emails..." />
      <CommandList>
        <CommandEmpty>No emails found.</CommandEmpty>
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
      </CommandList>
      <div class="flex items-center gap-4 border-t px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
        <span class="inline-flex items-center gap-1">
          <Kbd><ArrowUp class="size-3" /></Kbd>
          <Kbd><ArrowDown class="size-3" /></Kbd>
          Navigate
        </span>
        <span class="inline-flex items-center gap-1">
          <Kbd><CornerDownLeft class="size-3" /></Kbd>
          Open
        </span>
        <span class="inline-flex items-center gap-1">
          <Kbd>Esc</Kbd>
          Close
        </span>
      </div>
    </CommandDialog>
  </SidebarProvider>
</template>
