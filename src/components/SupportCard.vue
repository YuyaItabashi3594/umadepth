<script setup lang="ts">
import type { SupportCardProps } from '@/types/supportCardType';

const props = withDefaults(
  defineProps<SupportCardProps & {
    width?: number;
  }>(),
  {
    rarity: "SSR",
    width: 300
  }
);
</script>
<template>
  <div>
  </div>
</template>
