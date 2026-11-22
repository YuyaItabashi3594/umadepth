<script setup lang="ts">
import { computed, ref } from 'vue'
import championsMeetings from '@/data/championsMeetings.json'
import {
  chanmiSlugOf,
  chanmiTitleOf,
  parseChanmiSlug,
  seriesOf,
  type ChampionsMeeting,
} from '@/utils/championsMeeting'

// 公式告知(npm run data:sync -- chanmi)から作った開催一覧から、まだ記事が無い開催を選ばせる。エディタ専用。
// グローバル版で未告知の開催は、日本版の告知(バナー/レース条件)から推定したものを出す
const props = defineProps<{ existingSlugs: string[]; selected?: ChampionsMeeting | null }>()
const emit = defineEmits<{ select: [meeting: ChampionsMeeting] }>()

// 開催期間は約6日なので、開始から1週間以内のものは開催中として「これから」に含める
const UPCOMING_GRACE_DAYS = 7
const upcomingFrom = new Date(Date.now() - UPCOMING_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const today = new Date().toISOString().slice(0, 10)

const showPast = ref(false)

const isUpcoming = (m: ChampionsMeeting) => m.start === null || m.start >= upcomingFrom
const statusOf = (m: ChampionsMeeting) => {
  if (!m.global) return 'グローバル未告知'
  if (m.start === null || m.start > today) return '開催予定'
  return isUpcoming(m) ? '開催中' : '終了'
}

const keyOf = (m: { series: string; round: number }) => `${m.series}:${m.round}`
// グローバル版の日付が無い開催は日本版の開催順で後ろに並べる
const sortKey = (m: ChampionsMeeting) => m.start ?? `9999-${m.jpStart ?? '9999'}`

const candidates = computed(() => {
  const written = new Set(
    props.existingSlugs
      .map(parseChanmiSlug)
      .filter((k) => k !== null)
      .map(keyOf),
  )
  return (championsMeetings as ChampionsMeeting[])
    .filter((m) => !written.has(keyOf(m)) && (showPast.value || isUpcoming(m)))
    .sort((a, b) => {
      // これからの開催は近い順、終了した開催はその後ろに新しい順
      const upcomingA = isUpcoming(a)
      if (upcomingA !== isUpcoming(b)) return upcomingA ? -1 : 1
      return upcomingA ? sortKey(a).localeCompare(sortKey(b)) : sortKey(b).localeCompare(sortKey(a))
    })
})
</script>

<template>
  <div class="picker">
    <div class="sub-filters">
      <span class="label">開催を選ぶ(記事がまだ無い開催のみ。選ぶとslugとコース欄を自動入力)</span>
      <label><input v-model="showPast" type="checkbox" /> 終了した開催も表示</label>
      <span class="count">{{ candidates.length }}件</span>
    </div>

    <div class="list">
      <button
        v-for="m in candidates"
        :key="keyOf(m)"
        type="button"
        class="item"
        :class="{ selected: props.selected && keyOf(props.selected) === keyOf(m) }"
        @click="emit('select', m)"
      >
        <img v-if="m.banner" :src="m.banner" alt="" class="banner" width="936" height="228" loading="lazy" />
        <span v-else class="banner fallback">{{ seriesOf(m.series)?.emoji }}</span>
        <span class="meta">
          <span class="title">{{ chanmiTitleOf(m.series, m.round) }}</span>
          <span class="slug">{{ chanmiSlugOf(m.series, m.round) }}</span>
          <span class="status" :class="{ ended: statusOf(m) === '終了', jp: !m.global }">{{ statusOf(m) }}</span>
          <span v-if="m.bannerLang === 'ja'" class="status jp">日本版バナー</span>
          <span class="date">{{ m.start ?? (m.jpStart ? `日本版 ${m.jpStart}` : '日程未定') }}</span>
        </span>
        <span v-if="m.conditions" class="conditions">
          {{ m.conditions }}<template v-if="!m.global">(日本版の条件。グローバル版で変わる場合あり)</template>
        </span>
      </button>
      <p v-if="candidates.length === 0" class="empty">
        記事が無いこれからの開催はありません。新しい告知が出たら npm run data:sync -- chanmi で更新してください
      </p>
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
  gap: 0.75rem;
  font-size: 0.8rem;
}

.label {
  opacity: 0.8;
}

.count {
  margin-left: auto;
  opacity: 0.7;
}

.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 0.5rem;
  max-height: 420px;
  overflow-y: auto;
  padding: 2px;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.item:hover {
  border-color: var(--color-border-hover);
}

.item.selected {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.banner {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 936 / 228;
  border-radius: 4px;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: var(--color-background-mute);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.title {
  font-weight: 600;
}

.slug {
  font-family: monospace;
  opacity: 0.7;
}

.status {
  padding: 0 0.4rem;
  border-radius: 999px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 0.7rem;
}

.status.jp {
  background: color-mix(in srgb, #e05252 15%, transparent);
  color: #e05252;
}

.status.ended {
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.7;
}

.date {
  margin-left: auto;
  opacity: 0.7;
}

.conditions {
  font-size: 0.7rem;
  opacity: 0.75;
}

.empty {
  grid-column: 1 / -1;
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
