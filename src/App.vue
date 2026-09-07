<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import LeftSide from './components/LeftSide.vue'

const isDev = import.meta.env.DEV
</script>

<template>
  <header>
    <div class="header-left">
      <img alt="Yadayada Logo" class="logo" src="@/assets/logo.png" />
      <LeftSide />
    </div>

    <nav>
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
</style>
