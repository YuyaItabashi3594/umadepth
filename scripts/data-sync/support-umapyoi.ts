import type { DatabaseSync } from 'node:sqlite'
import { fetchJson, UMAPYOI_BASE } from './http.ts'
import { isFresh, LIST_TTL_MS, logFetch, withTransaction } from './db.ts'
import { normalizeText, nowIso } from './text.ts'

interface SupportListItem {
  id: number
  chara_id: number
  gametora: string
  title_en: string | null
}

// 詳細API(/support/{id})の項目はGameToraのitemDataで全て取れるので、umapyoiは一覧だけ使う
export async function syncSupportList(db: DatabaseSync, force: boolean) {
  const endpoint = '/api/v1/support'
  if (!force && isFresh(db, endpoint, LIST_TTL_MS)) {
    console.log(`[umapyoi] ${endpoint} はTTL内なのでスキップ`)
    return
  }
  const items = await fetchJson<SupportListItem[]>(UMAPYOI_BASE + endpoint)
  const fetchedAt = nowIso()
  // GameTora由来のカラムは触らない。rarityはid先頭桁で仮置きし、GameToraの値で上書きされる
  const stmt = db.prepare(
    `INSERT INTO support_cards
       (id, chara_game_id, character_id, gametora_slug, rarity, title_umapyoi, list_json, fetched_at)
     VALUES
       (:id, :charaGameId, (SELECT id FROM characters WHERE game_id = :charaGameId),
        :slug, :rarity, :title, :raw, :fetchedAt)
     ON CONFLICT(id) DO UPDATE SET
       chara_game_id = excluded.chara_game_id, character_id = excluded.character_id,
       gametora_slug = excluded.gametora_slug, title_umapyoi = excluded.title_umapyoi,
       list_json = excluded.list_json, fetched_at = excluded.fetched_at`,
  )
  withTransaction(db, () => {
    for (const s of items) {
      stmt.run({
        id: s.id,
        charaGameId: s.chara_id,
        slug: s.gametora,
        rarity: Math.floor(s.id / 10000),
        title: s.title_en ? normalizeText(s.title_en) : null,
        raw: JSON.stringify(s),
        fetchedAt,
      })
    }
  })
  logFetch(db, endpoint, 200, items.length)
  console.log(`[umapyoi] support cards: ${items.length}件`)
}
