<script setup lang="ts">
import { ref, computed } from 'vue'
import CardRowForm from './CardRowForm.vue'
import ImageModalForm from './ImageModalForm.vue'
import { buildImageDescriptionSnippet } from './editorShared'

const props = defineProps<{ slug: string }>()

const imageKind = ref<'cardrow' | 'imagemodal'>('cardrow')
const description = ref('')

const cardRowRef = ref<InstanceType<typeof CardRowForm> | null>(null)
const imageModalRef = ref<InstanceType<typeof ImageModalForm> | null>(null)

const builtSnippet = computed(() => {
  const imageSnippet =
    imageKind.value === 'cardrow'
      ? (cardRowRef.value?.builtSnippet ?? '')
      : (imageModalRef.value?.builtSnippet ?? '')
  return buildImageDescriptionSnippet(imageSnippet, description.value)
})

defineExpose({ builtSnippet })
</script>

<template>
  <div class="image-description-form">
    <div class="kind-select">
      <label><input v-model="imageKind" type="radio" value="cardrow" /> CardRow</label>
      <label><input v-model="imageKind" type="radio" value="imagemodal" /> ImageModal</label>
    </div>
    <CardRowForm v-if="imageKind === 'cardrow'" ref="cardRowRef" />
    <ImageModalForm v-else ref="imageModalRef" :slug="props.slug" />
    <textarea v-model="description" placeholder="description" rows="2" class="description-input" />
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
