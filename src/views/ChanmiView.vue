<script setup lang="ts">
import championsMeetings from '@/data/championsMeetings.json'
import { chanmiTitleOf, parseChanmiSlug, seriesOf, type ChampionsMeeting } from '@/utils/championsMeeting'

const markdownModules = import.meta.glob<{ default: string }>('./chanmi/*.md')
const meetings = championsMeetings as ChampionsMeeting[]

interface ChanmiArticle {
  slug: string
  title: string
  emoji: string
  start: string | null
  jpStart: string | null
  banner: string | null
}

// slug(leo2 = Leo 2回目)から開催情報(公式バナー・開催日)を引く。npm run data:sync -- chanmi で更新。
// グローバル版で未告知の開催は日本版のバナーが入っていて、英語版が出たら同期で置き換わる
const toArticle = (slug: string): ChanmiArticle => {
  const key = parseChanmiSlug(slug)
  const meeting = key && meetings.find((m) => m.series === key.series && m.round === key.round)
  return {
    slug,
    title: key ? chanmiTitleOf(key.series, key.round) : slug,
    emoji: (key && seriesOf(key.series)?.emoji) ?? '⭐',
    start: meeting?.start ?? null,
    jpStart: meeting?.jpStart ?? null,
    banner: meeting?.banner ?? null,
  }
}

// 新しい順(直近のものが先頭)。グローバル版の開催日が未定の記事(日本版の開催順で並べる)や、
// 開催情報が見つからない記事は、これからの開催とみなして先頭に置く
const sortKey = (a: ChanmiArticle) => a.start ?? `9999-${a.jpStart ?? '9999'}`
const articles = Object.keys(markdownModules)
  .map((path) => path.match(/\.\/chanmi\/(.+)\.md$/)?.[1] ?? '')
  .filter((slug) => slug !== '')
  .map(toArticle)
  .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
</script>

<template>
  <div>
    <h1>Chanmi Guides</h1>
    <ul class="chanmi-grid">
      <li v-for="article in articles" :key="article.slug">
        <RouterLink :to="`/chanmi/${article.slug}`" class="chanmi-card">
          <img
            v-if="article.banner"
            :src="article.banner"
            :alt="`Champions Meeting: ${article.title}`"
            class="chanmi-banner"
            width="936"
            height="228"
            loading="lazy"
          />
          <span v-else class="chanmi-banner chanmi-fallback" aria-hidden="true">{{ article.emoji }}</span>
          <span class="chanmi-caption">
            <span class="chanmi-label">{{ article.title }}</span>
            <time v-if="article.start" :datetime="article.start" class="chanmi-date">{{ article.start }}</time>
            <span v-else class="chanmi-date">Coming soon</span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.chanmi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.chanmi-grid li::before {
  content: '';
}

.chanmi-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  color: var(--color-text);
  transition:
    transform 0.15s,
    border-color 0.15s,
    background-color 0.15s;
}

/* タッチ端末でhover状態が残らないようhover可能なデバイスに限定 */
@media (hover: hover) {
  .chanmi-card:hover {
    transform: translateY(-4px);
    border-color: var(--color-accent);
    background-color: var(--color-accent-soft);
  }
}

/* 公式バナー(936×228)の比率に揃え、バナーが無い記事も同じ高さにする */
.chanmi-banner {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 936 / 228;
}

.chanmi-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  background-color: var(--color-background-mute);
}

.chanmi-caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.chanmi-label {
  font-weight: 600;
}

.chanmi-date {
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
