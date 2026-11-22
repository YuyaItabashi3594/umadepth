<script setup lang="ts">
import { ref } from 'vue'
import SkillChip from '@/components/SkillChip.vue'
import SkillPicker from './SkillPicker.vue'
import { buildSkillChipTag } from './editorShared'
import { findSkill, useSkillData } from '@/composables/useSkillData'
import type { SkillEntry } from '@/types/skillType'

// 文中に<SkillChip>(ホバーで詳細が出るスキルのチップ)を入れるフォーム。
// 一覧のクリックでそのまま挿入する(続けて何個でも入れられる)
const emit = defineEmits<{ insert: [snippet: string] }>()

const store = useSkillData()
const lastInserted = ref<SkillEntry | null>(null)

// 名前だけで同じスキルに解決できるなら name だけ(読みやすい)、継承固有などで紛れるなら :id も付ける
const snippetOf = (skill: SkillEntry) => {
  const nameIsUnique = store.value ? findSkill(store.value, { name: skill.name })?.id === skill.id : false
  return buildSkillChipTag(skill.name, nameIsUnique ? undefined : skill.id)
}

const insert = (skill: SkillEntry) => {
  lastInserted.value = skill
  emit('insert', snippetOf(skill))
}
</script>

<template>
  <div class="skill-chip-form">
    <p class="hint">
      クリックで文中(カーソル位置)に挿入します。ホバーで詳細を確認でき、続けて何個でも挿入できます
    </p>
    <div v-if="lastInserted" class="selected">
      <span class="label">直前に挿入:</span>
      <SkillChip :id="lastInserted.id" />
      <code class="snippet">{{ snippetOf(lastInserted) }}</code>
    </div>
    <SkillPicker :selected-id="lastInserted?.id" @select="insert" />
  </div>
</template>

<style scoped>
.skill-chip-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.label {
  opacity: 0.7;
}

.snippet {
  font-size: 0.75rem;
  opacity: 0.7;
}

.hint {
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
