import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type {
  HintStatType,
  SupportCardDetail,
  SupportCardDetailFile,
  SupportEffectSymbol,
} from '../../src/types/supportCardDetailType.ts'
import { ROOT } from './db.ts'

const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'supportCardDetails.json')

// gametora_json.effects の1行 = [効果ID, Lv1, Lv5, Lv10, ..., Lv50] (-1 = そのレベルでは変化なし)
const MAX_LEVEL_BY_RARITY: Record<number, number> = { 1: 40, 2: 45, 3: 50 }
const levelIndex = (level: number) => (level === 1 ? 1 : level / 5 + 1)

interface GameToraUniqueEffect {
  type: number
  value: number
  value_1?: number
  value_2?: number
  value_3?: number
  value_4?: number
}

interface GameToraDetail {
  effects?: number[][]
  hints?: { hint_skills?: number[]; hint_others?: { hint_type?: number; hint_value?: number }[] }
  event_skills?: number[]
  unique?: { level: number; effects: GameToraUniqueEffect[] }
  unique_desc?: string
}

interface Row {
  id: number
  rarity: number
  gametora_slug: string
  release_en: string | null
  release_jp: string | null
  gametora_json: string
}

interface EffectRow {
  id: number
  name_en: string | null
  symbol: string | null
}

const HINT_STAT_TYPES = new Set([1, 2, 3, 4, 5, 30])

export function exportSupportCardDetails(db: DatabaseSync) {
  const effectRows = db.prepare('SELECT id, name_en, symbol FROM support_effects ORDER BY id').all() as unknown as EffectRow[]
  if (effectRows.length === 0) {
    console.warn('[export] サポカ効果名が未取得のため supportCardDetails.json は書き出さない')
    return
  }
  const effectById = new Map(effectRows.map((e) => [e.id, e]))
  const nameOf = (id: number) => effectById.get(id)?.name_en ?? `Effect ${id}`
  const valueOf = (id: number, value: number) => (effectById.get(id)?.symbol === 'percent' ? `${value}%` : `${value}`)
  const effectText = (id: number, value: number) => `${nameOf(id)} (${valueOf(id, value)})`

  // 固有効果(type 101〜)の文章。GameToraの表示文言に揃え、値の対応が確かめられたものだけ文章化する
  const uniqueLine = (e: GameToraUniqueEffect): string | null => {
    const { type, value: v, value_1: v1 = 0, value_2: v2 = 0, value_3: v3, value_4: v4 } = e
    if (effectById.has(type)) return effectText(type, v)
    switch (type) {
      case 101: {
        const gains = [effectText(v1, v2), ...(v3 ? [effectText(v3, v4 ?? 0)] : [])].join(' and ')
        return `Gain ${gains} when the bond gauge is ${v >= 100 ? 'full' : `at least ${v}`}`
      }
      case 102:
        return `When the bond gauge is ${v} or higher and this card is in a facility different from its type, gain ${effectText(8, v1)}`
      case 103:
        return `If there are at least ${v} different types of support cards in your deck, gain ${effectText(8, v1)}`
      case 104:
        return `Gain ${effectText(8, 1)} per ${v.toLocaleString('en')} fans, up to (${valueOf(8, v1)}) for ${(v * v1).toLocaleString('en')} fans`
      case 105:
        return `Gain Initial Stat Up (${v}), where Stat is the type of the card, for every card in your support deck (Friend and Group types give (${v1}) to every stat)`
      case 106:
        return `Gain ${effectText(v, v1)} every time you do friendship training with this card, up to ${v2} times for a total of (${valueOf(v, v1 * v2)})`
      case 107:
        return `The less energy you have, the more ${nameOf(v)} you'll gain`
      case 109:
        return `Gain ${nameOf(v)} (${valueOf(v, 1)}) for every ${Math.round(600 / v1)} combined support bond, up to (${valueOf(v, v1)}) at 600`
      case 110:
        return `Gain ${effectText(v, v1)} for every support card in the same training facility`
      case 111:
        return `Gain ${effectText(v, v1)} per every level of the current training facility`
      case 112:
        return `${v}% chance to make the current training fail rate zero`
      case 113:
        return `Gain ${effectText(v, v1)} when participating in a friendship (rainbow) training`
      case 114:
        return `Gain ${nameOf(v)} that scales with current Energy, from (${valueOf(v, v1)}) at 0 Energy to (${valueOf(v, v2)}) at 100+ Energy`
      case 115:
        return `All support cards gain ${effectText(v, v1)}`
      case 121:
        return `All supports get ${v} bonus bond from training; ${v1} if they're in the same facility as this card`
      case 122:
        return `Supports that train together with this one gain ${effectText(v, v1)} for the next turn`
      default:
        return null
    }
  }

  const rows = db
    .prepare(
      `SELECT id, rarity, gametora_slug, release_en, release_jp, gametora_json FROM support_cards
       WHERE gametora_json IS NOT NULL ORDER BY id`,
    )
    .all() as unknown as Row[]

  const cards: SupportCardDetail[] = rows.map((r) => {
    const g = JSON.parse(r.gametora_json) as GameToraDetail
    const maxLevel = MAX_LEVEL_BY_RARITY[r.rarity] ?? 50
    const maxIndex = levelIndex(maxLevel)
    const effects: [number, number][] = []
    for (const [id, ...values] of g.effects ?? []) {
      // 完凸レベルまでで最後に値が入っているもの
      const value = values.slice(0, maxIndex).findLast((v) => v !== -1)
      if (id !== undefined && value !== undefined && value > 0) effects.push([id, value])
    }
    const uniqueLines = g.unique_desc ? [g.unique_desc] : (g.unique?.effects.map(uniqueLine) ?? [])
    return {
      id: r.id,
      gametora: r.gametora_slug,
      releaseEn: r.release_en,
      releaseJp: r.release_jp,
      maxLevel,
      effects,
      unique: uniqueLines.length > 0 ? { level: g.unique?.level ?? 1, lines: uniqueLines } : null,
      hintSkills: g.hints?.hint_skills ?? [],
      eventSkills: g.event_skills ?? [],
      hintStats: (g.hints?.hint_others ?? [])
        .filter((h) => HINT_STAT_TYPES.has(h.hint_type ?? 0) && h.hint_value)
        .map((h) => [h.hint_type as HintStatType, h.hint_value!]),
    }
  })

  const usedEffects = new Set(cards.flatMap((c) => c.effects.map(([id]) => id)))
  const file: SupportCardDetailFile = {
    effects: effectRows
      .filter((e) => usedEffects.has(e.id))
      .map((e) => [e.id, nameOf(e.id), (e.symbol ?? 'none') as SupportEffectSymbol]),
    cards,
  }
  // 差分が見やすいよう1カード1行で書き出す
  fs.writeFileSync(
    OUTPUT_PATH,
    `{\n"effects": ${JSON.stringify(file.effects)},\n"cards": [\n${cards.map((c) => JSON.stringify(c)).join(',\n')}\n]\n}\n`,
  )
  const unknownUnique = cards.filter((c) => c.unique?.lines.includes(null)).length
  console.log(
    `[export] ${path.relative(ROOT, OUTPUT_PATH)}: ${cards.length}枚 (固有効果を文章化できないもの ${unknownUnique}枚)`,
  )
}
