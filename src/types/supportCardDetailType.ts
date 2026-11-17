// src/data/supportCardDetails.json: サポカ詳細パネル用(カードをクリックしたときに読み込む)。
// 型推論を軽くするため、Recordではなく配列で持つ

export type SupportEffectSymbol = 'percent' | 'none' | 'level'

// 1 Speed / 2 Stamina / 3 Power / 4 Guts / 5 Wit / 30 Skill Pts
export type HintStatType = 1 | 2 | 3 | 4 | 5 | 30

export interface SupportCardDetail {
  id: number
  gametora: string // GameToraのページslug ('30028-kitasan-black')
  releaseEn: string | null
  releaseJp: string | null
  maxLevel: number // 完凸レベル(SSR 50 / SR 45 / R 40)
  effects: [effectId: number, valueAtMaxLevel: number][]
  unique: { level: number; lines: (string | null)[] } | null // null行 = 文章化できない特殊効果(GameTora参照)
  hintSkills: number[]
  eventSkills: number[]
  hintStats: [type: HintStatType, value: number][]
}

export interface SupportCardDetailFile {
  effects: [id: number, name: string, symbol: SupportEffectSymbol][]
  cards: SupportCardDetail[]
}
