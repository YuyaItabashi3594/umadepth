<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    defaultOpen?: boolean
  }>(),
  {
    defaultOpen: false,
  },
)

const isOpen = ref(props.defaultOpen)

const toggle = () => {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div class="collapsible-container">
    <!-- ヘッダー -->
    <button class="collapsible-header" @click="toggle" :aria-expanded="isOpen">
      <slot name="title">
        <span class="font-semibold text-lg">{{ props.title }}</span>
      </slot>
      <svg
        class="w-5 h-5 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- コンテンツ -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="max-h-0 opacity-0"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-show="isOpen" class="collapsible-content">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.collapsible-container {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.collapsible-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: var(--color-background-mute);
  transition: background-color 0.2s;
  text-align: left;
  cursor: pointer;
  border: none;
  color: var(--color-text);
}

.collapsible-header:hover {
  background-color: var(--color-background-soft);
}

.collapsible-content {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}
</style>
