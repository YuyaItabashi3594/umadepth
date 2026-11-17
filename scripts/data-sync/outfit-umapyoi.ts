import type { DatabaseSync } from 'node:sqlite'
import { fetchJson, HttpError, UMAPYOI_BASE as BASE } from './http.ts'
import { isFresh, LIST_TTL_MS, logFetch, withTransaction } from './db.ts'
import { normalizeText, nowIso } from './text.ts'
import { syncCharacters } from './characters.ts'

interface OutfitListItem {
  id: number
  chara_game_id: number
  chara_web_id: number
  gametora: string
  title: string
}

interface OutfitDetail {
  id: number
  title_en: string | null
  running_style: number | null
  default_rarity: number | null
  limited_chara: number | null
  talent_speed: number | null
  talent_stamina: number | null
  talent_pow: number | null
  talent_guts: number | null
  talent_wiz: number | null
}

export async function syncOutfitList(db: DatabaseSync, force: boolean) {
  const endpoint = '/api/v1/outfit'
  if (!force && isFresh(db, endpoint, LIST_TTL_MS)) {
    console.log(`[umapyoi] ${endpoint} はTTL内なのでスキップ`)
    return
  }
  const items = await fetchJson<OutfitListItem[]>(BASE + endpoint)

  // 新キャラの衣装が先に来た場合、FK違反になるのでキャラ一覧をTTL無視で取り直す
  const knownIds = new Set(
    (db.prepare('SELECT id FROM characters').all() as { id: number }[]).map((r) => r.id),
  )
  if (items.some((o) => !knownIds.has(o.chara_web_id))) {
    console.log('[umapyoi] 未登録キャラの衣装があるためキャラ一覧を再取得')
    await syncCharacters(db, true)
  }

  const fetchedAt = nowIso()
  // 詳細/GameTora由来のカラムは触らない(取り直しを避ける)
  const stmt = db.prepare(
    `INSERT INTO outfits (id, character_id, gametora_slug, title, list_json, fetched_at)
     VALUES (:id, :characterId, :slug, :title, :raw, :fetchedAt)
     ON CONFLICT(id) DO UPDATE SET
       character_id = excluded.character_id, gametora_slug = excluded.gametora_slug,
       title = excluded.title, list_json = excluded.list_json, fetched_at = excluded.fetched_at`,
  )
  withTransaction(db, () => {
    for (const o of items) {
      stmt.run({
        id: o.id,
        characterId: o.chara_web_id,
        slug: o.gametora,
        title: normalizeText(o.title),
        raw: JSON.stringify(o),
        fetchedAt,
      })
    }
  })
  logFetch(db, endpoint, 200, items.length)
  console.log(`[umapyoi] outfits: ${items.length}件`)
}

// /outfit/{id} は500を返すため、キャラ単位のエンドポイントで詳細を取る
export async function syncOutfitDetails(db: DatabaseSync, refreshAll: boolean) {
  const targets = db
    .prepare(
      `SELECT DISTINCT c.game_id AS gameId
       FROM outfits o JOIN characters c ON c.id = o.character_id
       WHERE c.game_id IS NOT NULL ${refreshAll ? '' : 'AND o.detail_fetched_at IS NULL'}
       ORDER BY c.game_id`,
    )
    .all() as { gameId: number }[]

  console.log(`[umapyoi] 詳細取得対象: ${targets.length}キャラ`)
  const stmt = db.prepare(
    `UPDATE outfits SET
       title_en = :titleEn, running_style = :runningStyle, default_rarity = :rarity,
       is_limited = :limited, talent_speed = :speed, talent_stamina = :stamina,
       talent_power = :power, talent_guts = :guts, talent_wit = :wit,
       detail_json = :raw, detail_fetched_at = :fetchedAt
     WHERE id = :id`,
  )

  for (const [index, { gameId }] of targets.entries()) {
    const endpoint = `/api/v1/outfit/character/${gameId}`
    try {
      const details = await fetchJson<OutfitDetail[]>(BASE + endpoint)
      const fetchedAt = nowIso()
      withTransaction(db, () => {
        for (const d of details) {
          const result = stmt.run({
            id: d.id,
            titleEn: d.title_en ? normalizeText(d.title_en) : null,
            runningStyle: d.running_style ?? null,
            rarity: d.default_rarity ?? null,
            limited: d.limited_chara ? 1 : 0,
            speed: d.talent_speed ?? null,
            stamina: d.talent_stamina ?? null,
            power: d.talent_pow ?? null,
            guts: d.talent_guts ?? null,
            wit: d.talent_wiz ?? null,
            raw: JSON.stringify(d),
            fetchedAt,
          })
          if (result.changes === 0) console.warn(`  一覧に無い衣装id ${d.id} (chara ${gameId}) をスキップ`)
        }
      })
      logFetch(db, endpoint, 200, details.length)
      console.log(`[umapyoi] ${index + 1}/${targets.length} chara ${gameId}: ${details.length}着`)
    } catch (err) {
      // 1キャラの失敗で全体を止めない。detail_fetched_atがNULLのまま残るので次回再取得される
      logFetch(db, endpoint, err instanceof HttpError ? err.status : 0, null)
      console.warn(`[umapyoi] chara ${gameId} 失敗: ${err instanceof Error ? err.message : err}`)
    }
  }
}
