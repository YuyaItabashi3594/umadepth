<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import LeftSide from './components/LeftSide.vue'
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
    </nav>

    <div class="header-right">
      <a href="https://www.buymeacoffee.com/nemunyan" target="_blank">
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
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  gap: 0.25rem;
  font-size: 0.95rem;
}

nav a {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
}

nav a.router-link-exact-active {
  color: var(--color-text);
  background-color: var(--color-border);
}

nav a.router-link-exact-active:hover {
  background-color: var(--color-border);
}

.header-right {
  display: flex;
  align-items: center;
}

.bmc-btn {
  height: 40px;
  width: auto;
}

.router-view-container {
  margin-top: 64px;
  overflow-y: auto;
  min-height: calc(100vh - 64px);
}
</style>
