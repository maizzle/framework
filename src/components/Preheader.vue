<script setup lang="ts">
defineProps({
  /** Number of `&#8199;&#847;` filler pairs to render. */
  fillerCount: {
    type: Number,
    default: 150
  },
  /** Number of `&shy;` entities to render. */
  shyCount: {
    type: Number,
    default: 150
  }
})
</script>

<template>
  <Teleport to="body:start">
    <div style="display: none"><slot /><template v-for="i in fillerCount" :key="'f'+i">&#8199;&#847; </template><template v-for="i in shyCount" :key="'s'+i">&shy; </template>&nbsp;</div>
  </Teleport>
</template>
