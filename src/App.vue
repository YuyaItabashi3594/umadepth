<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import LeftSide from './components/LeftSide.vue'

const isDev = import.meta.env.DEV

// md未満はナビが横スクロールになるので、現在ページのリンクを表示領域内に入れる
const route = useRoute()
const navRef = ref<HTMLElement | null>(null)
watch(
  () => route.path,
  () => {
    navRef.value
      ?.querySelector('.router-link-active')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  },
  { flush: 'post' },
)
</script>

<template>
  <header>
    <div class="header-left">
      <img alt="Yadayada Logo" class="logo" src="@/assets/logo.png" />
      <LeftSide />
    </div>

    <nav ref="navRef">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/motivation">Motivation</RouterLink>
      <RouterLink to="/chanmi">Chanmi</RouterLink>
      <RouterLink to="/gacha">Gacha</RouterLink>
      <RouterLink v-if="isDev" to="/editor">Editor</RouterLink>
    </nav>

    <div class="header-right">
      <a href="https://www.buymeacoffee.com/nemunyan" target="_blank" class="bmc-link">
        <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" class="bmc-btn" />
      </a>
    </div>
  </header>

  <div class="router-view-container">
    <RouterView />
  </div>
</template>

<style scoped>
header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 0 1.5rem;
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  height: 40px;
  width: auto;
}

nav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.95rem;
  min-width: 0;
}

nav a {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  color: var(--color-text);
  border-bottom: 2px solid transparent;
}

nav a:hover {
  color: var(--color-accent-hover);
}

nav a.router-link-exact-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

nav a.router-link-exact-active:hover {
  color: var(--color-accent-hover);
  border-bottom-color: var(--color-accent-hover);
}

.header-right {
  display: flex;
  align-items: center;
}

.bmc-link {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  opacity: 0.85;
  transition: opacity 0.2s;
}

.bmc-link:hover {
  opacity: 1;
}

.bmc-btn {
  height: 36px;
  width: auto;
  display: block;
}

.router-view-container {
  margin-top: var(--header-height);
  overflow-y: auto;
  min-height: calc(100vh - var(--header-height));
}

/* md未満: 1段目にロゴ+タイトル+BMC、2段目にナビを横スクロールで並べる */
@media (max-width: 767px) {
  header {
    grid-template-columns: 1fr auto;
    grid-template-rows: 56px 44px;
    grid-template-areas:
      'left right'
      'nav nav';
    gap: 0 0.75rem;
    padding: 0 1rem;
  }

  .header-left {
    grid-area: left;
    gap: 0.5rem;
    min-width: 0;
  }

  .header-right {
    grid-area: right;
  }

  .logo {
    height: 28px;
  }

  .bmc-btn {
    height: 28px;
  }

  nav {
    grid-area: nav;
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
    height: 100%;
    margin: 0 -1rem;
    padding: 0 1rem;
    border-top: 1px solid var(--color-border);
  }

  nav::-webkit-scrollbar {
    display: none;
  }

  nav a {
    flex-shrink: 0;
    white-space: nowrap;
  }
}
</style>
