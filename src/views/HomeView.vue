<script setup lang="ts">
import { computed } from 'vue'

interface UpdateHistory {
  date: string
  title: string
}

const updateHistories: UpdateHistory[] = [
  {
    date: '2026-02-16',
    title: 'release',
  },
  {
    date: '2026-03-19',
    title: 'Pisces Cup Guide',
  },
  {
    date: '2026-04-09',
    title: 'Aries Cup Guide',
  },
  {
    date: '2026-05-19',
    title: 'Gemini 2nd Cup Guide(Taurus was skipped due to busy days...',
  },
  {
    date: '2026-06-14',
    title: 'Cancer Guide is skipped as we have to build again after Throne release...',
  },
]

const displayedHistories = computed(() => {
  return [...updateHistories]
    .sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    .slice(0, 3)
})
</script>

<template>
  <main>
    <div>
      <h1>Welcome to Uma Depth guide!</h1>
    </div>

    <section class="info-card history-list">
      <ul>
        <li v-for="(history, index) in displayedHistories" :key="index">
          <span class="history-date">{{ history.date }}</span>
          <span class="history-title">{{ history.title }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
}

h3 {
  font-size: 1.2rem;
}

h1,
h3 {
  text-align: center;
}

.history-list {
  margin-top: 2.5rem;
}

.history-list ul {
  margin: 0;
}

.history-list li {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.5rem 0;
}

.history-list li:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.history-list li::before {
  content: '';
}

.history-date {
  flex: 0 0 auto;
  font-size: 0.85rem;
  color: var(--color-accent);
  font-variant-numeric: tabular-nums;
}

.history-title {
  color: var(--color-text);
}

@media (min-width: 1024px) {
  h1,
  h3 {
    text-align: left;
  }
}
</style>
