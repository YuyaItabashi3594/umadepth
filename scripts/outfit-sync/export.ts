import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { AptitudeGrade, Outfit, RunningStyle } from '../../src/types/outfitType.ts'
import { ROOT } from './db.ts'

// 本番(静的サイト)はDBを読めないので、ビルドに含めるJSONへ書き出す
const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'outfits.json')

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
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rows.map(toOutfit), null, 2) + '\n', 'utf-8')
  console.log(`[export] ${path.relative(ROOT, OUTPUT_PATH)}: ${rows.length}件`)
}
