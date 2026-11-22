// scripts/outfit-sync が書き出す src/data/outfits.json の1件分
export type RunningStyle = 'front' | 'pace' | 'late' | 'end'
export type AptitudeGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export interface Outfit {
  id: number // 100101
  gameId: number // キャラのゲーム内id (1001)
  characterSlug: string // 'specialweek'
  name: { en: string; jp: string }
  title: { en: string; jp: string | null }
  runningStyle: RunningStyle | null
  rarity: number | null
  talent: { speed: number; stamina: number; power: number; guts: number; wit: number } | null
  aptitude: {
    turf: AptitudeGrade
    dirt: AptitudeGrade
    short: AptitudeGrade
    mile: AptitudeGrade
    medium: AptitudeGrade
    long: AptitudeGrade
    front: AptitudeGrade
    pace: AptitudeGrade
    late: AptitudeGrade
    end: AptitudeGrade
  } | null
  releaseJp: string | null
  releaseEn: string | null // グローバル版未実装ならnull
  image: string | null // '/images/outfits/100101.png'
  aliases: string[]
}
