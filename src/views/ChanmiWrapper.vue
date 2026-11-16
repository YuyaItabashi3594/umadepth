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
  <div class="md-content">
    <div class="flex justify-center" style="margin-bottom: 40px">
      <div class="info-card w-full max-w-[500px] mx-auto">
        <ul>
          <li>⭐️ I use this Style uma so I have better info</li>
          <li>🔥 must-have</li>
          <li>👀 recommended</li>
          <li>❌ not working</li>
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
