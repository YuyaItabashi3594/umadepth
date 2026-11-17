<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { GachaTiers } from '@/types/gachaType'
import { PREVIEW_FRONTMATTER_MESSAGE } from '@/components/editor/editorShared'

interface PreviewModule extends GachaTiers {
  default: unknown
  date?: string
  gacha?: string
  banner?: string
}

// Editorが書き込むスクラッチファイルを読む専用ビュー。実記事とは別ディレクトリなので
// /gacha, /chanmi の一覧には一切影響しない。
const modules = import.meta.glob<PreviewModule>('./_editorPreview/*.md', { eager: true })

const route = useRoute()
const category = computed(() => route.params.category as string)
const currentModule = computed(() => modules[`./_editorPreview/${category.value}.md`])

// MarkdownのHMRではfrontmatterが更新されないので、Editorから届いた最新値で上書きする(EditorView.vue参照)
const liveFrontmatter = ref<Record<string, string> | null>(null)
const onMessage = (e: MessageEvent) => {
  if (e.origin !== window.location.origin) return
  const data = e.data as { type?: string; category?: string; frontmatter?: Record<string, string> } | null
  if (data?.type === PREVIEW_FRONTMATTER_MESSAGE && data.category === category.value && data.frontmatter) {
    liveFrontmatter.value = data.frontmatter
  }
}
onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => window.removeEventListener('message', onMessage))

const meta = computed(() => ({ ...currentModule.value, ...liveFrontmatter.value }) as Omit<PreviewModule, 'default'>)
</script>

<template>
  <div class="preview-root md-content">
    <p v-if="!currentModule" class="empty-note">
      プレビューはまだありません。Editorで入力すると自動的に表示されます。
    </p>
    <template v-else>
      <!-- ガチャ一覧(GachaView)の見出しと同じ並び。banner未設定の既存記事の画像はslugが分からないので出さない -->
      <div v-if="category === 'gacha'" class="gacha-heading">
        <img v-if="meta.banner" :src="meta.banner" alt="gacha-banner" class="gacha-banner" />
        <span>{{ meta.gacha }}</span>
      </div>
      <GachaTierTable v-if="category === 'gacha'" :tiers="meta" />
      <component :is="currentModule.default" />
    </template>
  </div>
</template>

<style scoped>
.preview-root {
  padding: 0.5rem 1rem 2rem;
}

.gacha-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  font-size: 1.1rem;
}

.gacha-banner {
  width: 60px;
  flex-shrink: 0;
}

.empty-note {
  opacity: 0.7;
  font-size: 0.9rem;
}
</style>
