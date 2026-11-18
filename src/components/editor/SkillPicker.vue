<script setup lang="ts">
import { computed, ref } from 'vue'
import SkillChip from '@/components/SkillChip.vue'
import { useSkillData } from '@/composables/useSkillData'
import type { SkillEntry } from '@/types/skillType'

// DB(src/data/skills.json)のスキルを一覧表示し、クリックで選ばせる。エディタ専用。
// 各行は記事と同じ<SkillChip>なので、ホバー(キーボードはフォーカス)で詳細を確認してから選べる
const props = defineProps<{ selectedId?: number }>()
const emit = defineEmits<{ select: [skill: SkillEntry] }>()

const store = useSkillData()

type RarityFilter = 'all' | 'white' | 'gold' | 'unique' | 'evolved'
const RARITIES: { value: RarityFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'white', label: '白' },
  { value: 'gold', label: '金' },
  { value: 'unique', label: '固有' },
  { value: 'evolved', label: '進化' },
]
// 継承固有はデータ上rarity 1(白)だが、探すときは固有の仲間として扱う
const rarityOf = (s: SkillEntry): Exclude<RarityFilter, 'all'> => {
  if (s.inherited) return 'unique'
  if (s.rarity === 1) return 'white'
  if (s.rarity === 2) return 'gold'
  return s.rarity === 6 ? 'evolved' : 'unique'
}
// 記事でよく使う順(金→白→固有→進化)、同じ区分内は名前順
const RARITY_ORDER = { gold: 0, white: 1, unique: 2, evolved: 3 }

const rarityFilter = ref<RarityFilter>('all')
const globalOnly = ref(true)
const includeInherited = ref(false)
const query = ref('')
// 全2000件超を一度に描画すると重いので、絞り込むまでは先頭だけ出す
const DISPLAY_LIMIT = 150

// 紫(マイナス)スキルはアイコンIDの末尾が4(10014等)。記事で紹介することは無いので一覧から外す
const isNegative = (s: SkillEntry) => s.icon % 10 === 4

const allSkills = computed(() =>
  [...(store.value?.byId.values() ?? [])].filter((s) => !isNegative(s)).sort(
    (a, b) => RARITY_ORDER[rarityOf(a)] - RARITY_ORDER[rarityOf(b)] || a.name.localeCompare(b.name),
  ),
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return allSkills.value.filter(
    (s) =>
      (rarityFilter.value === 'all' || rarityOf(s) === rarityFilter.value) &&
      (!globalOnly.value || s.global) &&
      (includeInherited.value || !s.inherited) &&
      (!q || s.name.toLowerCase().includes(q) || s.nameJp.toLowerCase().includes(q)),
  )
})
const shown = computed(() => filtered.value.slice(0, DISPLAY_LIMIT))
</script>

<template>
  <div class="picker">
    <div class="filters">
      <div class="rarity-filter">
        <button
          v-for="r in RARITIES"
          :key="r.value"
          type="button"
          :class="[`r-${r.value}`, { active: rarityFilter === r.value }]"
          @click="rarityFilter = r.value"
        >
          {{ r.label }}
        </button>
      </div>
      <div class="sub-filters">
        <input v-model="query" type="search" placeholder="スキル名で検索(英/日)" aria-label="検索" />
        <label><input v-model="globalOnly" type="checkbox" /> グローバル版実装済みのみ</label>
        <label><input v-model="includeInherited" type="checkbox" /> 継承固有を含む</label>
        <span class="count">{{ filtered.length }}件</span>
      </div>
    </div>

    <p v-if="!store" class="empty">読み込み中…</p>
    <!-- 行のクリックで選択。チップ自体はホバー/フォーカスで詳細、Enterでも選択(クリックが行へ伝わる) -->
    <div v-else class="list">
      <div
        v-for="s in shown"
        :key="s.id"
        class="item"
        :class="{ selected: s.id === props.selectedId }"
        @click="emit('select', s)"
      >
        <SkillChip :id="s.id" />
        <span v-if="s.nameJp !== s.name" class="jp" lang="ja">{{ s.nameJp }}</span>
        <span v-if="s.cost" class="cost">SP {{ s.cost }}</span>
      </div>
      <p v-if="filtered.length > DISPLAY_LIMIT" class="empty">
        先頭{{ DISPLAY_LIMIT }}件を表示中。検索や区分で絞り込んでください
      </p>
      <p v-if="filtered.length === 0" class="empty">該当するスキルがありません</p>
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

.filters {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.rarity-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.rarity-filter button {
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
}

.rarity-filter button.active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.sub-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
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

.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.25rem 0.5rem;
  max-height: 340px;
  overflow-y: auto;
  padding: 2px;
}

.item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.25rem 0.35rem;
  border: 2px solid transparent;
  border-radius: 6px;
  background: var(--color-background);
  cursor: pointer;
}

.item:hover {
  border-color: var(--color-border-hover);
}

.item.selected {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.jp {
  font-size: 0.7rem;
  opacity: 0.7;
}

.cost {
  margin-left: auto;
  font-size: 0.7rem;
  opacity: 0.7;
  white-space: nowrap;
}

.empty {
  grid-column: 1 / -1;
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
