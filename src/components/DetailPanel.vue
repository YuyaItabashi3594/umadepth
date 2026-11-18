<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SupportCardDetailBody from '@/components/detail/SupportCardDetailBody.vue'
import OutfitDetailBody from '@/components/detail/OutfitDetailBody.vue'
import { closeDetail, DETAIL_PANEL_ID, DETAIL_TRIGGER_ATTR, detailTarget } from '@/composables/useDetailPanel'
import { resolveSupportCard } from '@/utils/supportCardIndex'
import { resolveOutfit } from '@/utils/outfitIndex'

// App.vueに1つだけ置く。記事中の<SupportCard>/<UmaChip>のクリックで開き、パネル外クリック・Esc・ページ移動で閉じる。
// 詳細データは種類ごとに初めて開いたときに読み込む(useDetailPanel.ts)
const ariaLabel = computed(() => {
  const t = detailTarget.value
  if (!t) return ''
  const entry = t.kind === 'support' ? resolveSupportCard({ id: t.id }) : resolveOutfit({ id: t.id })
  return entry ? `${entry.name} ${entry.title ?? ''} details` : 'Details'
})

const panelRef = ref<HTMLElement | null>(null)

// 開く側(カード/チップ)のクリックはそちらで開閉/切り替えするので、ここではそれ以外(パネル外)だけ見る。
// パネル内のスキルのツールチップはbody直下に出るので、それも内側扱いにする
function onDocumentPointerDown(e: PointerEvent) {
  const target = e.target as Element | null
  if (!target || panelRef.value?.contains(target)) return
  if (target.closest(`[${DETAIL_TRIGGER_ATTR}], .skill-tooltip`)) return
  closeDetail()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDetail({ restoreFocus: true })
}

function removeListeners() {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onKeyDown)
}

watch(
  () => detailTarget.value !== null,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('pointerdown', onDocumentPointerDown, true)
      document.addEventListener('keydown', onKeyDown)
    } else {
      removeListeners()
    }
  },
)
onBeforeUnmount(removeListeners)

// 別の対象に切り替えたら先頭から読めるようにする
watch(detailTarget, async () => {
  await nextTick()
  panelRef.value?.scrollTo({ top: 0 })
})

const route = useRoute()
watch(
  () => route.fullPath,
  () => closeDetail(),
)
</script>

<template>
  <Teleport to="body">
    <aside
      v-if="detailTarget"
      :id="DETAIL_PANEL_ID"
      ref="panelRef"
      class="detail-panel"
      role="dialog"
      :aria-label="ariaLabel"
    >
      <button type="button" class="close-btn" aria-label="Close" @click="closeDetail({ restoreFocus: true })">×</button>
      <SupportCardDetailBody v-if="detailTarget.kind === 'support'" :id="detailTarget.id" />
      <OutfitDetailBody v-else :id="detailTarget.id" />
    </aside>
  </Teleport>
</template>

<!-- 中身(detail/*Body.vue)と共通のクラスなのでscopedにせず、.detail-panel配下に限定する -->
<style>
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

.detail-panel .close-btn {
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

.detail-panel .close-btn:hover,
.detail-panel .close-btn:focus-visible {
  background: var(--color-background-mute);
}

.detail-panel .head {
  display: flex;
  gap: 0.75rem;
  padding-right: 1.75rem;
}

.detail-panel .thumb {
  flex: none;
  width: 64px;
}

.detail-panel .thumb img {
  display: block;
  width: 100%;
  height: auto;
}

/* サポカはゲーム内表示に合わせてレアリティ枠を付ける */
.detail-panel .card-thumb {
  padding: 3px;
  border-radius: 6px;
}

.detail-panel .card-thumb img {
  border-radius: 4px;
}

.detail-panel .card-thumb.rarity-ssr {
  background: linear-gradient(160deg, #ff8ccf 0%, #ffe27a 30%, #8ff0c0 55%, #74c8ff 75%, #c49bff 100%);
}

.detail-panel .card-thumb.rarity-sr {
  background: linear-gradient(160deg, #f8dc8a 0%, #d9a32a 50%, #f2c75a 100%);
}

.detail-panel .card-thumb.rarity-r {
  background: linear-gradient(160deg, #d9dde3 0%, #a9afb8 100%);
}

.detail-panel .outfit-thumb img {
  border-radius: 8px;
  background: var(--color-background-soft);
}

.detail-panel .head-text {
  min-width: 0;
}

.detail-panel .name {
  font-weight: 700;
  font-size: 1.05rem;
}

.detail-panel .title {
  font-size: 0.85rem;
  opacity: 0.8;
}

.detail-panel .badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.35rem;
}

.detail-panel .badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.75rem;
}

.detail-panel .badge-strong {
  font-weight: 700;
}

.detail-panel .badge-jp {
  border-color: #e05252;
  color: #e05252;
}

.detail-panel h3 {
  margin: 0.85rem 0 0.35rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.detail-panel .sub {
  font-weight: 400;
  opacity: 0.7;
}

.detail-panel .effects {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.2rem 0.75rem;
  margin: 0;
}

.detail-panel .effect {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.1rem 0;
  border-bottom: 1px dashed var(--color-border);
  font-size: 0.8rem;
}

.detail-panel .effect dd {
  margin: 0;
  font-weight: 700;
  white-space: nowrap;
}

.detail-panel .lines p {
  margin: 0 0 0.2rem;
  font-size: 0.85rem;
}

.detail-panel .chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.detail-panel .note {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  opacity: 0.85;
}

.detail-panel .comma-item + .comma-item::before {
  content: ', ';
}

/* 適性。ゲーム内の色分けに寄せる(S/A=橙, B/C=緑, D以下=灰) */
.detail-panel .aptitude {
  display: grid;
  gap: 0.25rem;
  font-size: 0.8rem;
}

.detail-panel .apt-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.7rem;
}

.detail-panel .apt-label {
  width: 4.2rem;
  opacity: 0.7;
}

.detail-panel .grade {
  display: inline-block;
  min-width: 1.1em;
  text-align: center;
}

.detail-panel .grade-S,
.detail-panel .grade-A {
  color: #e8863a;
}

.detail-panel .grade-B,
.detail-panel .grade-C {
  color: #3fa864;
}

.detail-panel .grade-D,
.detail-panel .grade-E,
.detail-panel .grade-F,
.detail-panel .grade-G {
  opacity: 0.55;
}

.detail-panel .stats {
  width: 100%;
  margin-top: 0.4rem;
  border-collapse: collapse;
  font-size: 0.75rem;
  text-align: center;
}

.detail-panel .stats th,
.detail-panel .stats td {
  padding: 0.15rem 0.2rem;
  border-bottom: 1px dashed var(--color-border);
}

.detail-panel .stats thead th {
  font-weight: 400;
  opacity: 0.7;
}

.detail-panel .stats tbody th {
  text-align: left;
  font-weight: 700;
}

.detail-panel .loading {
  margin: 0.75rem 0 0;
  opacity: 0.7;
}

.detail-panel .foot {
  margin-top: 0.85rem;
  font-size: 0.7rem;
  text-align: right;
  opacity: 0.7;
}

.detail-panel a {
  color: var(--color-accent);
}
</style>
