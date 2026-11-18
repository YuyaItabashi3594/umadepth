<script setup lang="ts">
import { computed } from 'vue'
import SkillChip from '@/components/SkillChip.vue'
import { supportCardDetailStore as store } from '@/composables/useDetailPanel'
import { resolveSupportCard } from '@/utils/supportCardIndex'
import type { HintStatType } from '@/types/supportCardDetailType'

// DetailPanelの中身(サポートカード)。スタイルはDetailPanel側の共通クラスを使う
const props = defineProps<{ id: number }>()

const card = computed(() => resolveSupportCard({ id: props.id }))
const detail = computed(() => store.value?.byId.get(props.id))

const HINT_STAT_LABELS: Record<HintStatType, string> = { 1: 'Speed', 2: 'Stamina', 3: 'Power', 4: 'Guts', 5: 'Wit', 30: 'Skill Pts' }

const effectRows = computed(() =>
  (detail.value?.effects ?? []).map(([id, value]) => {
    const effect = store.value?.effects.get(id)
    return { id, name: effect?.name ?? `Effect ${id}`, value: effect?.symbol === 'percent' ? `${value}%` : `${value}` }
  }),
)

const typeLabel = computed(() => {
  const type = card.value?.type
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : null
})

const gametoraUrl = computed(() =>
  detail.value ? `https://gametora.com/umamusume/supports/${detail.value.gametora}` : undefined,
)
</script>

<template>
  <header class="head">
    <div v-if="card?.image" class="thumb card-thumb" :class="`rarity-${card.rarity}`">
      <img :src="card.image" alt="" width="300" height="400" />
    </div>
    <div class="head-text">
      <div class="name">{{ card?.name ?? `#${props.id}` }}</div>
      <div v-if="card?.title" class="title">{{ card.title }}</div>
      <div class="badges">
        <span v-if="card" class="badge badge-strong">{{ card.rarity.toUpperCase() }}</span>
        <span v-if="card?.type" class="badge">
          <img :src="`/images/support-cards/types/${card.type}.png`" alt="" width="14" height="14" />
          {{ typeLabel }}
        </span>
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
    <section v-if="effectRows.length > 0">
      <h3>Effects <span class="sub">(Lv{{ detail.maxLevel }} / MLB)</span></h3>
      <dl class="effects">
        <div v-for="row in effectRows" :key="row.id" class="effect">
          <dt>{{ row.name }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="detail.unique">
      <h3>Unique Effect <span class="sub">(Lv{{ detail.unique.level }}+)</span></h3>
      <!-- サイト全体のli装飾(大きい文字・点)が付かないよう段落で並べる -->
      <div class="lines">
        <p v-for="(line, i) in detail.unique.lines" :key="i">
          <template v-if="line">{{ line }}</template>
          <template v-else>Special effect — see <a :href="gametoraUrl" target="_blank" rel="noopener">GameTora</a></template>
        </p>
      </div>
    </section>

    <section v-if="detail.hintSkills.length > 0 || detail.hintStats.length > 0">
      <h3>Hint Skills</h3>
      <div class="chips">
        <SkillChip v-for="id in detail.hintSkills" :key="id" :id="id" />
      </div>
      <p v-if="detail.hintStats.length > 0" class="note">
        Stat hints:
        <span v-for="[type, value] in detail.hintStats" :key="type" class="comma-item">
          {{ HINT_STAT_LABELS[type] }} +{{ value }}
        </span>
      </p>
    </section>

    <section v-if="detail.eventSkills.length > 0">
      <h3>Event Skills</h3>
      <div class="chips">
        <SkillChip v-for="id in detail.eventSkills" :key="id" :id="id" />
      </div>
    </section>

    <footer class="foot">Data: <a :href="gametoraUrl" target="_blank" rel="noopener">GameTora</a></footer>
  </template>
</template>
