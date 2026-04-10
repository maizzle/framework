<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { PanelRightClose, PanelRightOpen } from "lucide-vue-next"
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import { useSidebar } from "./utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const { open, toggleSidebar } = useSidebar()
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon"
    :class="cn('h-7 w-7', props.class)"
    @click="toggleSidebar"
  >
    <PanelRightOpen v-if="open" class="dark:text-gray-400" />
    <PanelRightClose v-else class="dark:text-gray-400" />
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
