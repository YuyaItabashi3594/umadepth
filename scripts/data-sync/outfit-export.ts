import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { AptitudeGrade, Outfit, RunningStyle } from '../../src/types/outfitType.ts'
import type { OutfitDetail, OutfitDetailFile, OutfitIndexFile, StatTuple } from '../../src/types/outfitDetailType.ts'
import { ROOT } from './db.ts'

// 本番(静的サイト)はDBを読めないので、ビルドに含めるJSONへ書き出す
const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'outfits.json')
const INDEX_OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'outfitIndex.json')
const DETAIL_OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'outfitDetails.json')

const RUNNING_STYLES: Record<number, RunningStyle> = { 1: 'front', 2: 'pace', 3: 'late', 4: 'end' }

interface OutfitRow {
  id: number
  game_id: number
  slug: string
  name_en: string
  name_jp: string
  title: string
  title_en: string | null
  title_jp: string | null
  running_style: number | null
  default_rarity: number | null
  talent_speed: number | null
  talent_stamina: number | null
  talent_power: number | null
  talent_guts: number | null
  talent_wit: number | null
  apt_turf: string | null
  apt_dirt: string | null
  apt_short: string | null
  apt_mile: string | null
  apt_medium: string | null
  apt_long: string | null
  apt_front: string | null
  apt_pace: string | null
  apt_late: string | null
  apt_end: string | null
  release_jp: string | null
  release_en: string | null
  image_path: string | null
  aliases: string | null
}

function toOutfit(row: OutfitRow): Outfit {
  const grade = (value: string | null) => value as AptitudeGrade
  return {
    id: row.id,
    gameId: row.game_id,
    characterSlug: row.slug,
    name: { en: row.name_en, jp: row.name_jp },
    title: { en: row.title_en ?? row.title, jp: row.title_jp },
    runningStyle: row.running_style ? (RUNNING_STYLES[row.running_style] ?? null) : null,
    rarity: row.default_rarity,
    talent:
      row.talent_speed === null
        ? null
        : {
            speed: row.talent_speed,
            stamina: row.talent_stamina ?? 0,
            power: row.talent_power ?? 0,
            guts: row.talent_guts ?? 0,
            wit: row.talent_wit ?? 0,
          },
    aptitude:
      row.apt_turf === null
        ? null
        : {
            turf: grade(row.apt_turf),
            dirt: grade(row.apt_dirt),
            short: grade(row.apt_short),
            mile: grade(row.apt_mile),
            medium: grade(row.apt_medium),
            long: grade(row.apt_long),
            front: grade(row.apt_front),
            pace: grade(row.apt_pace),
            late: grade(row.apt_late),
            end: grade(row.apt_end),
          },
    releaseJp: row.release_jp,
    releaseEn: row.release_en,
    image: row.image_path,
    aliases: row.aliases ? row.aliases.split('\n') : [],
  }
}

export function exportOutfits(db: DatabaseSync) {
  const rows = db
    .prepare(
      `SELECT o.*, c.game_id, c.slug, c.name_en, c.name_jp,
         (SELECT group_concat(a.alias, char(10)) FROM outfit_aliases a WHERE a.outfit_id = o.id) AS aliases
       FROM outfits o JOIN characters c ON c.id = o.character_id
       ORDER BY o.id`,
    )
    .all() as unknown as OutfitRow[]

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  const outfits = rows.map(toOutfit)
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outfits, null, 2) + '\n', 'utf-8')
  console.log(`[export] ${path.relative(ROOT, OUTPUT_PATH)}: ${rows.length}件`)
  exportOutfitIndex(outfits)
  exportOutfitDetails(db, outfits)
}

// 記事中の<UmaChip>用。outfits.json(全項目)は記事ページには重いので、名前と画像だけの軽量版を別に出す
function exportOutfitIndex(outfits: Outfit[]) {
  const file: OutfitIndexFile = {
    outfits: outfits.map((o) => ({ id: o.id, name: o.name.en, title: o.title.en, image: o.image })),
    aliases: outfits.flatMap((o) => o.aliases.map((alias) => [alias, o.id] as [string, number])),
  }
  fs.writeFileSync(
    INDEX_OUTPUT_PATH,
    `{\n"outfits": [\n${file.outfits.map((o) => JSON.stringify(o)).join(',\n')}\n],\n"aliases": ${JSON.stringify(file.aliases)}\n}\n`,
  )
  console.log(`[export] ${path.relative(ROOT, INDEX_OUTPUT_PATH)}: ${file.outfits.length}件 / 通称${file.aliases.length}件`)
}

interface GameToraOutfitDetail {
  skills_unique?: number[]
  skills_innate?: number[]
  skills_awakening?: number[]
  skills_awakening_en?: number[] // グローバル版で覚醒スキルが違う衣装がある
  skills_event?: number[]
  base_stats?: number[]
  five_star_stats?: number[]
}

const statTuple = (values: number[] | undefined) => (values?.length === 5 ? (values as StatTuple) : null)

// 詳細パネル用。クリックしたときに読み込む
function exportOutfitDetails(db: DatabaseSync, outfits: Outfit[]) {
  const rows = db.prepare('SELECT id, gametora_slug, gametora_json FROM outfits').all() as unknown as {
    id: number
    gametora_slug: string
    gametora_json: string | null
  }[]
  const rowById = new Map(rows.map((r) => [r.id, r]))
  const details: OutfitDetail[] = outfits.map((o) => {
    const row = rowById.get(o.id)
    const g = (row?.gametora_json ? JSON.parse(row.gametora_json) : {}) as GameToraOutfitDetail
    const t = o.talent
    const a = o.aptitude
    return {
      id: o.id,
      gametora: row?.gametora_slug ?? '',
      rarity: o.rarity,
      runningStyle: o.runningStyle,
      releaseEn: o.releaseEn,
      releaseJp: o.releaseJp,
      talent: t ? [t.speed, t.stamina, t.power, t.guts, t.wit] : null,
      aptitude: a ? [a.turf, a.dirt, a.short, a.mile, a.medium, a.long, a.front, a.pace, a.late, a.end] : null,
      baseStats: statTuple(g.base_stats),
      fiveStarStats: statTuple(g.five_star_stats),
      skills: {
        unique: g.skills_unique ?? [],
        innate: g.skills_innate ?? [],
        awakening: g.skills_awakening_en ?? g.skills_awakening ?? [],
        event: g.skills_event ?? [],
      },
    }
  })
  const file: OutfitDetailFile = { outfits: details }
  // 差分が見やすいよう1衣装1行で書き出す
  fs.writeFileSync(DETAIL_OUTPUT_PATH, `{\n"outfits": [\n${file.outfits.map((d) => JSON.stringify(d)).join(',\n')}\n]\n}\n`)
  console.log(`[export] ${path.relative(ROOT, DETAIL_OUTPUT_PATH)}: ${details.length}件`)
}
