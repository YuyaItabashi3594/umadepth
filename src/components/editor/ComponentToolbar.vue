<script setup lang="ts">
import { ref } from 'vue'
import SupportCardForm from './SupportCardForm.vue'
import CardRowForm from './CardRowForm.vue'
import ImageDescriptionForm from './ImageDescriptionForm.vue'
import CollapsibleForm from './CollapsibleForm.vue'
import ImageModalForm from './ImageModalForm.vue'
import { COMPONENT_LABELS, emptySupportCardData, type SupportCardData } from './editorShared'

const props = defineProps<{ slug: string; getSelectedText: () => string }>()
const emit = defineEmits<{ insert: [string] }>()

type Panel = 'supportcard' | 'cardrow' | 'imagedescription' | 'collapsible' | 'imagemodal' | null

const activePanel = ref<Panel>(null)
const supportCardData = ref<SupportCardData>(emptySupportCardData())
const collapsibleInitialContent = ref('')

const supportCardRef = ref<InstanceType<typeof SupportCardForm> | null>(null)
const cardRowRef = ref<InstanceType<typeof CardRowForm> | null>(null)
const imageDescriptionRef = ref<InstanceType<typeof ImageDescriptionForm> | null>(null)
const collapsibleRef = ref<InstanceType<typeof CollapsibleForm> | null>(null)
const imageModalRef = ref<InstanceType<typeof ImageModalForm> | null>(null)

const openPanel = (panel: Exclude<Panel, null>) => {
  if (panel === 'supportcard') supportCardData.value = emptySupportCardData()
  if (panel === 'collapsible') collapsibleInitialContent.value = props.getSelectedText()
  activePanel.value = panel
}

const closePanel = () => {
  activePanel.value = null
}

const confirmInsert = () => {
  let snippet = ''
  switch (activePanel.value) {
    case 'supportcard':
      snippet = supportCardRef.value?.builtSnippet ?? ''
      break
    case 'cardrow':
      snippet = cardRowRef.value?.builtSnippet ?? ''
      break
    case 'imagedescription':
      snippet = imageDescriptionRef.value?.builtSnippet ?? ''
      break
    case 'collapsible':
      snippet = collapsibleRef.value?.builtSnippet ?? ''
      break
    case 'imagemodal':
      snippet = imageModalRef.value?.builtSnippet ?? ''
      break
  }
  if (snippet) emit('insert', snippet)
  closePanel()
}
</script>

<template>
  <div class="component-toolbar">
    <div class="buttons">
      <span class="buttons-label">挿入:</span>
      <button type="button" @click="openPanel('supportcard')">{{ COMPONENT_LABELS.supportcard }}</button>
      <button type="button" @click="openPanel('cardrow')">{{ COMPONENT_LABELS.cardrow }}</button>
      <button type="button" @click="openPanel('imagedescription')">{{ COMPONENT_LABELS.imagedescription }}</button>
      <button type="button" @click="openPanel('collapsible')">{{ COMPONENT_LABELS.collapsible }}</button>
      <button type="button" @click="openPanel('imagemodal')">{{ COMPONENT_LABELS.imagemodal }}</button>
    </div>

    <div v-if="activePanel" class="panel">
      <SupportCardForm v-if="activePanel === 'supportcard'" ref="supportCardRef" v-model="supportCardData" />
      <CardRowForm v-else-if="activePanel === 'cardrow'" ref="cardRowRef" />
      <ImageDescriptionForm
        v-else-if="activePanel === 'imagedescription'"
        ref="imageDescriptionRef"
        :slug="props.slug"
      />
      <CollapsibleForm
        v-else-if="activePanel === 'collapsible'"
        ref="collapsibleRef"
        :initial-content="collapsibleInitialContent"
      />
      <ImageModalForm v-else-if="activePanel === 'imagemodal'" ref="imageModalRef" :slug="props.slug" />

      <div class="panel-actions">
        <button type="button" class="confirm-btn" @click="confirmInsert">挿入</button>
        <button type="button" class="cancel-btn" @click="closePanel">キャンセル</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.component-toolbar {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--color-background-mute);
}

.buttons-label {
  align-self: center;
  font-size: 0.8rem;
  opacity: 0.7;
}

.buttons button {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.buttons button:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.panel {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
}

.confirm-btn {
  background-color: var(--color-accent);
  border: none;
  border-radius: 4px;
  color: #000;
  padding: 0.4rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.4rem 1rem;
  cursor: pointer;
}
</style>
