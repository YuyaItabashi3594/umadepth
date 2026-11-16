<script setup lang="ts">
import { computed } from 'vue'

interface MarkdownModule {
  default: any
  date: string
  gacha: string
  lowUma: string
  lowSupport: string
  medUma: string
  medSupport: string
  whaleUma: string
  whaleSupport: string
  meUma: string
  meSupport: string
}

const markdownModules = import.meta.glob<MarkdownModule>('./gacha/*.md', { eager: true })

// 3. slug と frontmatter をセットで保持する computed
const articles = computed(() => {
  return Object.entries(markdownModules)
    .map(([path, module]) => {
      // ファイル名から slug を抽出
      const match = path.match(/\.\/gacha\/(.+)\.md$/)
      const slug = match ? match[1] : ''

      return {
        slug,
        frontmatter: {
          date: module.date,
          gacha: module.gacha,
          lowUma: module.lowUma,
          lowSupport: module.lowSupport,
          medUma: module.medUma,
          medSupport: module.medSupport,
          whaleUma: module.whaleUma,
          whaleSupport: module.whaleSupport,
          meUma: module.meUma,
          meSupport: module.meSupport,
        },
      }
    })
    .filter((article) => article.slug !== '') // slug が空のものを除外
})

// ソートが必要な場合はこう書けます（例：日付順）
const sortedArticles = computed(() => {
  return [...articles.value].sort((a, b) => {
    return new Date(b.frontmatter.date || 0).getTime() - new Date(a.frontmatter.date || 0).getTime()
  })
})

const getMarkdownComponent = (slug: string) => {
  const modulePath = `./gacha/${slug}.md`
  const module = markdownModules[modulePath]

  if (module && module.default) {
    return module.default
  }
  return null
}
</script>

<template>
  <div class="md-content">
    <div class="flex flex-col items-center justify-center" style="margin-bottom: 40px">
      <div class="info-card w-full max-w-[500px] mx-auto">
        <ul>
          <li>Low🧑‍💼: People who only buy Daily carats packs and some discounted carats</li>
          <li>
            Medium💰: People who pull 400~600 and spend ~$600(100,000 yen) per month (included me)
          </li>
          <li>
            Whale🐋: People who want everything useful. Following this makes your uma 100%
            potential.
          </li>
          <li>REMEMBER you must pull your oshi.</li>
        </ul>
      </div>
      <div class="w-full">
        <ul v-if="sortedArticles.length > 0" class="article-list">
          <li v-for="article in sortedArticles" :key="article.slug">
            <CollapsibleSection>
              <template #title>
                <div class="flex flex-row items-center justify-start gap-2 min-w-0">
                  <img
                    :src="`/images/gacha/${article.slug}.png`"
                    alt="gacha-banner"
                    class="w-[60px] shrink-0"
                  />
                  <span>{{ article.frontmatter.gacha }}</span>
                </div>
              </template>
              <GachaTierTable :tiers="article.frontmatter" />
              <component v-if="article.slug" :is="getMarkdownComponent(article.slug)" />
            </CollapsibleSection>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
ul li::before {
  content: '';
}

.article-list {
  margin-left: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
