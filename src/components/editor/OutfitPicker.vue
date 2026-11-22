<script setup lang="ts">
import { computed, ref } from 'vue'
import allOutfits from '@/data/outfits.json'
import type { Outfit } from '@/types/outfitType'

// DB(src/data/outfits.json)の育成ウマ娘(衣装)を一覧表示し、クリックで選ばせる。エディタ専用
const props = defineProps<{ selectedImage?: string }>()
const emit = defineEmits<{ select: [outfit: Outfit] }>()

const outfits = (allOutfits as unknown as Outfit[]).filter((o) => o.image)

const globalOnly = ref(true)
const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  // ガチャ記事は新衣装の紹介が中心なので、実装日の新しい順に出す
  const releaseOf = (o: Outfit) => (globalOnly.value ? o.releaseEn : o.releaseJp) ?? ''
  return outfits
    .filter(
      (o) =>
        (!globalOnly.value || o.releaseEn) &&
        (!q || [o.name.en, o.name.jp, o.title.en, o.title.jp].some((s) => s?.toLowerCase().includes(q))),
    )
    .sort((a, b) => releaseOf(b).localeCompare(releaseOf(a)) || b.id - a.id)
})

const tooltipOf = (o: Outfit) =>
  [o.name.en, o.title.en ?? o.title.jp, o.releaseEn ? `Global ${o.releaseEn}` : 'JP only'].filter(Boolean).join('\n')
</script>

<template>
  <div class="picker">
    <div class="sub-filters">
      <input v-model="query" type="search" placeholder="名前・衣装名で検索(英/日)" aria-label="検索" />
      <label><input v-model="globalOnly" type="checkbox" /> グローバル版実装済みのみ</label>
      <span class="count">{{ filtered.length }}件</span>
    </div>

    <div class="grid">
      <button
        v-for="o in filtered"
        :key="o.id"
        type="button"
        class="item"
        :class="{ selected: o.image === props.selectedImage }"
        :title="tooltipOf(o)"
        @click="emit('select', o)"
      >
        <img :src="o.image ?? ''" :alt="o.name.en" loading="lazy" width="76" height="76" />
        <span class="name">{{ o.name.en }}</span>
      </button>
      <p v-if="filtered.length === 0" class="empty">該当するウマ娘がいません</p>
    </div>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background-soft);
}

.sub-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
}

.sub-filters input[type='search'] {
  flex: 1 1 180px;
  padding: 0.2rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.8rem;
}

.count {
  margin-left: auto;
  opacity: 0.7;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 0.4rem;
  max-height: 340px;
  overflow-y: auto;
  padding: 2px;
}

.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  min-width: 0;
  padding: 3px;
  border: 2px solid transparent;
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}

.item img {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
}

.item:hover {
  border-color: var(--color-border-hover);
}

.item.selected {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.name {
  width: 100%;
  overflow: hidden;
  font-size: 0.65rem;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  grid-column: 1 / -1;
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
