<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SupportCardProps } from '@/types/supportCardType';
import type { SupportCardAliasMap } from '@/types/supportCardEntryType';
import supportCardAliases from '@/data/supportCardAliases.json';

const props = withDefaults(
  defineProps<SupportCardProps>(),
  {
    rarity: "ssr",
    width: 100
  }
);

const FALLBACK_IMAGE = '/images/Agemasen.jpg';
const aliases = supportCardAliases as SupportCardAliasMap;

// 記事の type/rarity/name を data/seed/support_card_aliases.json 経由でカードidに解決する
const aliasKey = computed(() => `${props.type}/${props.rarity}/${props.name}`);
const card = computed(() => aliases[aliasKey.value]);
if (import.meta.env.DEV && !card.value) {
  console.warn(
    `[SupportCard] 未登録のカード: ${aliasKey.value} (data/seed/support_card_aliases.json に追加して npm run data:sync -- supports --export-only)`,
  );
}

const imageFailed = ref(false);
const imageSrc = computed(() => (!imageFailed.value && card.value?.image) || FALLBACK_IMAGE);
const iconSrc = computed(() => (card.value?.type ? `/images/support-cards/types/${card.value.type}.png` : null));
const altText = computed(() => [props.name, card.value?.title].filter(Boolean).join(' '));
</script>
<template>
  <!-- 狭い画面ではCardRowのセル幅に合わせて縮む -->
  <div :style="{ width: `${props.width}px`, maxWidth: '100%' }">
    <figure class="image">
      <!-- 新画像はカード絵のみなので、ゲーム内表示に合わせてレアリティ枠とタイプアイコンを重ねる -->
      <div v-if="card && !imageFailed" class="card-frame" :class="`rarity-${card.rarity}`">
        <img
          :src="imageSrc"
          :alt="altText"
          width="300"
          height="400"
          loading="lazy"
          class="card-art"
          @error="imageFailed = true"
        />
        <img v-if="iconSrc" :src="iconSrc" alt="" aria-hidden="true" class="type-icon" />
      </div>
      <img v-else :src="FALLBACK_IMAGE" :alt="props.name" />
      <figcaption v-if="props.description">{{ props.description }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
/* paddingの%は幅基準なので、カード幅が変わっても枠の太さの比率が保たれる */
.card-frame {
  position: relative;
  padding: 3%;
  border-radius: 6% / 4.5%;
}

.rarity-ssr {
  background: linear-gradient(160deg, #ff8ccf 0%, #ffe27a 30%, #8ff0c0 55%, #74c8ff 75%, #c49bff 100%);
}

.rarity-sr {
  background: linear-gradient(160deg, #f8dc8a 0%, #d9a32a 50%, #f2c75a 100%);
}

.rarity-r {
  background: linear-gradient(160deg, #d9dde3 0%, #a9afb8 100%);
}

.card-art {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 4% / 3%;
}

.type-icon {
  position: absolute;
  top: 2%;
  right: 2%;
  width: 18%;
  height: auto;
}
</style>
