<script setup lang="ts">
import { ref, computed } from 'vue'
import SupportCardPicker from './SupportCardPicker.vue'
import { buildCardRowSnippet, supportCardDataFromId, type SupportCardData } from './editorShared'
import { resolveSupportCard } from '@/utils/supportCardIndex'
import type { SupportCardEntry } from '@/types/supportCardEntryType'
import type { CardRowData } from './markdown/componentBlocks'

// カード並び。下の一覧をクリックすると末尾に追加される。initialは本文中の既存ブロックを編集するときに渡す
const props = defineProps<{ initial?: CardRowData }>()

const columns = ref<number | null>(props.initial?.columns ?? null)
const cards = ref<SupportCardData[]>(props.initial?.cards.map((c) => ({ ...c })) ?? [])

const resolvedCards = computed(() => cards.value.map((c) => resolveSupportCard(c)))
const selectedIds = computed(() => resolvedCards.value.flatMap((c) => (c ? [c.id] : [])))

const addCard = (entry: SupportCardEntry) => {
  cards.value.push(supportCardDataFromId(entry.id, entry.name.en))
}

const removeCard = (index: number) => {
  cards.value.splice(index, 1)
}

const moveCard = (index: number, delta: number) => {
  const target = index + delta
  if (target < 0 || target >= cards.value.length) return
  const [card] = cards.value.splice(index, 1)
  if (card) cards.value.splice(target, 0, card)
}

const builtSnippet = computed(() => buildCardRowSnippet(columns.value, cards.value))

defineExpose({ builtSnippet })
</script>

<template>
  <div class="card-row-form">
    <label class="columns-label">
      列数
      <input v-model.number="columns" type="number" min="1" placeholder="自動" class="columns-input" />
    </label>

    <ol v-if="cards.length" class="card-list">
      <li v-for="(card, index) in cards" :key="index" class="card-entry">
        <img
          v-if="resolvedCards[index]?.image"
          :src="resolvedCards[index]?.image ?? ''"
          :alt="card.name"
          class="thumb"
        />
        <div class="info">
          <div class="name">{{ resolvedCards[index]?.name ?? card.name }}</div>
          <div class="title">{{ resolvedCards[index]?.title ?? '(DBに見つからないカード)' }}</div>
        </div>
        <input v-model.number="card.width" type="number" placeholder="幅(px)" class="width-input" aria-label="幅(px)" />
        <input v-model="card.description" type="text" placeholder="説明(任意)" class="desc-input" aria-label="説明" />
        <span class="entry-actions">
          <button type="button" title="前へ" :disabled="index === 0" @click="moveCard(index, -1)">↑</button>
          <button type="button" title="後ろへ" :disabled="index === cards.length - 1" @click="moveCard(index, 1)">
            ↓
          </button>
          <button type="button" title="削除" @click="removeCard(index)">✕</button>
        </span>
      </li>
    </ol>
    <p v-else class="hint">下の一覧からカードをクリックして追加してください</p>

    <SupportCardPicker :selected-ids="selectedIds" @select="addCard" />
  </div>
</template>

<style scoped>
.card-row-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.columns-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.columns-input,
.width-input,
.desc-input {
  padding: 0.2rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: 0.8rem;
}

.columns-input {
  width: 6rem;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.thumb {
  width: 36px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 3px;
}

.info {
  flex: 1 1 160px;
  min-width: 0;
}

.name {
  font-size: 0.85rem;
  font-weight: 600;
}

.title {
  overflow: hidden;
  font-size: 0.7rem;
  opacity: 0.75;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.width-input {
  width: 5.5rem;
}

.desc-input {
  flex: 1 1 140px;
}

.entry-actions {
  display: flex;
  gap: 0.2rem;
}

.entry-actions button {
  width: 1.8rem;
  padding: 0.1rem 0;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
}

.entry-actions button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.hint {
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
