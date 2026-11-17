<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SkillChip from '@/components/SkillChip.vue'
import {
  closeSupportCardDetail,
  SUPPORT_CARD_PANEL_ID,
  SUPPORT_CARD_TRIGGER_ATTR,
  supportCardDetailId,
  supportCardDetailStore as store,
} from '@/composables/useSupportCardDetail'
import { resolveSupportCard } from '@/utils/supportCardIndex'
import type { HintStatType } from '@/types/supportCardDetailType'

// App.vueに1つだけ置く。記事中の<SupportCard>クリックで開き、パネル外クリック・Esc・ページ移動で閉じる。
// 詳細データは初めて開いたときに読み込む(useSupportCardDetail.ts)
const card = computed(() => (supportCardDetailId.value === null ? undefined : resolveSupportCard({ id: supportCardDetailId.value })))
const detail = computed(() =>
  supportCardDetailId.value === null ? undefined : store.value?.byId.get(supportCardDetailId.value),
)

const HINT_STAT_LABELS: Record<HintStatType, string> = { 1: 'Speed', 2: 'Stamina', 3: 'Power', 4: 'Guts', 5: 'Wit', 30: 'Skill Pts' }

const effectRows = computed(() =>
  (detail.value?.effects ?? []).map(([id, value]) => {
    const effect = store.value?.effects.get(id)
    return { id, name: effect?.name ?? `Effect ${id}`, value: effect?.symbol === 'percent' ? `${value}%` : `${value}` }
  }),
)

const gametoraUrl = computed(() =>
  detail.value ? `https://gametora.com/umamusume/supports/${detail.value.gametora}` : undefined,
)

// --- 閉じる操作 ---
const panelRef = ref<HTMLElement | null>(null)

// カードのクリックはカード側で開閉/切り替えするので、ここではそれ以外(パネル外)だけ見る。
// パネル内のスキルのツールチップはbody直下に出るので、それも内側扱いにする
function onDocumentPointerDown(e: PointerEvent) {
  const target = e.target as Element | null
  if (!target || panelRef.value?.contains(target)) return
  if (target.closest(`[${SUPPORT_CARD_TRIGGER_ATTR}], .skill-tooltip`)) return
  closeSupportCardDetail()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeSupportCardDetail({ restoreFocus: true })
}

watch(
  () => supportCardDetailId.value !== null,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('pointerdown', onDocumentPointerDown, true)
      document.addEventListener('keydown', onKeyDown)
    } else {
      removeListeners()
    }
  },
)

function removeListeners() {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onKeyDown)
}
onBeforeUnmount(removeListeners)

// 別カードに切り替えたら先頭から読めるようにする
watch(supportCardDetailId, async () => {
  await nextTick()
  panelRef.value?.scrollTo({ top: 0 })
})

const route = useRoute()
watch(() => route.fullPath, () => closeSupportCardDetail())
</script>

<template>
  <Teleport to="body">
    <aside
      v-if="supportCardDetailId !== null"
      :id="SUPPORT_CARD_PANEL_ID"
      ref="panelRef"
      class="detail-panel"
      role="dialog"
      :aria-label="card ? `${card.name} ${card.title ?? ''} details` : 'Support card details'"
    >
      <button type="button" class="close-btn" aria-label="Close" @click="closeSupportCardDetail({ restoreFocus: true })">
        ×
      </button>

      <header class="head">
        <div v-if="card?.image" class="thumb" :class="`rarity-${card.rarity}`">
          <img :src="card.image" alt="" width="300" height="400" />
        </div>
        <div class="head-text">
          <div class="name">{{ card?.name ?? `#${supportCardDetailId}` }}</div>
          <div v-if="card?.title" class="title">{{ card.title }}</div>
          <div class="badges">
            <span v-if="card" class="badge" :class="`badge-${card.rarity}`">{{ card.rarity.toUpperCase() }}</span>
            <span v-if="card?.type" class="badge badge-type">
              <img :src="`/images/support-cards/types/${card.type}.png`" alt="" width="14" height="14" />
              {{ card.type === 'wit' ? 'Wit' : card.type.charAt(0).toUpperCase() + card.type.slice(1) }}
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
          <div class="unique">
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
          <p v-if="detail.hintStats.length > 0" class="hint-stats">
            Stat hints:
            <span v-for="[type, value] in detail.hintStats" :key="type" class="hint-stat">
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

        <footer class="foot">
          Data: <a :href="gametoraUrl" target="_blank" rel="noopener">GameTora</a>
        </footer>
      </template>
    </aside>
  </Teleport>
</template>

<style scoped>
/* ヘッダー(fixed, z-index 100)の下、右上に固定。スキルのツールチップ(200)はこれより上に出る */
.detail-panel {
  position: fixed;
  top: calc(var(--header-height) + 12px);
  right: 16px;
  z-index: 150;
  width: min(380px, calc(100vw - 24px));
  max-height: calc(100dvh - var(--header-height) - 24px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.9rem 1rem 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 0.75rem;
  background: var(--color-background);
  color: var(--color-text);
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.22);
  font-size: 0.9rem;
  line-height: 1.45;
}

@media (max-width: 600px) {
  .detail-panel {
    right: 12px;
    left: 12px;
    width: auto;
  }
}

.close-btn {
  position: absolute;
  top: 0.4rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover,
.close-btn:focus-visible {
  background: var(--color-background-mute);
}

.head {
  display: flex;
  gap: 0.75rem;
  padding-right: 1.75rem;
}

.thumb {
  flex: none;
  width: 64px;
  padding: 3px;
  border-radius: 6px;
}

.thumb img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 4px;
}

.thumb.rarity-ssr {
  background: linear-gradient(160deg, #ff8ccf 0%, #ffe27a 30%, #8ff0c0 55%, #74c8ff 75%, #c49bff 100%);
}

.thumb.rarity-sr {
  background: linear-gradient(160deg, #f8dc8a 0%, #d9a32a 50%, #f2c75a 100%);
}

.thumb.rarity-r {
  background: linear-gradient(160deg, #d9dde3 0%, #a9afb8 100%);
}

.head-text {
  min-width: 0;
}

.name {
  font-weight: 700;
  font-size: 1.05rem;
}

.title {
  font-size: 0.85rem;
  opacity: 0.8;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.35rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.75rem;
}

.badge-ssr,
.badge-sr {
  font-weight: 700;
}

.badge-jp {
  border-color: #e05252;
  color: #e05252;
}

h3 {
  margin: 0.85rem 0 0.35rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.sub {
  font-weight: 400;
  opacity: 0.7;
}

.effects {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.2rem 0.75rem;
  margin: 0;
}

.effect {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.1rem 0;
  border-bottom: 1px dashed var(--color-border);
  font-size: 0.8rem;
}

.effect dd {
  margin: 0;
  font-weight: 700;
  white-space: nowrap;
}

.unique p {
  margin: 0 0 0.2rem;
  font-size: 0.85rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.hint-stats {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  opacity: 0.85;
}

.hint-stat + .hint-stat::before {
  content: ', ';
}

.loading {
  margin: 0.75rem 0 0;
  opacity: 0.7;
}

.foot {
  margin-top: 0.85rem;
  font-size: 0.7rem;
  text-align: right;
  opacity: 0.7;
}

.foot a,
.unique a {
  color: var(--color-accent);
}
</style>
