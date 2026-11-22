// scripts/data-sync が書き出す src/data/skills.json
// 型推論を軽くするため、名前索引はRecordではなく[key, id]の配列で持つ

// GameToraのrarity: 1白 2金 3-5固有 6進化
export type SkillRarity = 1 | 2 | 3 | 4 | 5 | 6

export interface SkillEntry {
  id: number
  name: string // 公式英語名。無ければ日本語名
  nameJp: string
  desc: string | null // 公式英語説明。無ければ日本語説明(descLangで判別)
  descLang: 'en' | 'ja'
  rarity: SkillRarity
  cost: number | null
  icon: number // /images/skills/{icon}.png
  global: boolean // グローバル版で実装済みか
  inherited: boolean // 継承固有
}

export interface SkillDataFile {
  skills: SkillEntry[]
  names: [key: string, id: number][]
}
