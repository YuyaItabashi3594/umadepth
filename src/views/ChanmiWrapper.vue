<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, defineAsyncComponent } from 'vue'
import ChanmiCourseMap from '@/components/ChanmiCourseMap.vue'

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
    <h1 class="capitalize">{{ route.params.slug }} CM</h1>
    <ChanmiCourseMap v-if="markdownComponent" :slug="route.params.slug as string" />
    <component v-if="markdownComponent" :is="markdownComponent" />
    <div v-else>
      <p>{{ route.params.slug }} doesn't exist</p>
    </div>
  </div>
</template>
