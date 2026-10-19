<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface PreviewModule {
  default: unknown
  date?: string
  gacha?: string
  lowUma?: string
  lowSupport?: string
  medUma?: string
  medSupport?: string
  whaleUma?: string
  whaleSupport?: string
  meUma?: string
  meSupport?: string
}

// Editorが書き込むスクラッチファイルを読む専用ビュー。実記事とは別ディレクトリなので
// /gacha, /chanmi の一覧には一切影響しない。
const modules = import.meta.glob<PreviewModule>('./_editorPreview/*.md', { eager: true })

const route = useRoute()
const category = computed(() => route.params.category as string)
const currentModule = computed(() => modules[`./_editorPreview/${category.value}.md`])
</script>

<template>
  <div class="preview-root">
    <p v-if="!currentModule" class="empty-note">
      プレビューはまだありません。Editorで入力すると自動的に表示されます。
    </p>
    <template v-else>
      <div v-if="category === 'gacha'" class="table-scroll">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Umamusume</th>
              <th>SupportCard</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Low🧑‍💼</td>
              <td>{{ currentModule.lowUma }}</td>
              <td>{{ currentModule.lowSupport }}</td>
            </tr>
            <tr>
              <td>Medium💰</td>
              <td>{{ currentModule.medUma }}</td>
              <td>{{ currentModule.medSupport }}</td>
            </tr>
            <tr>
              <td>Whale🐋</td>
              <td>{{ currentModule.whaleUma }}</td>
              <td>{{ currentModule.whaleSupport }}</td>
            </tr>
            <tr>
              <td>Me🐈</td>
              <td>{{ currentModule.meUma }}</td>
              <td>{{ currentModule.meSupport }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  border: 1px solid var(--color-border);
  padding: 12px;
  text-align: left;
  vertical-align: top;
}

th {
  font-weight: bold;
  color: var(--color-accent);
}

/* Markdown見出しスタイル(GachaView/ChanmiWrapperと同じ見た目に揃える) */
:deep(h1) {
  font-size: 2.5rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
  line-height: 1.2;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

:deep(h2) {
  font-size: 2rem;
  font-weight: 600;
  margin-top: 1.75rem;
  margin-bottom: 0.875rem;
  line-height: 1.3;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.375rem;
}

:deep(h3) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

:deep(h4) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.625rem;
  line-height: 1.4;
}

:deep(h5) {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

:deep(h6) {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  line-height: 1.5;
  color: var(--color-text);
  opacity: 0.7;
}
</style>
