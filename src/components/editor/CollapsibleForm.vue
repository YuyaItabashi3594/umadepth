<script setup lang="ts">
import { ref, computed } from 'vue'
import { buildCollapsibleOpenTag, buildCollapsibleSnippet } from './editorShared'

// titleOnly: 本文中の既存セクションの開始タグだけを編集する(中身は本文側でそのまま編集する)
const props = defineProps<{ initialContent?: string; initialTitle?: string; titleOnly?: boolean }>()

const title = ref(props.initialTitle ?? '')
const content = ref(props.initialContent ?? '')

const builtSnippet = computed(() =>
  props.titleOnly ? buildCollapsibleOpenTag(title.value) : buildCollapsibleSnippet(title.value, content.value),
)

defineExpose({ builtSnippet })
</script>

<template>
  <div class="collapsible-form">
    <input v-model="title" type="text" placeholder="見出し(クリックで開閉する部分)" />
    <template v-if="!props.titleOnly">
      <p v-if="props.initialContent" class="hint">選択中のテキストを中身にします。必要なら下で編集できます。</p>
      <textarea v-model="content" rows="4" placeholder="中身(空なら空のセクションを挿入)" />
    </template>
  </div>
</template>

<style scoped>
.collapsible-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

input,
textarea {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.4rem 0.5rem;
  font-size: 0.85rem;
  resize: vertical;
}

.hint {
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
