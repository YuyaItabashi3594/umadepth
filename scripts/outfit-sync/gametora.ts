import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { fetchBinary, fetchText, HttpError } from './http.ts'
import { ROOT } from './db.ts'
import { normalizeText, nowIso } from './text.ts'

const BASE = 'https://gametora.com'
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

function extractItemData(html: string): GameToraItemData {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match?.[1]) throw new Error('__NEXT_DATA__ が見つからない')
  const itemData = JSON.parse(match[1])?.props?.pageProps?.itemData as GameToraItemData | undefined
  if (!itemData) throw new Error('pageProps.itemData が見つからない')
  return itemData
}

export async function syncGameToraData(db: DatabaseSync, refreshAll: boolean) {
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
      const item = extractItemData(await fetchText(`${BASE}/umamusume/characters/${slug}`))
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

// 画像URLはid規則から組み立てられるのでページ解析は不要。ファイルの有無を正とする
export async function syncImages(db: DatabaseSync) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true })
  const rows = db
    .prepare(
      `SELECT o.id, c.game_id AS gameId FROM outfits o
       JOIN characters c ON c.id = o.character_id ORDER BY o.id`,
    )
    .all() as { id: number; gameId: number }[]
  const stmt = db.prepare('UPDATE outfits SET image_path = :imagePath WHERE id = :id')

  const missing = rows.filter((r) => !fs.existsSync(path.join(IMAGE_DIR, `${r.id}.png`)))
  console.log(`[gametora] 画像取得対象: ${missing.length}枚 (保存済み ${rows.length - missing.length}枚)`)

  for (const [index, { id, gameId }] of missing.entries()) {
    const url = `${BASE}/images/umamusume/characters/chara_stand_${gameId}_${id}.png`
    try {
      const { contentType, body } = await fetchBinary(url)
      if (!contentType.startsWith('image/png')) throw new Error(`想定外のContent-Type: ${contentType}`)
      fs.writeFileSync(path.join(IMAGE_DIR, `${id}.png`), body)
      console.log(`[gametora] 画像 ${index + 1}/${missing.length} ${id}.png`)
    } catch (err) {
      const reason = err instanceof HttpError ? `HTTP ${err.status}` : err instanceof Error ? err.message : err
      console.warn(`[gametora] 画像 ${id} 失敗: ${reason}`)
    }
  }

  // 既存ファイル分も含めてimage_pathをファイル実態に合わせる
  for (const { id } of rows) {
    const exists = fs.existsSync(path.join(IMAGE_DIR, `${id}.png`))
    stmt.run({ id, imagePath: exists ? `/images/outfits/${id}.png` : null })
  }
}
