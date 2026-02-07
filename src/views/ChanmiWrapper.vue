<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, defineAsyncComponent } from 'vue'

const route = useRoute()

// chanmiディレクトリ内のすべてのMarkdownファイルをインポート
const markdownModules = import.meta.glob<{ default: string }>('./chanmi/*.md')

// ルートパラメータからMarkdownコンポーネントを取得
const markdownComponent = computed(() => {
  const slug = route.params.slug as string
  const modulePath = `./chanmi/${slug}.md`

  if (markdownModules[modulePath]) {
    return defineAsyncComponent(markdownModules[modulePath])
  }

  return null
})
</script>

<template>
  <div>
    <div class="flex justify-center" style="margin-bottom: 40px">
      <div class="border border-gray-500 rounded-md w-[500px] mx-auto px-2 py-1">
        <ul>
          <li>⭐️ I use this Style uma so I have better info</li>
          <li>🔥 must-have</li>
          <li>👀 recommended</li>
        </ul>
      </div>
    </div>
    <h1 class="capitalize">{{ route.params.slug }} Chanmi</h1>
    <component v-if="markdownComponent" :is="markdownComponent" />
    <div v-else>
      <p>{{ route.params.slug }} doesn't exist</p>
    </div>
  </div>
</template>

<style scoped>
/* Markdown見出しスタイル */
:deep(h1) {
  font-size: 2.5rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
  line-height: 1.2;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

:deep(h2) {
  font-size: 2rem;
  font-weight: 600;
  margin-top: 1.75rem;
  margin-bottom: 0.875rem;
  line-height: 1.3;
  border-bottom: 1px solid #e5e7eb;
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
  color: #6b7280;
}
</style>
