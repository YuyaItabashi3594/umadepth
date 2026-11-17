import { shallowRef } from 'vue'
import type { SkillDataFile, SkillEntry } from '@/types/skillType'
import { skillKey } from '@/utils/skillKey'

export interface SkillStore {
  byId: Map<number, SkillEntry>
  idByName: Map<string, number>
}

// skills.jsonは大きい(gzip後150KB弱)ので、<SkillChip>が初めて表示されたときに1回だけ読み込んで全インスタンスで共有する
const store = shallowRef<SkillStore | null>(null)
let loading: Promise<void> | null = null

export function useSkillData() {
  loading ??= import('@/data/skills.json').then((mod) => {
    const data = mod.default as unknown as SkillDataFile
    store.value = {
      byId: new Map(data.skills.map((s) => [s.id, s])),
      idByName: new Map(data.names),
    }
  })
  return store
}

export function findSkill(s: SkillStore, query: { id?: number; name?: string }): SkillEntry | undefined {
  const id = query.id ?? (query.name ? s.idByName.get(skillKey(query.name)) : undefined)
  return id === undefined ? undefined : s.byId.get(id)
}
