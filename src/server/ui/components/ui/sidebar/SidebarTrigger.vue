<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { PanelRightClose, PanelRightOpen } from "@lucide/vue"
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import { useSidebar } from "./utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const { isMobile, open, toggleSidebar } = useSidebar()
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon"
    :class="cn('h-7 w-7 hover:bg-transparent', props.class)"
    @click="toggleSidebar"
  >
    <PanelRightClose v-if="isMobile" class="size-4 dark:text-gray-400" :stroke-width="1" />
    <PanelRightOpen v-else-if="open" class="dark:text-gray-400" :stroke-width="1" />
    <PanelRightClose v-else class="dark:text-gray-400" :stroke-width="1" />
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
