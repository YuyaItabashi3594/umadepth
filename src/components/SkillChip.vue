<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { findSkill, useSkillData } from '@/composables/useSkillData'

// 記事中で <SkillChip name="Corner Connoisseur" /> のように使う。
// 名前は大文字小文字・記号ゆれ・◎○×の有無を吸収する。同名スキルの区別や表記が合わない場合は :id="200341"
const props = defineProps<{ name?: string; id?: number }>()

const store = useSkillData()
const skill = computed(() => (store.value ? findSkill(store.value, props) : undefined))
const label = computed(() => skill.value?.name ?? props.name ?? `#${props.id}`)

if (import.meta.env.DEV) {
  watch(
    store,
    (s) => {
      if (s && !findSkill(s, props)) {
        console.warn(`[SkillChip] 見つからないスキル: ${props.name ?? props.id} (表記を確認するか :id で指定)`)
      }
    },
    { immediate: true },
  )
}

type RarityClass = 'white' | 'gold' | 'unique' | 'evolved'
const rarityClass = computed<RarityClass | null>(() => {
  const s = skill.value
  if (!s) return null
  if (s.inherited || s.rarity === 1) return 'white'
  if (s.rarity === 2) return 'gold'
  if (s.rarity === 6) return 'evolved'
  return 'unique'
})
const rarityLabel = computed(() => {
  if (skill.value?.inherited) return 'Inherited Unique'
  return { white: 'Normal', gold: 'Gold', unique: 'Unique', evolved: 'Evolved' }[rarityClass.value ?? 'white']
})

// 一部アイコンはGameTora側に画像が無い(404)ので、その場合は名前だけ出す
const iconFailed = ref(false)
const iconSrc = computed(() => (skill.value ? `/images/skills/${skill.value.icon}.png` : null))

// --- ツールチップ: PCはホバー/キーボードフォーカス、スマホはタップで開閉 ---
const tooltipId = useId()
const triggerRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const open = ref(false)
const placed = ref(false)
const pos = ref({ top: 0, left: 0 })
let lastPointerType = 'mouse'

const VIEWPORT_MARGIN = 8
const GAP = 6

async function show() {
  if (!skill.value || open.value) return
  placed.value = false
  open.value = true
  addListeners()
  await nextTick()
  place()
}

function hide() {
  if (!open.value) return
  open.value = false
  removeListeners()
}

// 下に収まらなければ上に出し、左右は画面内に収める
function place() {
  const trigger = triggerRef.value
  const tip = tooltipRef.value
  if (!trigger || !tip) return
  const rect = trigger.getBoundingClientRect()
  const { offsetWidth: w, offsetHeight: h } = tip
  const maxLeft = window.innerWidth - w - VIEWPORT_MARGIN
  const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left + rect.width / 2 - w / 2, maxLeft))
  const below = rect.bottom + GAP
  const top =
    below + h <= window.innerHeight - VIEWPORT_MARGIN ? below : Math.max(VIEWPORT_MARGIN, rect.top - GAP - h)
  pos.value = { top, left }
  placed.value = true
}

// クリックがマウス由来かタッチ由来かをclickイベント単体では判別できないので、直前のpointerdownで覚えておく
function onPointerDown(e: PointerEvent) {
  lastPointerType = e.pointerType
}

function onTriggerClick() {
  if (lastPointerType === 'mouse') return
  if (open.value) hide()
  else show()
}

// タップでもフォーカスが当たるブラウザがあるので、キーボード操作(:focus-visible)のときだけ開く
function onFocus(e: FocusEvent) {
  if ((e.currentTarget as HTMLElement).matches(':focus-visible')) show()
}

function onDocumentPointerDown(e: PointerEvent) {
  if (!triggerRef.value?.contains(e.target as Node)) hide()
}

// fixed配置なので、スクロール/リサイズで位置がずれる前に閉じる
function addListeners() {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  window.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
}

function removeListeners() {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  window.removeEventListener('scroll', hide, true)
  window.removeEventListener('resize', hide)
}

onBeforeUnmount(removeListeners)
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    class="skill-chip"
    :class="rarityClass ? `rarity-${rarityClass}` : skill === undefined && store ? 'not-found' : null"
    :aria-describedby="open ? tooltipId : undefined"
    @pointerdown="onPointerDown"
    @pointerenter="$event.pointerType === 'mouse' && show()"
    @pointerleave="$event.pointerType === 'mouse' && hide()"
    @focus="onFocus"
    @blur="hide"
    @click="onTriggerClick"
  >
    <img
      v-if="iconSrc && !iconFailed"
      :src="iconSrc"
      alt=""
      width="64"
      height="64"
      class="chip-icon"
      @error="iconFailed = true"
    />
    <span :lang="skill?.name === skill?.nameJp ? 'ja' : undefined">{{ label }}</span>
  </button>

  <Teleport to="body">
    <div
      v-if="open && skill"
      :id="tooltipId"
      ref="tooltipRef"
      role="tooltip"
      class="skill-tooltip"
      :class="`rarity-${rarityClass}`"
      :style="{ top: `${pos.top}px`, left: `${pos.left}px`, visibility: placed ? 'visible' : 'hidden' }"
    >
      <div class="tip-head">
        <img v-if="iconSrc && !iconFailed" :src="iconSrc" alt="" width="40" height="40" class="tip-icon" />
        <div>
          <div class="tip-name">{{ skill.name }}</div>
          <div v-if="skill.nameJp !== skill.name" class="tip-name-jp" lang="ja">{{ skill.nameJp }}</div>
        </div>
      </div>
      <div class="tip-badges">
        <span class="badge">{{ rarityLabel }}</span>
        <span v-if="skill.cost" class="badge">SP {{ skill.cost }}</span>
        <span v-if="!skill.global" class="badge badge-jp">JP only</span>
      </div>
      <p class="tip-desc" :lang="skill.descLang">{{ skill.desc ?? 'No description available.' }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.skill-chip {
  --chip-bg: var(--color-background-soft);
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  max-width: 100%;
  padding: 0 0.5em 0 0.2em;
  border: 1px solid var(--color-border-hover);
  border-radius: 999px;
  background: var(--chip-bg);
  color: inherit;
  font: inherit;
  font-size: 0.95em;
  line-height: 1.5;
  vertical-align: baseline;
  cursor: help;
}

.skill-chip:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.chip-icon {
  width: 1.35em;
  height: 1.35em;
  flex-shrink: 0;
}

.skill-chip.rarity-white {
  border-color: #b8bec7;
}

.skill-chip.rarity-gold {
  border-color: #d9a32a;
  --chip-bg: rgba(217, 163, 42, 0.12);
}

/* 角丸を保ったままグラデーション枠にするため、背景を2層(padding-box/border-box)にする */
.skill-chip.rarity-unique {
  border-color: transparent;
  background:
    linear-gradient(var(--chip-bg), var(--chip-bg)) padding-box,
    linear-gradient(90deg, #ff8ccf, #ffe27a, #8ff0c0, #74c8ff, #c49bff) border-box;
}

.skill-chip.rarity-evolved {
  border-color: #c86ad8;
  --chip-bg: rgba(200, 106, 216, 0.12);
}

.skill-chip.not-found {
  border-style: dashed;
  cursor: default;
}

.skill-tooltip {
  position: fixed;
  z-index: 200; /* ヘッダー(100)より上、画像モーダル(z-50は別スタッキング)と競合しない */
  width: max-content;
  max-width: min(320px, calc(100vw - 16px));
  padding: 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-top: 3px solid #b8bec7;
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  font-size: 0.875rem;
  line-height: 1.5;
  text-align: left;
  pointer-events: none;
}

.skill-tooltip.rarity-gold {
  border-top-color: #d9a32a;
}

.skill-tooltip.rarity-unique {
  border-top-color: #c49bff;
}

.skill-tooltip.rarity-evolved {
  border-top-color: #c86ad8;
}

.tip-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tip-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.tip-name {
  color: var(--color-heading);
  font-weight: 700;
}

.tip-name-jp {
  font-size: 0.75rem;
  opacity: 0.75;
}

.tip-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0.5rem 0 0.4rem;
}

.badge {
  padding: 0 0.4rem;
  border-radius: 4px;
  background: var(--color-background-mute);
  font-size: 0.75rem;
}

.badge-jp {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.tip-desc {
  margin: 0;
}
</style>
