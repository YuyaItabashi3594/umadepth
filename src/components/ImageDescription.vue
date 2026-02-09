<script setup lang="ts">
withDefaults(
  defineProps<{
    gap?: number;
    imageWidth?: string;
  }>(),
  {
    gap: 16,
    imageWidth: 'auto'
  }
);
</script>

<template>
  <div class="flex items-center justify-center border p-2 rounded-md" :style="{ gap: `${gap}px` }">
    <div class="image-section" :style="{ width: imageWidth }">
      <slot name="image" />
    </div>
    <div class="">
      <slot name="description" />
    </div>
  </div>
</template>

<style scoped>

.image-section {
  flex-shrink: 0;
}
</style>
