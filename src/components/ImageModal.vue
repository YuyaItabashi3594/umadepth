<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  src: string;
  alt?: string;
}>();

const isOpen = ref(false);

const openModal = () => {
  isOpen.value = true;
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  isOpen.value = false;
  document.body.style.overflow = '';
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeModal();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <div>
    <!-- サムネイル画像 -->
    <img
      :src="props.src"
      :alt="props.alt"
      class="cursor-pointer hover:opacity-80 transition-opacity"
      @click="openModal"
    />

    <!-- モーダル -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          @click="closeModal"
        >
          <!-- モーダルコンテンツ -->
          <div
            class="relative max-w-7xl max-h-[90vh]"
            @click.stop
          >
            <!-- 閉じるボタン -->
            <button
              class="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
              @click="closeModal"
              aria-label="閉じる"
            >
              ✕
            </button>

            <!-- 拡大画像 -->
            <img
              :src="props.src"
              :alt="props.alt"
              class="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>