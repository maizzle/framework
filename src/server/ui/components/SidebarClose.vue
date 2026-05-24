<script setup lang="ts">
import { PanelRightOpen } from '@lucide/vue'
import { useSidebar } from '@/components/ui/sidebar'

const { setOpenMobile } = useSidebar()
</script>

<template>
  <button class="md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="setOpenMobile(false)">
    <PanelRightOpen class="size-4" :stroke-width="1" />
  </button>
</template>
