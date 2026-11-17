import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { GAMETORA_BASE } from './http.ts'
import { ROOT } from './db.ts'
import { normalizeText, nowIso } from './text.ts'
import { downloadMissingImages, fetchItemData } from './gametora.ts'

const IMAGE_DIR = path.join(ROOT, 'public', 'images', 'support-cards')
// Rカードはガイドで使わないので画像はSR/SSRだけ保存する(データは全件持つ)
const IMAGE_MIN_RARITY = 2

interface GameToraSupportItem {
  support_id: number
  char_name?: string
  name_jp?: string
  rarity?: number
  type?: string
  title_ja?: string
  title_en?: string
  obtained?: string
  release?: string
  release_en?: string
}

export async function syncSupportGameTora(db: DatabaseSync, refreshAll: boolean) {
  const targets = db
    .prepare(
      `SELECT id, gametora_slug AS slug FROM support_cards
       ${refreshAll ? '' : 'WHERE gametora_fetched_at IS NULL'} ORDER BY id`,
    )
    .all() as { id: number; slug: string }[]

  console.log(`[gametora] サポカページ取得対象: ${targets.length}枚`)
  const stmt = db.prepare(
    `UPDATE support_cards SET
       rarity = coalesce(:rarity, rarity), type = :type, name_en = :nameEn, name_jp = :nameJp,
       title_en = :titleEn, title_jp = :titleJp, obtained = :obtained,
       release_jp = :releaseJp, release_en = :releaseEn,
       gametora_json = :raw, gametora_fetched_at = :fetchedAt
     WHERE id = :id`,
  )

  for (const [index, { id, slug }] of targets.entries()) {
    try {
      const item = await fetchItemData<GameToraSupportItem>(`${GAMETORA_BASE}/umamusume/supports/${slug}`)
      if (item.support_id !== id) throw new Error(`support_id不一致 (${item.support_id})`)
      stmt.run({
        id,
        rarity: item.rarity ?? null,
        type: item.type ?? null,
        nameEn: item.char_name ? normalizeText(item.char_name) : null,
        nameJp: item.name_jp ? normalizeText(item.name_jp) : null,
        titleEn: item.title_en ? normalizeText(item.title_en) : null,
        titleJp: item.title_ja ? normalizeText(item.title_ja) : null,
        obtained: item.obtained ?? null,
        releaseJp: item.release ?? null,
        releaseEn: item.release_en ?? null,
        raw: JSON.stringify(item),
        fetchedAt: nowIso(),
      })
      console.log(`[gametora] サポカ ${index + 1}/${targets.length} ${slug}`)
    } catch (err) {
      // gametora_fetched_atがNULLのまま残るので次回再取得される
      console.warn(`[gametora] ${slug} 失敗: ${err instanceof Error ? err.message : err}`)
    }
  }
}

// カード右上に重ねるタイプアイコン(70x70)。ゲーム内の並び順で番号が振られている
const TYPE_ICONS = { speed: '00', stamina: '01', power: '02', guts: '03', wit: '04', pals: '05', group: '06' }

export async function syncSupportTypeIcons() {
  await downloadMissingImages(
    'タイプアイコン',
    path.join(IMAGE_DIR, 'types'),
    Object.entries(TYPE_ICONS).map(([kind, no]) => ({
      id: kind,
      url: `${GAMETORA_BASE}/images/umamusume/icons/utx_ico_obtain_${no}.png`,
    })),
  )
}

// カード絵(300x400)。URLはid規則から組み立てられる
export async function syncSupportImages(db: DatabaseSync) {
  const rows = db
    .prepare('SELECT id, rarity FROM support_cards ORDER BY id')
    .all() as { id: number; rarity: number }[]
  const targets = rows
    .filter((r) => r.rarity >= IMAGE_MIN_RARITY)
    .map(({ id }) => ({ id, url: `https://media.gametora.com/umamusume/supports/full/small/${id}.png` }))
  const saved = await downloadMissingImages('サポカ', IMAGE_DIR, targets)

  const stmt = db.prepare('UPDATE support_cards SET image_path = :imagePath WHERE id = :id')
  for (const { id } of rows) {
    stmt.run({ id, imagePath: saved.has(id) ? `/images/support-cards/${id}.png` : null })
  }
}
