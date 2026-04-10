<script setup lang="ts">
import { computed } from 'vue'
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
        Choose an email from the sidebar to see a live preview.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <p
        class="text-gray-500 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        @click="openCommandPalette"
      >
        Press
        <Kbd>{{ isMac ? '⌘' : 'Ctrl' }}</Kbd> + <Kbd>K</Kbd>
        to open the command palette
      </p>
    </EmptyContent>
  </Empty>
</template>
