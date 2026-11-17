<script setup lang="ts">
import { ref, computed } from 'vue'
import CardRowForm from './CardRowForm.vue'
import ImageModalForm from './ImageModalForm.vue'
import SupportCardForm from './SupportCardForm.vue'
import { COMPONENT_LABELS, buildImageDescriptionSnippet, buildSupportCardTag, emptySupportCardData } from './editorShared'
import type { ImageDescriptionData } from './markdown/componentBlocks'

// initialは本文中の既存ブロックを編集するときに渡す
const props = defineProps<{ slug: string; initial?: ImageDescriptionData }>()

const initialImage = props.initial?.image
const imageKind = ref<'cardrow' | 'imagemodal' | 'supportcard'>(initialImage?.kind ?? 'cardrow')
const description = ref(props.initial?.description ?? '')
const supportCard = ref(initialImage?.kind === 'supportcard' ? { ...initialImage.data } : emptySupportCardData())

const cardRowRef = ref<InstanceType<typeof CardRowForm> | null>(null)
const imageModalRef = ref<InstanceType<typeof ImageModalForm> | null>(null)

const builtSnippet = computed(() => {
  let imageSnippet = ''
  if (imageKind.value === 'cardrow') imageSnippet = cardRowRef.value?.builtSnippet ?? ''
  else if (imageKind.value === 'imagemodal') imageSnippet = imageModalRef.value?.builtSnippet ?? ''
  else imageSnippet = buildSupportCardTag(supportCard.value)
  return buildImageDescriptionSnippet(imageSnippet, description.value)
})

defineExpose({ builtSnippet })
</script>

<template>
  <div class="image-description-form">
    <div class="kind-select">
      <span>画像部分:</span>
      <label><input v-model="imageKind" type="radio" value="cardrow" /> {{ COMPONENT_LABELS.cardrow }}</label>
      <label><input v-model="imageKind" type="radio" value="supportcard" /> {{ COMPONENT_LABELS.supportcard }}(1枚)</label>
      <label><input v-model="imageKind" type="radio" value="imagemodal" /> {{ COMPONENT_LABELS.imagemodal }}</label>
    </div>
    <CardRowForm
      v-if="imageKind === 'cardrow'"
      ref="cardRowRef"
      :initial="initialImage?.kind === 'cardrow' ? initialImage.data : undefined"
    />
    <SupportCardForm v-else-if="imageKind === 'supportcard'" v-model="supportCard" />
    <ImageModalForm
      v-else
      ref="imageModalRef"
      :slug="props.slug"
      :initial="initialImage?.kind === 'imagemodal' ? initialImage.data : undefined"
    />
    <textarea v-model="description" placeholder="説明文" rows="3" class="description-input" />
  </div>
</template>

<style scoped>
.image-description-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.kind-select {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
}

.description-input {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.5rem;
  font-size: 0.85rem;
  resize: vertical;
}
</style>
