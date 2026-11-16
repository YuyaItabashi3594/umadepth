<script setup lang="ts">
import { computed } from 'vue'
import type { GachaTiers } from '@/types/gachaType'

const props = defineProps<{
  tiers: GachaTiers
}>()

const rows = computed(() => [
  { label: 'Low🧑‍💼', uma: props.tiers.lowUma, support: props.tiers.lowSupport },
  { label: 'Medium💰', uma: props.tiers.medUma, support: props.tiers.medSupport },
  { label: 'Whale🐋', uma: props.tiers.whaleUma, support: props.tiers.whaleSupport },
  { label: 'Me🐈', uma: props.tiers.meUma, support: props.tiers.meSupport },
])
</script>

<template>
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Umamusume</th>
          <th>SupportCard</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.label">
          <td class="tier-label">{{ row.label }}</td>
          <td>{{ row.uma }}</td>
          <td>{{ row.support }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  border: 1px solid var(--color-border);
  padding: 12px;
  text-align: left;
  vertical-align: top;
}

th {
  font-weight: bold;
  color: var(--color-accent);
}

.tier-label {
  white-space: nowrap;
}

@media (max-width: 639px) {
  table {
    font-size: 0.85rem;
  }

  th,
  td {
    padding: 8px;
  }
}
</style>
