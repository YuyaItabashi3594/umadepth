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
  <!-- sm未満は画像→説明の縦並び、sm以上は横並び -->
  <div
    class="flex flex-col items-start sm:flex-row sm:items-center justify-start border p-2 rounded-md"
    :style="{ gap: `${gap}px` }"
  >
    <div class="image-section" :style="{ width: imageWidth }">
      <slot name="image" />
    </div>
    <div class="min-w-0">
      <slot name="description" />
    </div>
  </div>
</template>

<style scoped>

.image-section {
  flex-shrink: 0;
  max-width: 100%;
}
</style>
