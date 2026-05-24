<script setup lang="ts">
import { computed } from 'vue'
import { Terminal } from '@lucide/vue'
import { Kbd } from '@/components/ui/kbd'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

import markUrl from '@/mark.svg'
import markGradientUrl from '@/mark-gradient.svg'

const isMac = computed(() => navigator.platform.includes('Mac'))

function openCommandPalette() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))
}
</script>

<template>
  <Empty class="h-full">
    <EmptyHeader>
      <EmptyMedia>
        <img :src="markUrl" alt="Maizzle" class="size-12 dark:hidden">
        <img :src="markGradientUrl" alt="Maizzle" class="hidden size-12 dark:block">
      </EmptyMedia>
      <EmptyTitle>Select an email to preview</EmptyTitle>
      <EmptyDescription>
        Choose an email from the <span class="md:hidden">menu</span><span class="hidden md:inline">sidebar</span> to see a live preview.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <p
        class="text-gray-500 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        @click="openCommandPalette"
      >
        <span class="md:hidden inline-flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-1.5"><Terminal class="size-3.5" /> Quick search</span>
        <span class="hidden md:inline">Press <Kbd>{{ isMac ? '⌘' : 'Ctrl' }}</Kbd> + <Kbd>K</Kbd> to open the command palette</span>
      </p>
    </EmptyContent>
  </Empty>
</template>
