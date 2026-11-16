import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { ROOT, withTransaction } from './db.ts'

// 手入力データはDBが消えても困らないようseedファイル(コミット対象)を正とする
const SEED_PATH = path.join(ROOT, 'data', 'seed', 'outfit_aliases.json')

export function loadAliases(db: DatabaseSync) {
  if (!fs.existsSync(SEED_PATH)) {
    console.log('[aliases] seedファイルが無いのでスキップ')
    return
  }
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')) as Record<string, number>
  const knownIds = new Set(
    (db.prepare('SELECT id FROM outfits').all() as { id: number }[]).map((r) => r.id),
  )
  const insert = db.prepare('INSERT INTO outfit_aliases (alias, outfit_id) VALUES (?, ?)')

  let count = 0
  withTransaction(db, () => {
    db.exec('DELETE FROM outfit_aliases')
    for (const [alias, outfitId] of Object.entries(seed)) {
      if (!knownIds.has(outfitId)) {
        console.warn(`[aliases] 未登録の衣装id ${outfitId} ('${alias}') をスキップ`)
        continue
      }
      insert.run(alias, outfitId)
      count++
    }
  })
  console.log(`[aliases] ${count}件`)
}
