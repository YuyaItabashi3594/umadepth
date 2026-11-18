<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DETAIL_PANEL_ID,
  DETAIL_TRIGGER_ATTR,
  isDetailOpenFor,
  isDetailPanelDisabled,
  toggleDetail,
} from '@/composables/useDetailPanel'
import { resolveOutfit } from '@/utils/outfitIndex'

// 記事中で育成ウマ娘に触れるときのチップ。クリックで右上に詳細パネル(適性・スキル等)を開く。
//   <UmaChip :id="103802" name="Wedding Curren Chan" />  エディタの一覧から挿入した形(nameは表示名)
//   <UmaChip name="Wedding Curren Chan" />               data/seed/outfit_aliases.json の通称
//   <UmaChip name="Curren Chan" />                       キャラ名だけなら最初の衣装
const props = defineProps<{ id?: number; name?: string }>()

const outfit = computed(() => resolveOutfit(props))
const label = computed(() => props.name ?? outfit.value?.name ?? `#${props.id}`)

if (import.meta.env.DEV && !outfit.value) {
  console.warn(`[UmaChip] 見つからない育成ウマ娘: ${props.id ?? props.name} (:id で指定するか data/seed/outfit_aliases.json に通称を追加)`)
}

// エディタ内では編集操作を優先してパネルを出さない
const interactive = !isDetailPanelDisabled()
const isOpen = computed(() => isDetailOpenFor('outfit', outfit.value?.id))
const onClick = (e: MouseEvent) => {
  if (outfit.value) toggleDetail('outfit', outfit.value.id, e.currentTarget as HTMLElement)
}

const imageFailed = ref(false)
</script>

<template>
  <component
    :is="interactive && outfit ? 'button' : 'span'"
    class="uma-chip"
    :class="{ 'not-found': !outfit, open: isOpen }"
    v-bind="
      interactive && outfit
        ? {
            type: 'button',
            [DETAIL_TRIGGER_ATTR]: '',
            'aria-expanded': isOpen,
            'aria-controls': isOpen ? DETAIL_PANEL_ID : undefined,
            title: [outfit.name, outfit.title].filter(Boolean).join(' '),
          }
        : {}
    "
    @click="interactive && onClick($event)"
  >
    <img
      v-if="outfit?.image && !imageFailed"
      :src="outfit.image"
      alt=""
      width="64"
      height="64"
      class="chip-icon"
      @error="imageFailed = true"
    />
    <span>{{ label }}</span>
  </component>
</template>

<style scoped>
.uma-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  max-width: 100%;
  padding: 0 0.55em 0 0.15em;
  border: 1px solid var(--color-accent);
  border-radius: 999px;
  background: var(--color-accent-soft);
  color: inherit;
  font: inherit;
  font-size: 0.95em;
  font-weight: 600;
  line-height: 1.5;
  vertical-align: baseline;
}

button.uma-chip {
  cursor: pointer;
}

@media (hover: hover) {
  button.uma-chip:hover {
    filter: brightness(1.05);
    text-decoration: underline;
  }
}

.uma-chip:focus-visible,
.uma-chip.open {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.uma-chip.not-found {
  border-style: dashed;
  background: transparent;
  font-weight: 400;
}

.chip-icon {
  width: 1.4em;
  height: 1.4em;
  border-radius: 50%;
  object-fit: cover;
  background: var(--color-background-soft);
}
</style>
