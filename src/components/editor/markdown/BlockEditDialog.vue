<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import SupportCardForm from '../SupportCardForm.vue'
import CardRowForm from '../CardRowForm.vue'
import ImageModalForm from '../ImageModalForm.vue'
import ImageDescriptionForm from '../ImageDescriptionForm.vue'
import CollapsibleForm from '../CollapsibleForm.vue'
import { COMPONENT_LABELS, buildSupportCardTag, emptySupportCardData } from '../editorShared'
import type { ComponentBlock } from './componentBlocks'

// 本文中のブロックを既存フォームで編集し、生成し直したスニペットを返す
const props = defineProps<{ block: ComponentBlock; slug: string }>()
const emit = defineEmits<{ apply: [snippet: string]; close: [] }>()

const block = props.block
const supportCard = ref(block.kind === 'supportcard' ? { ...block.data } : emptySupportCardData())

const cardRowRef = ref<InstanceType<typeof CardRowForm> | null>(null)
const imageModalRef = ref<InstanceType<typeof ImageModalForm> | null>(null)
const imageDescriptionRef = ref<InstanceType<typeof ImageDescriptionForm> | null>(null)
const collapsibleRef = ref<InstanceType<typeof CollapsibleForm> | null>(null)

const TITLES: Record<ComponentBlock['kind'], string> = {
  supportcard: COMPONENT_LABELS.supportcard,
  cardrow: COMPONENT_LABELS.cardrow,
  imagemodal: COMPONENT_LABELS.imagemodal,
  imagedescription: COMPONENT_LABELS.imagedescription,
  'collapsible-open': COMPONENT_LABELS.collapsible,
  'collapsible-close': COMPONENT_LABELS.collapsible,
}

function buildSnippet(): string {
  switch (block.kind) {
    case 'supportcard':
      return buildSupportCardTag(supportCard.value)
    case 'cardrow':
      return cardRowRef.value?.builtSnippet ?? ''
    case 'imagemodal':
      return imageModalRef.value?.builtSnippet ?? ''
    case 'imagedescription':
      return imageDescriptionRef.value?.builtSnippet ?? ''
    case 'collapsible-open':
      return collapsibleRef.value?.builtSnippet ?? ''
    default:
      return ''
  }
}

const apply = () => {
  const snippet = buildSnippet()
  if (snippet) emit('apply', snippet)
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="dialog-backdrop" @click.self="emit('close')">
      <div class="dialog" role="dialog" aria-modal="true" :aria-label="`${TITLES[block.kind]} を編集`">
        <h2 class="dialog-title">{{ TITLES[block.kind] }} を編集</h2>

        <div class="dialog-body">
          <SupportCardForm v-if="block.kind === 'supportcard'" v-model="supportCard" />
          <CardRowForm v-else-if="block.kind === 'cardrow'" ref="cardRowRef" :initial="block.data" />
          <ImageModalForm
            v-else-if="block.kind === 'imagemodal'"
            ref="imageModalRef"
            :slug="props.slug"
            :initial="block.data"
          />
          <ImageDescriptionForm
            v-else-if="block.kind === 'imagedescription'"
            ref="imageDescriptionRef"
            :slug="props.slug"
            :initial="block.data"
          />
          <CollapsibleForm
            v-else-if="block.kind === 'collapsible-open'"
            ref="collapsibleRef"
            :initial-title="block.data.title"
            title-only
          />
        </div>

        <details class="source">
          <summary>現在のコード</summary>
          <pre>{{ block.source }}</pre>
        </details>

        <div class="dialog-actions">
          <button type="button" class="apply-btn" @click="apply">適用</button>
          <button type="button" class="cancel-btn" @click="emit('close')">キャンセル</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.45);
}

.dialog {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(760px, 100%);
  max-height: 90vh;
  padding: 1rem 1.25rem;
  overflow-y: auto;
  border: 1px solid var(--color-border-hover);
  border-radius: 0.5rem;
  background: var(--color-background);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.dialog-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.source summary {
  font-size: 0.8rem;
  opacity: 0.7;
  cursor: pointer;
}

.source pre {
  margin: 0.5rem 0 0;
  padding: 0.5rem;
  overflow-x: auto;
  border-radius: 4px;
  background: var(--color-background-mute);
  font-size: 0.75rem;
}

.dialog-actions {
  display: flex;
  gap: 0.5rem;
}

.apply-btn {
  padding: 0.4rem 1.25rem;
  border: none;
  border-radius: 4px;
  background-color: var(--color-accent);
  color: #000;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn {
  padding: 0.4rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}
</style>
