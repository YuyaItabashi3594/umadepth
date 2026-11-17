import type { DatabaseSync } from 'node:sqlite'
import { fetchJson, UMAPYOI_BASE } from './http.ts'
import { isFresh, LIST_TTL_MS, logFetch, withTransaction } from './db.ts'
import { normalizeText, nowIso } from './text.ts'

interface CharacterListItem {
  id: number
  game_id: number | null
  name_en: string
  name_en_internal: string
  name_jp: string
  category_label_en: string
}

// 衣装/サポカ両方の親になるキャラ一覧
export async function syncCharacters(db: DatabaseSync, force: boolean) {
  const endpoint = '/api/v1/character/list'
  if (!force && isFresh(db, endpoint, LIST_TTL_MS)) {
    console.log(`[umapyoi] ${endpoint} はTTL内なのでスキップ`)
    return
  }
  const items = await fetchJson<CharacterListItem[]>(UMAPYOI_BASE + endpoint)
  const fetchedAt = nowIso()
  const stmt = db.prepare(
    `INSERT INTO characters (id, game_id, slug, name_en, name_jp, category, raw_json, fetched_at)
     VALUES (:id, :gameId, :slug, :nameEn, :nameJp, :category, :raw, :fetchedAt)
     ON CONFLICT(id) DO UPDATE SET
       game_id = excluded.game_id, slug = excluded.slug, name_en = excluded.name_en,
       name_jp = excluded.name_jp, category = excluded.category,
       raw_json = excluded.raw_json, fetched_at = excluded.fetched_at`,
  )
  withTransaction(db, () => {
    for (const c of items) {
      stmt.run({
        id: c.id,
        gameId: c.game_id ?? null,
        slug: c.name_en_internal,
        nameEn: normalizeText(c.name_en),
        nameJp: normalizeText(c.name_jp),
        category: c.category_label_en === 'Umamusume' ? 'umamusume' : 'staff',
        raw: JSON.stringify(c),
        fetchedAt,
      })
    }
  })
  logFetch(db, endpoint, 200, items.length)
  console.log(`[umapyoi] characters: ${items.length}件`)
}
