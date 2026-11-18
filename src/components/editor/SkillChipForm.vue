<script setup lang="ts">
import { computed, ref } from 'vue'
import SkillChip from '@/components/SkillChip.vue'
import SkillPicker from './SkillPicker.vue'
import { buildSkillChipTag } from './editorShared'
import { findSkill, useSkillData } from '@/composables/useSkillData'
import type { SkillEntry } from '@/types/skillType'

// 文中に<SkillChip>(ホバーで詳細が出るスキルのチップ)を入れるフォーム
const store = useSkillData()
const selected = ref<SkillEntry | null>(null)

// 名前だけで同じスキルに解決できるなら name だけ(読みやすい)、継承固有などで紛れるなら :id も付ける
const builtSnippet = computed(() => {
  const skill = selected.value
  if (!skill) return ''
  const nameIsUnique = store.value ? findSkill(store.value, { name: skill.name })?.id === skill.id : false
  return buildSkillChipTag(skill.name, nameIsUnique ? undefined : skill.id)
})

defineExpose({ builtSnippet })
</script>

<template>
  <div class="skill-chip-form">
    <div v-if="selected" class="selected">
      <span class="label">選択中:</span>
      <SkillChip :id="selected.id" />
      <code class="snippet">{{ builtSnippet }}</code>
    </div>
    <p v-else class="hint">
      一覧からスキルを選んでください(ホバーで詳細)。文中(カーソル位置)にチップとして入り、記事でもホバー/タップで詳細が出ます
    </p>
    <SkillPicker :selected-id="selected?.id" @select="selected = $event" />
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
