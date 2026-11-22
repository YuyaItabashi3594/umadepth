<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import OutfitPicker from './OutfitPicker.vue'
import SupportCardPicker from './SupportCardPicker.vue'
import type { Outfit } from '@/types/outfitType'
import type { SupportCardEntry } from '@/types/supportCardEntryType'

// ガチャ一覧の見出しに出す「目玉のウマ娘 or サポカ」の画像を選ぶ。値は画像パス(frontmatterのbanner)
const banner = defineModel<string>({ required: true })
// 既存記事でbannerが未設定のときに表示している画像(public/images/gacha/{slug}.png)
const props = defineProps<{ fallbackSrc?: string }>()
// 選んだものの表示名。ガチャ名が空なら呼び出し側で自動入力に使う
const emit = defineEmits<{ picked: [label: string] }>()

const tab = ref<'outfit' | 'card'>('outfit')
const open = ref(!banner.value)
const fallbackFailed = ref(false)
// 記事を切り替えたら既存画像の読み込み失敗フラグを戻す
watch(
  () => props.fallbackSrc,
  () => (fallbackFailed.value = false),
)

const previewSrc = computed(() => banner.value || (!fallbackFailed.value && props.fallbackSrc) || '')
const supportCardId = computed(() => Number(banner.value.match(/\/support-cards\/(\d+)\.png$/)?.[1]) || undefined)

const pickOutfit = (outfit: Outfit) => {
  banner.value = outfit.image ?? ''
  emit('picked', outfit.name.en)
  open.value = false
}

const pickCard = (card: SupportCardEntry) => {
  banner.value = card.image ?? ''
  emit('picked', `${card.rarity.toUpperCase()} ${card.name.en}`)
  open.value = false
}
</script>

<template>
  <div class="banner-picker">
    <div class="current">
      <img v-if="previewSrc" :src="previewSrc" alt="" class="current-img" @error="fallbackFailed = true" />
      <div v-else class="current-img empty">未選択</div>
      <div class="current-info">
        <div class="label">目玉の画像(ガチャ一覧の見出しに表示)</div>
        <div class="path">{{ banner || (previewSrc ? `${previewSrc}(既存の画像)` : '未設定') }}</div>
      </div>
      <button type="button" class="toggle-btn" @click="open = !open">{{ open ? '一覧を閉じる' : '一覧から選ぶ' }}</button>
      <button v-if="banner" type="button" class="toggle-btn" @click="banner = ''">解除</button>
    </div>

    <template v-if="open">
      <div class="tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="tab === 'outfit'" :class="{ active: tab === 'outfit' }" @click="tab = 'outfit'">
          ウマ娘
        </button>
        <button type="button" role="tab" :aria-selected="tab === 'card'" :class="{ active: tab === 'card' }" @click="tab = 'card'">
          サポートカード
        </button>
      </div>
      <OutfitPicker v-if="tab === 'outfit'" :selected-image="banner" @select="pickOutfit" />
      <SupportCardPicker v-else :selected-ids="supportCardId ? [supportCardId] : []" @select="pickCard" />
    </template>
  </div>
</template>

<style scoped>
.banner-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.current {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.current-img {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

.current-img.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-border-hover);
  border-radius: 6px;
  font-size: 0.7rem;
  opacity: 0.7;
}

.current-info {
  flex: 1 1 200px;
  min-width: 0;
}

.label {
  font-size: 0.8rem;
  opacity: 0.8;
}

.path {
  overflow: hidden;
  font-family: monospace;
  font-size: 0.75rem;
  opacity: 0.7;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle-btn,
.tabs button {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
}

.tabs {
  display: flex;
  gap: 0.35rem;
}

.tabs button.active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent);
}
</style>
