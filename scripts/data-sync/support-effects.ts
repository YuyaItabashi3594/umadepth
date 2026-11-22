import type { DatabaseSync } from 'node:sqlite'
import { fetchJson, GAMETORA_BASE } from './http.ts'
import { withTransaction } from './db.ts'
import { nowIso } from './text.ts'

const MANIFEST_URL = `${GAMETORA_BASE}/data/manifests/umamusume.json`

interface GameToraSupportEffect {
  id: number
  name_en?: string
  name_ja?: string
  symbol?: string
}

// 効果名はめったに増えないので、表が空のとき(と --force / --refresh-all)だけ取る
export async function syncSupportEffects(db: DatabaseSync, force: boolean) {
  const count = (db.prepare('SELECT count(*) AS c FROM support_effects').get() as { c: number }).c
  if (count > 0 && !force) {
    console.log(`[gametora] サポカ効果名: 取得済み(${count}件)のためスキップ`)
    return
  }
  const manifest = await fetchJson<Record<string, string>>(MANIFEST_URL)
  const hash = manifest.support_effects
  if (!hash) throw new Error('manifestにsupport_effectsが無い')
  const items = await fetchJson<GameToraSupportEffect[]>(`${GAMETORA_BASE}/data/umamusume/support_effects.${hash}.json`)
  const upsert = db.prepare(
    `INSERT INTO support_effects (id, name_en, name_ja, symbol, raw_json, fetched_at)
     VALUES (:id, :nameEn, :nameJa, :symbol, :raw, :fetchedAt)
     ON CONFLICT(id) DO UPDATE SET name_en = excluded.name_en, name_ja = excluded.name_ja,
       symbol = excluded.symbol, raw_json = excluded.raw_json, fetched_at = excluded.fetched_at`,
  )
  const fetchedAt = nowIso()
  withTransaction(db, () => {
    for (const item of items) {
      upsert.run({
        id: item.id,
        nameEn: item.name_en ?? null,
        nameJa: item.name_ja ?? null,
        symbol: item.symbol ?? null,
        raw: JSON.stringify(item),
        fetchedAt,
      })
    }
  })
  console.log(`[gametora] サポカ効果名: ${items.length}件`)
}
