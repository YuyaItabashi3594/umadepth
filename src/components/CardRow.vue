<script setup lang="ts">
withDefaults(
  defineProps<{
    gap?: number;
    columns?: number;
  }>(),
  {
    gap: 4
  }
);
</script>

<template>
  <div
    class="flex gap-2 flex-wrap"
    :style="columns ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)` } : {}"
  >
    <slot />
  </div>
</template>
