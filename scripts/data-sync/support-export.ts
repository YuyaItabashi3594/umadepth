import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type {
  SupportCardEntry,
  SupportCardIndexEntry,
  SupportCardIndexFile,
  SupportCardKind,
  SupportCardRarity,
} from '../../src/types/supportCardEntryType.ts'
import { ROOT } from './db.ts'

const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'supportCards.json')
// 記事ページでは全件(256KB)は重いので、<SupportCard>の表示に必要な項目だけの軽量版を別に出す
const INDEX_OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'supportCardIndex.json')

const RARITIES: Record<number, SupportCardRarity> = { 1: 'r', 2: 'sr', 3: 'ssr' }
// GameToraのtype表記 → サイト内のCardType
const KINDS: Record<string, SupportCardKind> = {
  speed: 'speed',
  stamina: 'stamina',
  power: 'power',
  guts: 'guts',
  intelligence: 'wit',
  wisdom: 'wit',
  wit: 'wit',
  friend: 'pals',
  group: 'group',
}

interface SupportCardRow {
  id: number
  chara_game_id: number
  rarity: number
  type: string | null
  name_en: string | null
  name_jp: string | null
  title_en: string | null
  title_jp: string | null
  title_umapyoi: string | null
  obtained: string | null
  release_jp: string | null
  release_en: string | null
  image_path: string | null
  gametora_slug: string
  character_slug: string | null
  character_name_en: string | null
  character_name_jp: string | null
  aliases: string | null
}

export function exportSupportCards(db: DatabaseSync) {
  const rows = db
    .prepare(
      `SELECT s.*, c.slug AS character_slug, c.name_en AS character_name_en, c.name_jp AS character_name_jp,
         (SELECT group_concat(a.alias, char(10)) FROM support_card_aliases a WHERE a.support_card_id = s.id) AS aliases
       FROM support_cards s LEFT JOIN characters c ON c.id = s.character_id
       ORDER BY s.id`,
    )
    .all() as unknown as SupportCardRow[]

  const unknownTypes = new Set<string>()
  const entries: SupportCardEntry[] = rows.map((row) => {
    const kind = row.type ? KINDS[row.type] : undefined
    if (row.type && !kind) unknownTypes.add(row.type)
    return {
      id: row.id,
      gameId: row.chara_game_id,
      characterSlug: row.character_slug,
      name: {
        // GameToraのchar_nameを優先(グループ名が入るため)。未取得ならキャラ一覧→slug
        en: row.name_en ?? row.character_name_en ?? row.gametora_slug,
        jp: row.name_jp ?? row.character_name_jp,
      },
      title: { en: row.title_en ?? row.title_umapyoi, jp: row.title_jp },
      rarity: RARITIES[row.rarity] ?? 'r',
      type: kind ?? null,
      obtained: row.obtained,
      releaseJp: row.release_jp,
      releaseEn: row.release_en,
      image: row.image_path,
      aliases: row.aliases ? row.aliases.split('\n') : [],
    }
  })
  if (unknownTypes.size > 0) {
    console.warn(`[export] 未対応のサポカtype: ${[...unknownTypes].join(', ')} (typeはnullで出力)`)
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf-8')
  console.log(`[export] ${path.relative(ROOT, OUTPUT_PATH)}: ${entries.length}件`)

  // 画像の無いカード(R)は記事で使わないので、通称が付いているものだけ残す
  const cards: SupportCardIndexEntry[] = entries
    .filter((e) => e.image || e.aliases.length > 0)
    .map((e) => ({
      id: e.id,
      name: e.name.en,
      title: e.title.en ?? e.title.jp,
      rarity: e.rarity,
      type: e.type,
      image: e.image,
    }))
  const aliases = entries
    .flatMap((e) => e.aliases.map((alias): [string, number] => [alias, e.id]))
    .toSorted(([a], [b]) => a.localeCompare(b))
  const index: SupportCardIndexFile = { cards, aliases }
  // 1件1行(整形すると肥大化し、1行に詰めると差分が読めない)
  const lines = (items: unknown[]) => items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')
  const json = `{\n  "cards": [\n${lines(index.cards)}\n  ],\n  "aliases": [\n${lines(index.aliases)}\n  ]\n}\n`
  fs.writeFileSync(INDEX_OUTPUT_PATH, json, 'utf-8')
  const kb = (fs.statSync(INDEX_OUTPUT_PATH).size / 1024).toFixed(0)
  console.log(`[export] ${path.relative(ROOT, INDEX_OUTPUT_PATH)}: ${cards.length}件 / 通称${aliases.length}件 (${kb}KB)`)
}
