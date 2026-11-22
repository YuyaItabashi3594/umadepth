<script setup lang="ts">
import { computed } from 'vue'
import SkillChip from '@/components/SkillChip.vue'
import { outfitDetailStore as store } from '@/composables/useDetailPanel'
import { resolveOutfit } from '@/utils/outfitIndex'

// DetailPanelの中身(育成ウマ娘)。スタイルはDetailPanel側の共通クラスを使う
const props = defineProps<{ id: number }>()

const outfit = computed(() => resolveOutfit({ id: props.id }))
const detail = computed(() => store.value?.get(props.id))

const STYLE_LABELS = { front: 'Front Runner', pace: 'Pace Chaser', late: 'Late Surger', end: 'End Closer' } as const
const STAT_LABELS = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'] as const
// aptitude配列の並び: turf, dirt, short, mile, medium, long, front, pace, late, end
const APTITUDE_GROUPS = [
  { label: 'Track', items: [['Turf', 0], ['Dirt', 1]] },
  { label: 'Distance', items: [['Sprint', 2], ['Mile', 3], ['Medium', 4], ['Long', 5]] },
  { label: 'Style', items: [['Front', 6], ['Pace', 7], ['Late', 8], ['End', 9]] },
] as const

const growth = computed(() =>
  (detail.value?.talent ?? [])
    .map((value, i) => ({ label: STAT_LABELS[i], value }))
    .filter((g) => g.value > 0),
)

const skillGroups = computed(() => {
  const s = detail.value?.skills
  if (!s) return []
  return [
    { label: 'Unique Skill', ids: s.unique },
    { label: 'Innate Skills', ids: s.innate },
    { label: 'Awakening Skills', ids: s.awakening },
    { label: 'Event Skills', ids: s.event },
  ].filter((g) => g.ids.length > 0)
})

const gametoraUrl = computed(() =>
  detail.value ? `https://gametora.com/umamusume/characters/${detail.value.gametora}` : undefined,
)
</script>

<template>
  <header class="head">
    <div v-if="outfit?.image" class="thumb outfit-thumb">
      <img :src="outfit.image" alt="" width="256" height="256" />
    </div>
    <div class="head-text">
      <div class="name">{{ outfit?.name ?? `#${props.id}` }}</div>
      <div v-if="outfit?.title" class="title">{{ outfit.title }}</div>
      <div class="badges">
        <span v-if="detail?.rarity" class="badge badge-strong">{{ '★'.repeat(detail.rarity) }}</span>
        <span v-if="detail?.runningStyle" class="badge">{{ STYLE_LABELS[detail.runningStyle] }}</span>
        <template v-if="detail">
          <span v-if="detail.releaseEn" class="badge">Global {{ detail.releaseEn }}</span>
          <span v-else class="badge badge-jp">JP only</span>
        </template>
      </div>
    </div>
  </header>

  <p v-if="!store" class="loading">Loading…</p>
  <p v-else-if="!detail" class="loading">No details available.</p>
  <template v-else>
    <section v-if="detail.aptitude">
      <h3>Aptitude</h3>
      <div class="aptitude">
        <div v-for="group in APTITUDE_GROUPS" :key="group.label" class="apt-row">
          <span class="apt-label">{{ group.label }}</span>
          <span v-for="[label, index] in group.items" :key="label" class="apt-item">
            {{ label }}
            <b class="grade" :class="`grade-${detail.aptitude[index]}`">{{ detail.aptitude[index] }}</b>
          </span>
        </div>
      </div>
    </section>

    <section v-if="growth.length > 0 || detail.fiveStarStats">
      <h3>Stats</h3>
      <p v-if="growth.length > 0" class="note">
        Growth:
        <span v-for="g in growth" :key="g.label" class="comma-item">{{ g.label }} +{{ g.value }}%</span>
      </p>
      <table v-if="detail.fiveStarStats" class="stats">
        <thead>
          <tr>
            <th></th>
            <th v-for="label in STAT_LABELS" :key="label">{{ label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="detail.baseStats">
            <th>★{{ detail.rarity }}</th>
            <td v-for="(value, i) in detail.baseStats" :key="i">{{ value }}</td>
          </tr>
          <tr>
            <th>★5</th>
            <td v-for="(value, i) in detail.fiveStarStats" :key="i">{{ value }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-for="group in skillGroups" :key="group.label">
      <h3>{{ group.label }}</h3>
      <div class="chips">
        <SkillChip v-for="id in group.ids" :key="id" :id="id" />
      </div>
    </section>

    <footer class="foot">Data: <a :href="gametoraUrl" target="_blank" rel="noopener">GameTora</a></footer>
  </template>
</template>
