<script setup lang="ts">
import { computed } from 'vue'

const markdownModules = import.meta.glob<{ default: string }>('./chanmi/*.md')

const zodiacInfo: Record<string, { label: string; emoji: string }> = {
  aries: { label: 'Aries', emoji: '🐏' },
  capricone: { label: 'Capricorn', emoji: '🐐' },
  aquarius: { label: 'Aquarius', emoji: '🏺' },
  pisces: { label: 'Pisces', emoji: '🐟' },
  gemini2: { label: 'Gemini II', emoji: '👯' },
  leo2: { label: 'Leo II', emoji: '🦁' },
}

// ファイルパスからslugの配列を取得
const articleSlugs = computed(() => {
  return Object.keys(markdownModules)
    .map((path) => {
      // './chanmi/article1.md' から 'article1' を抽出
      return path.match(/\.\/chanmi\/(.+)\.md$/)?.[1] ?? ''
    })
    .filter((slug): slug is string => slug !== '')
})

const getZodiacInfo = (slug: string) => {
  return zodiacInfo[slug] ?? { label: slug, emoji: '⭐' }
}
</script>

<template>
  <div>
    <h1>Chanmi Guides</h1>
    <ul class="chanmi-grid">
      <li v-for="slug in articleSlugs" :key="slug">
        <RouterLink :to="`/chanmi/${slug}`" class="chanmi-card">
          <span class="chanmi-emoji">{{ getZodiacInfo(slug).emoji }}</span>
          <span class="chanmi-label">{{ getZodiacInfo(slug).label }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.chanmi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.chanmi-grid li::before {
  content: '';
}

.chanmi-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  color: var(--color-text);
  transition:
    transform 0.15s,
    border-color 0.15s,
    background-color 0.15s;
}

.chanmi-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-accent);
  background-color: var(--color-accent-soft);
}

.chanmi-emoji {
  font-size: 2rem;
}

.chanmi-label {
  font-weight: 600;
}
</style>
