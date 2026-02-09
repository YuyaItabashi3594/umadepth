<script setup lang="ts">
import { computed } from 'vue'

const markdownModules = import.meta.glob<{ default: string }>('./chanmi/*.md')

// ファイルパスからslugの配列を取得
const articleSlugs = computed(() => {
  return Object.keys(markdownModules).map((path) => {
    // './chanmi/article1.md' から 'article1' を抽出
    const match = path.match(/\.\/chanmi\/(.+)\.md$/)
    return match ? match[1] : ''
  }).filter(Boolean)
})
</script>

<template>
  <div>
    <h1 class="text-4xl">Chanmi Guides</h1>
    <ul>
      <li v-for="slug in articleSlugs" :key="slug">
        <RouterLink :to="`/chanmi/${slug}`">
          <span class="capitalize">{{ slug }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped></style>
