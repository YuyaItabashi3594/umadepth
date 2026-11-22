import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { GAMETORA_BASE as BASE } from './http.ts'
import { ROOT } from './db.ts'
import { normalizeText, nowIso } from './text.ts'
import { downloadMissingImages, fetchItemData } from './gametora.ts'

const IMAGE_DIR = path.join(ROOT, 'public', 'images', 'outfits')

// itemData.aptitude の並び(芝,ダ,短,マ,中,長,逃,先,差,追)。100101で実データと一致を確認済み
const APTITUDE_COLUMNS = [
  'apt_turf',
  'apt_dirt',
  'apt_short',
  'apt_mile',
  'apt_medium',
  'apt_long',
  'apt_front',
  'apt_pace',
  'apt_late',
  'apt_end',
] as const

interface GameToraItemData {
  card_id: number
  title_jp?: string
  release?: string
  release_en?: string
  obtained?: string
  aptitude?: string[]
}

export async function syncOutfitGameTora(db: DatabaseSync, refreshAll: boolean) {
  const targets = db
    .prepare(
      `SELECT id, gametora_slug AS slug FROM outfits
       ${refreshAll ? '' : 'WHERE gametora_fetched_at IS NULL'} ORDER BY id`,
    )
    .all() as { id: number; slug: string }[]

  console.log(`[gametora] ページ取得対象: ${targets.length}着`)
  const setClause = APTITUDE_COLUMNS.map((col, i) => `${col} = :apt${i}`).join(', ')
  const stmt = db.prepare(
    `UPDATE outfits SET
       title_jp = :titleJp, release_jp = :releaseJp, release_en = :releaseEn, obtained = :obtained,
       ${setClause}, gametora_json = :raw, gametora_fetched_at = :fetchedAt
     WHERE id = :id`,
  )

  for (const [index, { id, slug }] of targets.entries()) {
    try {
      const item = await fetchItemData<GameToraItemData>(`${BASE}/umamusume/characters/${slug}`)
      if (item.card_id !== id) throw new Error(`card_id不一致 (${item.card_id})`)
      const aptitude = item.aptitude?.length === APTITUDE_COLUMNS.length ? item.aptitude : null
      if (!aptitude) console.warn(`  ${slug}: aptitudeの形式が想定外のためNULLで保存`)

      const params: Record<string, string | number | null> = {
        id,
        titleJp: item.title_jp ? normalizeText(item.title_jp) : null,
        releaseJp: item.release ?? null,
        releaseEn: item.release_en ?? null,
        obtained: item.obtained ?? null,
        raw: JSON.stringify(item),
        fetchedAt: nowIso(),
      }
      APTITUDE_COLUMNS.forEach((_, i) => (params[`apt${i}`] = aptitude?.[i] ?? null))
      stmt.run(params)
      console.log(`[gametora] ${index + 1}/${targets.length} ${slug}`)
    } catch (err) {
      // gametora_fetched_atがNULLのまま残るので次回再取得される
      console.warn(`[gametora] ${slug} 失敗: ${err instanceof Error ? err.message : err}`)
    }
  }
}

// 画像URLはid規則から組み立てられるのでページ解析は不要
export async function syncOutfitImages(db: DatabaseSync) {
  const rows = db
    .prepare(
      `SELECT o.id, c.game_id AS gameId FROM outfits o
       JOIN characters c ON c.id = o.character_id ORDER BY o.id`,
    )
    .all() as { id: number; gameId: number }[]
  const saved = await downloadMissingImages(
    '衣装',
    IMAGE_DIR,
    rows.map(({ id, gameId }) => ({
      id,
      url: `${BASE}/images/umamusume/characters/chara_stand_${gameId}_${id}.png`,
    })),
  )

  // 既存ファイル分も含めてimage_pathをファイル実態に合わせる
  const stmt = db.prepare('UPDATE outfits SET image_path = :imagePath WHERE id = :id')
  for (const { id } of rows) {
    stmt.run({ id, imagePath: saved.has(id) ? `/images/outfits/${id}.png` : null })
  }
}
