<script setup lang="ts">
import { computed, ref } from 'vue'
import allCards from '@/data/supportCards.json'
import type { SupportCardEntry, SupportCardKind } from '@/types/supportCardEntryType'

// DB(src/data/supportCards.json)のカードを一覧表示し、クリックで選ばせる。エディタ専用なので全件読んでよい
const props = defineProps<{ selectedIds?: number[] }>()
const emit = defineEmits<{ select: [card: SupportCardEntry] }>()

// 画像があるのはSR/SSRだけ(Rは記事で使わない)
const cards = (allCards as unknown as SupportCardEntry[]).filter((c) => c.image)

const TYPES: { value: SupportCardKind; label: string }[] = [
  { value: 'speed', label: 'スピード' },
  { value: 'stamina', label: 'スタミナ' },
  { value: 'power', label: 'パワー' },
  { value: 'guts', label: '根性' },
  { value: 'wit', label: '賢さ' },
  { value: 'pals', label: '友人' },
  { value: 'group', label: 'グループ' },
]

const typeFilter = ref<SupportCardKind | null>(null)
const rarityFilter = ref<'all' | 'ssr' | 'sr'>('all')
const globalOnly = ref(true)
const query = ref('')

const selected = computed(() => new Set(props.selectedIds ?? []))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  // グローバル版の記事なので、既定はグローバル版実装済みのカードを新しい順に出す
  const releaseOf = (c: SupportCardEntry) => (globalOnly.value ? c.releaseEn : c.releaseJp) ?? ''
  return cards
    .filter(
      (c) =>
        (!typeFilter.value || c.type === typeFilter.value) &&
        (rarityFilter.value === 'all' || c.rarity === rarityFilter.value) &&
        (!globalOnly.value || c.releaseEn) &&
        (!q || [c.name.en, c.name.jp, c.title.en, c.title.jp].some((s) => s?.toLowerCase().includes(q))),
    )
    .sort((a, b) => releaseOf(b).localeCompare(releaseOf(a)) || b.id - a.id)
})

const tooltipOf = (c: SupportCardEntry) =>
  [`${c.rarity.toUpperCase()} ${c.name.en}`, c.title.en ?? c.title.jp, c.releaseEn ? `Global ${c.releaseEn}` : 'JP only']
    .filter(Boolean)
    .join('\n')
</script>

<template>
  <div class="picker">
    <div class="filters">
      <div class="type-filter">
        <button type="button" :class="{ active: typeFilter === null }" @click="typeFilter = null">すべて</button>
        <button
          v-for="t in TYPES"
          :key="t.value"
          type="button"
          :class="{ active: typeFilter === t.value }"
          :title="t.label"
          @click="typeFilter = t.value"
        >
          <img :src="`/images/support-cards/types/${t.value}.png`" alt="" />
          {{ t.label }}
        </button>
      </div>
      <div class="sub-filters">
        <select v-model="rarityFilter" aria-label="レアリティ">
          <option value="all">SSR+SR</option>
          <option value="ssr">SSRのみ</option>
          <option value="sr">SRのみ</option>
        </select>
        <input v-model="query" type="search" placeholder="名前・カード名で検索(英/日)" aria-label="検索" />
        <label><input v-model="globalOnly" type="checkbox" /> グローバル版実装済みのみ</label>
        <span class="count">{{ filtered.length }}件</span>
      </div>
    </div>

    <div class="grid">
      <button
        v-for="c in filtered"
        :key="c.id"
        type="button"
        class="card"
        :class="[`rarity-${c.rarity}`, { selected: selected.has(c.id) }]"
        :title="tooltipOf(c)"
        @click="emit('select', c)"
      >
        <img :src="c.image ?? ''" :alt="c.name.en" loading="lazy" width="72" height="96" />
        <span class="name">{{ c.name.en }}</span>
      </button>
      <p v-if="filtered.length === 0" class="empty">該当するカードがありません</p>
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

.filters,
.type-filter,
.sub-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.filters {
  flex-direction: column;
  align-items: stretch;
}

.type-filter button {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.75rem;
  cursor: pointer;
}

.type-filter button img {
  width: 16px;
  height: 16px;
}

.type-filter button.active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.sub-filters {
  font-size: 0.8rem;
}

.sub-filters select,
.sub-filters input[type='search'] {
  padding: 0.2rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.8rem;
}

.sub-filters input[type='search'] {
  flex: 1 1 180px;
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

.card {
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

.card img {
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 4px;
}

/* レアリティは下線の色で区別(記事側と同じ配色) */
.card.rarity-ssr img {
  box-shadow: 0 3px 0 #c49bff;
}

.card.rarity-sr img {
  box-shadow: 0 3px 0 #d9a32a;
}

.card:hover {
  border-color: var(--color-border-hover);
}

.card.selected {
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
