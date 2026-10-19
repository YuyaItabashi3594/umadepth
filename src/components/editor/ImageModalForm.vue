<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { buildImageModalSnippet } from './editorShared'

const props = defineProps<{ slug: string }>()

const files = ref<string[]>([])
const selectedFile = ref('')
const alt = ref('')
const width = ref(200)

const fetchImages = async (slug: string) => {
  files.value = []
  selectedFile.value = ''
  if (!slug) return
  try {
    const res = await fetch(`/__editor-api/images/${encodeURIComponent(slug)}`)
    if (res.ok) {
      files.value = await res.json()
    }
  } catch {
    files.value = []
  }
}

watch(() => props.slug, fetchImages, { immediate: true })

const src = computed(() =>
  selectedFile.value ? `/images/myuma/${props.slug}/${selectedFile.value}` : '',
)

const builtSnippet = computed(() => buildImageModalSnippet(src.value, alt.value, width.value))

defineExpose({ builtSnippet })
</script>

<template>
  <div class="image-modal-form">
    <p v-if="!props.slug" class="hint">slugを先に入力してください</p>
    <p v-else-if="files.length === 0" class="hint">
      public/images/myuma/{{ props.slug }}/ に画像が見つかりません
    </p>
    <div v-else class="thumb-grid">
      <button
        v-for="file in files"
        :key="file"
        type="button"
        class="thumb"
        :class="{ selected: file === selectedFile }"
        @click="selectedFile = file"
      >
        <img :src="`/images/myuma/${props.slug}/${file}`" :alt="file" />
        <span>{{ file }}</span>
      </button>
    </div>
    <div class="fields">
      <input v-model="alt" type="text" placeholder="alt" />
      <input v-model.number="width" type="number" placeholder="width(px)" />
    </div>
  </div>
</template>

<style scoped>
.image-modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hint {
  font-size: 0.85rem;
  opacity: 0.7;
}

.thumb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 0.5rem;
  max-height: 220px;
  overflow-y: auto;
}

.thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  background: none;
  padding: 0.25rem;
  cursor: pointer;
}

.thumb img {
  width: 100%;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
}

.thumb span {
  font-size: 0.65rem;
  color: var(--color-text);
  word-break: break-all;
}

.thumb.selected {
  border-color: var(--color-accent);
}

.fields {
  display: flex;
  gap: 0.5rem;
}

.fields input {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
}
</style>
