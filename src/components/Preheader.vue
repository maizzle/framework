<script setup lang="ts">
defineProps({
  /** Number of `&#8199;&#65279;&#847;` filler sequences to render after the preview text. */
  spaces: {
    type: Number,
    default: 150
  }
})
</script>

<template>
  <Teleport to="body:start">
    <div style="display: none"><slot /><template v-for="i in spaces" :key="i">&#8199;&#65279;&#847; </template>&nbsp;</div>
  </Teleport>
</template>
