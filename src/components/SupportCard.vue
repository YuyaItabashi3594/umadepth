<script setup lang="ts">
import { ref } from 'vue';
import type { SupportCardProps } from '@/types/supportCardType';

const props = withDefaults(
  defineProps<SupportCardProps>(),
  {
    rarity: "ssr",
    width: 100
  }
);
const supportImagePath = `/images/supports/${props.type}/${props.rarity}/${props.name}.jpg`;
const fallbackImagePath = '/images/supports/Agemasen.jpg';
const currentImagePath = ref(supportImagePath);

const handleImageError = () => {
  currentImagePath.value = fallbackImagePath;
};

</script>
<template>
  <div :style="{ width: `${props.width}px` }">
    <figure class="image">
      <img :src="currentImagePath" :alt="props.name" @error="handleImageError" />
      <figcaption v-if="props.description">{{ props.description }}</figcaption>
    </figure>
  </div>
</template>
