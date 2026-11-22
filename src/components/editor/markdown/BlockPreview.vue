<script setup lang="ts">
import { computed } from 'vue'
import ImageDescription from '@/components/ImageDescription.vue'
import PreviewImagePart from './PreviewImagePart.vue'
import type { ComponentBlock, ImageDescriptionImage } from './componentBlocks'

// CodeMirrorのウィジェット内に単独のVueアプリとしてマウントされる(blockExtension.ts)
const props = defineProps<{ block: ComponentBlock; label: string }>()
const emit = defineEmits<{ edit: []; raw: [] }>()

const imagePart = computed<ImageDescriptionImage | null>(() => {
  const b = props.block
  switch (b.kind) {
    case 'imagedescription':
      return b.data.image
    case 'cardrow':
      return { kind: 'cardrow', data: b.data }
    case 'supportcard':
      return { kind: 'supportcard', data: b.data }
    case 'imagemodal':
      return { kind: 'imagemodal', data: b.data }
    default:
      return null
  }
})

const description = computed(() => (props.block.kind === 'imagedescription' ? props.block.data.description : null))
const collapsibleTitle = computed(() => (props.block.kind === 'collapsible-open' ? props.block.data.title : null))
</script>

<template>
  <div v-if="block.kind === 'collapsible-open' || block.kind === 'collapsible-close'" class="collapsible-bar">
    <span class="bar-text">
      <template v-if="block.kind === 'collapsible-open'">▼ {{ collapsibleTitle || '(タイトルなし)' }}</template>
      <template v-else>▲ ここまで折りたたみ</template>
    </span>
    <span class="label">{{ label }}</span>
    <span class="actions">
      <button v-if="block.kind === 'collapsible-open'" type="button" @click="emit('edit')">編集</button>
      <button type="button" title="コードで表示" @click="emit('raw')">&lt;/&gt;</button>
    </span>
  </div>

  <div v-else class="block-preview">
    <div class="block-toolbar">
      <span class="label">{{ label }}</span>
      <span class="actions">
        <button type="button" @click="emit('edit')">編集</button>
        <button type="button" title="コードで表示" @click="emit('raw')">&lt;/&gt;</button>
      </span>
    </div>
    <!-- 中身はクリックで編集を開く。カードのホバー等は編集中は不要なので無効にする -->
    <div class="block-body" title="クリックで編集" @click="emit('edit')">
      <ImageDescription v-if="imagePart && description !== null">
        <template #image><PreviewImagePart :image="imagePart" /></template>
        <template #description>
          <p class="description">{{ description }}</p>
        </template>
      </ImageDescription>
      <PreviewImagePart v-else-if="imagePart" :image="imagePart" />
    </div>
  </div>
</template>

<style scoped>
.block-preview {
  margin: 0.25rem 0;
  border: 1px dashed var(--color-border-hover);
  border-radius: 6px;
  background: var(--color-background);
  font-family: system-ui, sans-serif;
}

.block-preview:hover {
  border-color: var(--color-accent);
}

.block-toolbar,
.collapsible-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
}

.block-toolbar {
  border-bottom: 1px dashed var(--color-border);
}

.label {
  opacity: 0.6;
  font-family: monospace;
}

.actions {
  display: flex;
  gap: 0.25rem;
  margin-left: auto;
}

.actions button {
  padding: 0 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.75rem;
  cursor: pointer;
}

.actions button:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.block-body {
  padding: 0.5rem;
  cursor: pointer;
}

.block-body :deep(*) {
  pointer-events: none;
}

.description {
  margin: 0;
  white-space: pre-line;
}

.collapsible-bar {
  margin: 0.15rem 0;
  border-radius: 4px;
  background: var(--color-accent-soft);
  font-family: system-ui, sans-serif;
}

.bar-text {
  font-weight: 600;
}
</style>
