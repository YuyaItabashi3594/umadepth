<script setup lang="ts">
import SupportCard from '@/components/SupportCard.vue'
import CardRow from '@/components/CardRow.vue'
import type { ImageDescriptionImage } from './componentBlocks'

defineProps<{ image: ImageDescriptionImage }>()
</script>

<template>
  <!-- SupportCardのpropsは名前が厳密なunion型なので、記事の値をそのまま渡すため component :is で受ける -->
  <CardRow v-if="image.kind === 'cardrow'" :columns="image.data.columns ?? undefined">
    <component :is="SupportCard" v-for="(card, i) in image.data.cards" :key="i" v-bind="card" />
  </CardRow>
  <component :is="SupportCard" v-else-if="image.kind === 'supportcard'" v-bind="image.data" />
  <!-- ImageModalのclass(w-[Npx])は記事保存前だとTailwindに生成されていないので、幅はstyleで当てる -->
  <img
    v-else
    :src="image.data.src"
    :alt="image.data.alt"
    :style="{ width: `${image.data.width}px`, maxWidth: '100%' }"
  />
</template>
