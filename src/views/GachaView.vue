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
  console.log(Object.values(markdownModules)[0])
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
  <div>
    <div class="flex flex-col items-center justify-center" style="margin-bottom: 40px">
      <div class="border border-gray-500 rounded-md w-[500px] mx-auto px-2 py-1">
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
        <ul v-if="sortedArticles.length > 0">
          <li v-for="article in sortedArticles" :key="article.slug">
            <CollapsibleSection>
              <template #title>
                <div class="flex flex-row items-center justify-center">
                  <img
                    :src="`/images/gacha/${article.slug}.png`"
                    alt="gacha-banner"
                    class="w-[60px]"
                  />
                  <span>{{ article.frontmatter.gacha }}</span>
                </div>
              </template>
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
                    <td>{{ article.frontmatter.lowUma }}</td>
                    <td>{{ article.frontmatter.lowSupport }}</td>
                  </tr>
                  <tr>
                    <td>Medium💰</td>
                    <td>{{ article.frontmatter.medUma }}</td>
                    <td>{{ article.frontmatter.medSupport }}</td>
                  </tr>
                  <tr>
                    <td>Whale🐋</td>
                    <td>{{ article.frontmatter.whaleUma }}</td>
                    <td>{{ article.frontmatter.whaleSupport }}</td>
                  </tr>
                  <tr>
                    <td>Me🐈</td>
                    <td>{{ article.frontmatter.meUma }}</td>
                    <td>{{ article.frontmatter.meSupport }}</td>
                  </tr>
                </tbody>
              </table>
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
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
  vertical-align: top;
}

th {
  font-weight: bold;
}

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
