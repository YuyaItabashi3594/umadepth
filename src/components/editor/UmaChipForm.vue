<script setup lang="ts">
import { computed, ref } from 'vue'
import OutfitPicker from './OutfitPicker.vue'
import { buildUmaChipTag } from './editorShared'
import { outfitAliasOf } from '@/utils/outfitIndex'
import type { Outfit } from '@/types/outfitType'

// 文中に<UmaChip>(育成ウマ娘のチップ)を入れるフォーム。一覧から選び、表示名は変えられる
const selected = ref<Outfit | null>(null)
const displayName = ref('')

const pick = (outfit: Outfit) => {
  selected.value = outfit
  displayName.value = outfitAliasOf(outfit.id) ?? outfit.name.en
}

const builtSnippet = computed(() => (selected.value ? buildUmaChipTag(selected.value.id, displayName.value.trim() || selected.value.name.en) : ''))

defineExpose({ builtSnippet })
</script>

<template>
  <div class="uma-chip-form">
    <div v-if="selected" class="selected">
      <img v-if="selected.image" :src="selected.image" alt="" width="48" height="48" />
      <div class="selected-info">
        <div class="selected-title">{{ selected.name.en }} {{ selected.title.en }}</div>
        <label>
          表示名
          <input v-model="displayName" type="text" />
        </label>
      </div>
    </div>
    <p v-else class="hint">一覧から育成ウマ娘を選んでください。文中(カーソル位置)にチップとして入り、記事ではクリックで詳細が開きます</p>
    <OutfitPicker :selected-image="selected?.image ?? undefined" @select="pick" />
  </div>
</template>

<style scoped>
.uma-chip-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.selected img {
  border-radius: 6px;
}

.selected-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.selected-title {
  font-weight: 600;
}

.selected-info input {
  margin-left: 0.4rem;
  padding: 0.2rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
}

.hint {
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
