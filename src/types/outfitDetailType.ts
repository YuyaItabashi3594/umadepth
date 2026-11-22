import type { AptitudeGrade, RunningStyle } from './outfitType'

// src/data/outfitIndex.json: <UmaChip>表示に必要な分だけの軽量版(記事ページで読み込む)
export interface OutfitIndexEntry {
  id: number // 103802
  name: string // 'Curren Chan'
  title: string | null // '[Ma Chérie of the New Moon]'
  image: string | null
}

export interface OutfitIndexFile {
  outfits: OutfitIndexEntry[]
  aliases: [alias: string, id: number][] // 'Wedding Curren Chan' → 103802 (data/seed/outfit_aliases.json)
}

// src/data/outfitDetails.json: 育成ウマ娘の詳細パネル用(クリックしたときに読み込む)
export type StatTuple = [speed: number, stamina: number, power: number, guts: number, wit: number]

export interface OutfitDetail {
  id: number
  gametora: string // GameToraのページslug ('103802-curren-chan')
  rarity: number | null // 初期レアリティ(★)
  runningStyle: RunningStyle | null
  releaseEn: string | null
  releaseJp: string | null
  talent: StatTuple | null // 成長率(%)
  // turf, dirt, short, mile, medium, long, front, pace, late, end
  aptitude: AptitudeGrade[] | null
  baseStats: StatTuple | null // 初期レアリティでの初期ステータス
  fiveStarStats: StatTuple | null
  skills: { unique: number[]; innate: number[]; awakening: number[]; event: number[] }
}

export interface OutfitDetailFile {
  outfits: OutfitDetail[]
}
