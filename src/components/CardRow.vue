<script setup lang="ts">
withDefaults(
  defineProps<{
    gap?: number;
  }>(),
  {
    gap: 4
  }
);
</script>

<template>
  <div class="flex gap-4 flex-wrap">
    <slot />
  </div>
</template>