<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SupportCardProps } from '@/types/supportCardType';
import { aliasKeyOf, resolveSupportCard, type SupportCardRef } from '@/utils/supportCardIndex';

// rarityの既定値は旧形式(type/rarity/name)で省略されたとき用。:id指定では使わない
const props = withDefaults(
  defineProps<SupportCardProps>(),
  {
    rarity: "ssr",
    width: 100
  }
);

const FALLBACK_IMAGE = '/images/Agemasen.jpg';

// :id ならそのまま、旧形式は data/seed/support_card_aliases.json の通称経由でカードを引く。
// propsはunion型で id を直接参照できないので、参照用に広げた型で受ける
const cardRef = props as SupportCardRef;
const card = computed(() =>
  resolveSupportCard(cardRef.id !== undefined ? { id: cardRef.id } : { type: cardRef.type, rarity: cardRef.rarity, name: cardRef.name }),
);
if (import.meta.env.DEV && !card.value) {
  const what = cardRef.id !== undefined ? `id ${cardRef.id}` : aliasKeyOf(cardRef);
  console.warn(
    `[SupportCard] 未登録のカード: ${what} (旧形式なら data/seed/support_card_aliases.json に追加して npm run data:sync -- supports --export-only)`,
  );
}

const imageFailed = ref(false);
const imageSrc = computed(() => (!imageFailed.value && card.value?.image) || FALLBACK_IMAGE);
const iconSrc = computed(() => (card.value?.type ? `/images/support-cards/types/${card.value.type}.png` : null));
const altText = computed(() => [props.name ?? card.value?.name, card.value?.title].filter(Boolean).join(' '));
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
