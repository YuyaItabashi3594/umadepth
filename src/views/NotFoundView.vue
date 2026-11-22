<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'

// どのルートにも当たらないURL(本番の /editor 含む)用。
// Vercelは全URLをindex.htmlへrewriteするのでHTTPステータスは200のまま。検索結果に載らないようnoindexだけ付ける
const route = useRoute()

let robotsMeta: HTMLMetaElement | null = null
onMounted(() => {
  robotsMeta = document.createElement('meta')
  robotsMeta.name = 'robots'
  robotsMeta.content = 'noindex'
  document.head.appendChild(robotsMeta)
})
onBeforeUnmount(() => robotsMeta?.remove())
</script>

<template>
  <div class="not-found">
    <p class="code">404</p>
    <h1>Page not found</h1>
    <p class="path">
      <code>{{ route.path }}</code> doesn't exist.
    </p>
    <nav class="links">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/chanmi">Chanmi</RouterLink>
      <RouterLink to="/gacha">Gacha</RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 1rem;
  text-align: center;
}

.code {
  font-size: clamp(3rem, 2rem + 5vw, 5rem);
  font-weight: 700;
  line-height: 1;
  color: var(--color-accent);
}

.path {
  opacity: 0.8;
  word-break: break-all;
}

.links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1.25rem;
  margin-top: 0.5rem;
  font-size: 1.05rem;
}
</style>
