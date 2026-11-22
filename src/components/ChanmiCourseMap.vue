<script setup lang="ts">
import { computed } from 'vue'
import ImageModal from '@/components/ImageModal.vue'
import meetings from '@/data/championsMeetings.json'
import { courseLinesOf, parseChanmiSlug, type ChampionsMeeting } from '@/utils/championsMeeting'

// チャンミ記事の冒頭に出すコース図。記事slug(leo2等)から開催を引き、data:syncで取ったGameToraのコース図を表示する
const props = defineProps<{ slug: string }>()

const meeting = computed(() => {
  const key = parseChanmiSlug(props.slug)
  if (!key) return undefined
  return (meetings as ChampionsMeeting[]).find((m) => m.series === key.series && m.round === key.round)
})
const course = computed(() => meeting.value?.course ?? null)
const caption = computed(() => (meeting.value?.conditions ? courseLinesOf(meeting.value.conditions).join(' / ') : ''))
</script>

<template>
  <figure v-if="course" class="course-map">
    <!-- コース図は白地(data:syncで透明背景を白にしている)。ダークモードでも枠ごと白で見せる -->
    <div class="course-image">
      <ImageModal :src="course.image" :alt="`Course map: ${caption}`" />
    </div>
    <figcaption>
      <span>{{ caption }}</span>
      <a :href="course.source" target="_blank" rel="noopener">Course map: GameTora</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.course-map {
  max-width: 480px;
  margin: 0 auto 1.5rem;
}

.course-image {
  padding: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: #fff;
}

.course-image :deep(img) {
  display: block;
  width: 100%;
  height: auto;
}

figcaption {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  margin-top: 0.35rem;
  font-size: 0.85rem;
}

figcaption a {
  opacity: 0.8;
}
</style>
