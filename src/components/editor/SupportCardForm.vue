<script setup lang="ts">
import { computed, ref } from 'vue'
import SupportCardPicker from './SupportCardPicker.vue'
import { buildSupportCardTag, isSupportCardSelected, supportCardDataFromId, type SupportCardData } from './editorShared'
import { resolveSupportCard } from '@/utils/supportCardIndex'
import type { SupportCardEntry } from '@/types/supportCardEntryType'

// サポートカード1枚。カードは一覧からクリックで選ぶ
const card = defineModel<SupportCardData>({ required: true })

const resolved = computed(() => (isSupportCardSelected(card.value) ? resolveSupportCard(card.value) : undefined))
// 未選択なら最初から一覧を開いておく
const showPicker = ref(!isSupportCardSelected(card.value))

const onSelect = (entry: SupportCardEntry) => {
  card.value = supportCardDataFromId(entry.id, entry.name.en, card.value)
  showPicker.value = false
}

const builtSnippet = computed(() => buildSupportCardTag(card.value))

defineExpose({ builtSnippet })
</script>

<template>
  <div class="support-card-form">
    <div v-if="isSupportCardSelected(card)" class="selected">
      <img v-if="resolved?.image" :src="resolved.image" :alt="resolved.name" class="thumb" />
      <div class="info">
        <div class="name">{{ resolved?.name ?? card.name }}</div>
        <div class="title">{{ resolved?.title ?? '(DBに見つからないカード)' }}</div>
      </div>
      <button type="button" class="change-btn" @click="showPicker = !showPicker">
        {{ showPicker ? '一覧を閉じる' : 'カードを変更' }}
      </button>
    </div>
    <div class="fields">
      <label>幅(px) <input v-model.number="card.width" type="number" placeholder="100" class="width-input" /></label>
      <label class="desc">説明(任意) <input v-model="card.description" type="text" /></label>
    </div>
    <SupportCardPicker v-if="showPicker" :selected-ids="resolved ? [resolved.id] : []" @select="onSelect" />
  </div>
</template>

<style scoped>
.support-card-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.thumb {
  width: 48px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 4px;
}

.info {
  min-width: 0;
}

.name {
  font-weight: 600;
}

.title {
  font-size: 0.75rem;
  opacity: 0.75;
}

.change-btn {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
}

.fields {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
}

.fields label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.fields .desc {
  flex: 1 1 220px;
}

.fields input {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.85rem;
}

.width-input {
  width: 6rem;
}

.desc input {
  flex: 1;
}
</style>
