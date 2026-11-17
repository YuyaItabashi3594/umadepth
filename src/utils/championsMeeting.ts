// チャンミ(Champions Meeting)関連の共通処理。scripts/data-sync からも読むので外部importはしない

// 星座シリーズ。並びはゲーム内の星座番号順(banner_303xMMNN の MM = index+1)
export const ZODIACS = [
  { key: 'capricorn', label: 'Capricorn', jp: 'カプリコーン', emoji: '🐐' },
  { key: 'aquarius', label: 'Aquarius', jp: 'アクエリアス', emoji: '🏺' },
  { key: 'pisces', label: 'Pisces', jp: 'ピスケス', emoji: '🐟' },
  { key: 'aries', label: 'Aries', jp: 'アリエス', emoji: '🐏' },
  { key: 'taurus', label: 'Taurus', jp: 'タウラス', emoji: '🐂' },
  { key: 'gemini', label: 'Gemini', jp: 'ジェミニ', emoji: '👯' },
  { key: 'cancer', label: 'Cancer', jp: 'キャンサー', emoji: '🦀' },
  { key: 'leo', label: 'Leo', jp: 'レオ', emoji: '🦁' },
  { key: 'virgo', label: 'Virgo', jp: 'ヴァルゴ', emoji: '👸' },
  { key: 'libra', label: 'Libra', jp: 'ライブラ', emoji: '⚖️' },
  { key: 'scorpio', label: 'Scorpio', jp: 'スコーピオ', emoji: '🦂' },
  { key: 'sagittarius', label: 'Sagittarius', jp: 'サジタリウス', emoji: '🏹' },
] as const

// 日本版は2023年6月から星座名をやめ、距離区分の名前(MILE等)になった。グローバル版も同じ順で追いかける
export const CATEGORIES = [
  { key: 'sprint', label: 'SPRINT', emoji: '⚡' },
  { key: 'mile', label: 'MILE', emoji: '🏇' },
  { key: 'classic', label: 'CLASSIC', emoji: '🏆' },
  { key: 'long', label: 'LONG', emoji: '🛤️' },
  { key: 'dirt', label: 'DIRT', emoji: '🟫' },
] as const

const SERIES = [...ZODIACS, ...CATEGORIES]

export type ZodiacKey = (typeof ZODIACS)[number]['key']
export type SeriesKey = (typeof SERIES)[number]['key']

export interface ChampionsMeeting {
  series: SeriesKey
  round: number // 同じシリーズの何回目か
  start: string | null // グローバル版のRound 1開始日(UTC, YYYY-MM-DD)。未告知/不明ならnull
  jpStart: string | null // 日本版の開催日(JST)。日本版の告知と紐づかない開催はnull
  global: boolean // グローバル版で告知済みか。falseなら日本版の告知から推定した未来の開催
  conditions: string | null // レース条件 'Tokyo / Dirt / 1,600m (Mile) / Left-Handed / Winter / Snowy / Soft'。未告知なら日本版を英訳したもの
  banner: string | null // public配下のバナー画像パス。未取得ならnull
  bannerKind: 'here' | 'coming' | null // here=開催中 coming=予告
  bannerLang: 'en' | 'ja' | null // 英語版が出たら英語版に置き換わる
}

export const seriesOf = (key: string) => SERIES.find((s) => s.key === key)

// 記事slugは「シリーズ名 + 回数(2回目以降)」(leo2 = Leo 2回目, mile = MILE 1回目)。初期の記事の綴り違いはここで吸収する
const SLUG_ALIASES: Record<string, SeriesKey> = { capricone: 'capricorn' }

export function parseChanmiSlug(slug: string): { series: SeriesKey; round: number } | null {
  const match = /^([a-z]+?)(\d*)$/.exec(slug)
  if (!match) return null
  const name = match[1] ?? ''
  const series = SLUG_ALIASES[name] ?? seriesOf(name)?.key
  if (!series) return null
  return { series, round: match[2] ? Number(match[2]) : 1 }
}

export const chanmiSlugOf = (series: SeriesKey, round: number) => (round > 1 ? `${series}${round}` : series)

export const chanmiTitleOf = (series: SeriesKey, round: number) => {
  const label = seriesOf(series)?.label ?? series
  return round > 1 ? `${label} ${toRoman(round)}` : label
}

const toRoman = (n: number) =>
  ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] ?? String(n)

const WEATHER_ICONS: Record<string, string> = { sunny: '☀', cloudy: '☁', rain: '☔', rainy: '☔', snow: '⛄', snowy: '⛄' }
const SEASONS = new Set(['spring', 'summer', 'fall', 'autumn', 'winter'])
const GROUNDS = new Set(['firm', 'good', 'soft', 'heavy'])

// 公式のレース条件を記事の「## Course」の2行(既存記事の書式)に変換する
//   'Tokyo / Dirt / 1,600m (Mile) / Left-Handed / Winter / Snowy / Soft' → ['Tokyo,Dirt,1600m(Mile)', 'Winter,⛄,Soft']
// 告知によって '2,400 m' や 'Weather: Sunny / Turf: Firm' のような揺れがある
export function courseLinesOf(conditions: string): [string, string] {
  const parts = conditions
    .split('/')
    .map((s) => s.trim().replace(/^\w+:\s*/, ''))
    .filter(Boolean)
  const distanceIndex = parts.findIndex((p) => /^[\d,]+\s*m\b/.test(p))
  const course = parts
    .slice(0, distanceIndex + 1)
    .map((p) => p.replace(/,(?=\d{3})/g, '').replace(/\s+(?=m\b|\()/g, ''))
  let season = ''
  let weather = ''
  let ground = ''
  for (const p of parts.slice(distanceIndex + 1)) {
    const key = p.toLowerCase()
    if (SEASONS.has(key)) season = p
    else if (WEATHER_ICONS[key]) weather = WEATHER_ICONS[key]
    else if (GROUNDS.has(key)) ground = p
  }
  return [course.join(','), [season, weather, ground].filter(Boolean).join(',')]
}
