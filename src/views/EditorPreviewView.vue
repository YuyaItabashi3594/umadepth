<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { GachaTiers } from '@/types/gachaType'

interface PreviewModule extends GachaTiers {
  default: unknown
  date?: string
  gacha?: string
}

// Editorが書き込むスクラッチファイルを読む専用ビュー。実記事とは別ディレクトリなので
// /gacha, /chanmi の一覧には一切影響しない。
const modules = import.meta.glob<PreviewModule>('./_editorPreview/*.md', { eager: true })

const route = useRoute()
const category = computed(() => route.params.category as string)
const currentModule = computed(() => modules[`./_editorPreview/${category.value}.md`])
</script>

<template>
  <div class="preview-root md-content">
    <p v-if="!currentModule" class="empty-note">
      プレビューはまだありません。Editorで入力すると自動的に表示されます。
    </p>
    <template v-else>
      <GachaTierTable v-if="category === 'gacha'" :tiers="currentModule" />
      <component :is="currentModule.default" />
    </template>
  </div>
</template>

<style scoped>
.preview-root {
  padding: 0.5rem 1rem 2rem;
}

.empty-note {
  opacity: 0.7;
  font-size: 0.9rem;
}
</style>
