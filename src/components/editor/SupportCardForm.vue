<script setup lang="ts">
import { computed } from 'vue'
import {
  CARD_TYPE_OPTIONS,
  getRarityOptions,
  getNameOptions,
  buildSupportCardTag,
  type SupportCardData,
} from './editorShared'

const card = defineModel<SupportCardData>({ required: true })

const rarityOptions = computed(() => getRarityOptions(card.value.type))
const nameOptions = computed(() => getNameOptions(card.value.type, card.value.rarity))

const onTypeChange = () => {
  card.value.rarity = ''
  card.value.name = ''
}

const onRarityChange = () => {
  card.value.name = ''
}

const builtSnippet = computed(() => buildSupportCardTag(card.value))

defineExpose({ builtSnippet })
</script>

<template>
  <div class="support-card-form">
    <select v-model="card.type" @change="onTypeChange">
      <option value="" disabled>type</option>
      <option v-for="t in CARD_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
    </select>
    <select v-model="card.rarity" :disabled="!card.type" @change="onRarityChange">
      <option value="" disabled>rarity</option>
      <option v-for="r in rarityOptions" :key="r" :value="r">{{ r }}</option>
    </select>
    <select v-model="card.name" :disabled="!card.rarity">
      <option value="" disabled>name</option>
      <option v-for="n in nameOptions" :key="n" :value="n">{{ n }}</option>
    </select>
    <input v-model.number="card.width" type="number" placeholder="width(px)" class="width-input" />
    <input v-model="card.description" type="text" placeholder="description(任意)" class="desc-input" />
  </div>
</template>

<style scoped>
.support-card-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

select,
input {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
}

.width-input {
  width: 6rem;
}

.desc-input {
  flex: 1 1 160px;
}
</style>
