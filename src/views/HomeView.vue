<script setup lang="ts">
interface UpdateHistory {
  date: string
  title: string
}

const updateHistories: UpdateHistory[] = [
  {
    date: '2026-02-16',
    title: 'release'
  }
]

const displayedHistories = updateHistories.slice(0, 3)
</script>

<template>
  <main>
    <div>
      <h1>Welcome to Uma Depth guide!</h1>
    </div>

    <section class="border rounded-md border-gray-500" style="margin-top: 40px">
      <ul>
        <li v-for="(history, index) in displayedHistories" :key="index">
          <div class="">{{ history.date }}</div>
          <div class="">{{ history.title }}</div>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
}

h3 {
  font-size: 1.2rem;
}

h1,
h3 {
  text-align: center;
}

ul li::before {
  content: '';
}

@media (min-width: 1024px) {
  h1,
  h3 {
    text-align: left;
  }
}
</style>
