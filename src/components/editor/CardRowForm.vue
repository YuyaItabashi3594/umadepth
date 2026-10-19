<script setup lang="ts">
import { ref, computed } from 'vue'
import SupportCardForm from './SupportCardForm.vue'
import { emptySupportCardData, buildCardRowSnippet, type SupportCardData } from './editorShared'

const columns = ref<number | null>(null)
const cards = ref<SupportCardData[]>([emptySupportCardData()])

const addCard = () => {
  cards.value.push(emptySupportCardData())
}

const removeCard = (index: number) => {
  cards.value.splice(index, 1)
}

const builtSnippet = computed(() => buildCardRowSnippet(columns.value, cards.value))

defineExpose({ builtSnippet })
</script>

<template>
  <div class="card-row-form">
    <label class="columns-label">
      columns
      <input v-model.number="columns" type="number" min="1" placeholder="未指定" class="columns-input" />
    </label>
    <div v-for="(card, index) in cards" :key="index" class="card-row-entry">
      <SupportCardForm v-model="cards[index]!" />
      <button type="button" class="remove-btn" :disabled="cards.length === 1" @click="removeCard(index)">
        削除
      </button>
    </div>
    <button type="button" class="add-btn" @click="addCard">+ SupportCard追加</button>
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

.columns-input {
  width: 6rem;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.25rem 0.5rem;
}

.card-row-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.remove-btn,
.add-btn {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  cursor: pointer;
  align-self: flex-start;
}

.remove-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
