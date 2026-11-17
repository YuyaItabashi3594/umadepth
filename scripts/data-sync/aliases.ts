import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { ROOT, withTransaction } from './db.ts'

// 手入力データはDBが消えても困らないようseedファイル(コミット対象)を正とする
const ALIAS_TARGETS = {
  outfits: { seed: 'outfit_aliases.json', aliasTable: 'outfit_aliases', fkColumn: 'outfit_id' },
  support_cards: {
    seed: 'support_card_aliases.json',
    aliasTable: 'support_card_aliases',
    fkColumn: 'support_card_id',
  },
} as const

export function loadAliases(db: DatabaseSync, target: keyof typeof ALIAS_TARGETS) {
  const { seed, aliasTable, fkColumn } = ALIAS_TARGETS[target]
  const seedPath = path.join(ROOT, 'data', 'seed', seed)
  if (!fs.existsSync(seedPath)) {
    console.log(`[aliases] ${seed} が無いのでスキップ`)
    return
  }
  const entries = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as Record<string, number>
  const knownIds = new Set(
    (db.prepare(`SELECT id FROM ${target}`).all() as { id: number }[]).map((r) => r.id),
  )
  const insert = db.prepare(`INSERT INTO ${aliasTable} (alias, ${fkColumn}) VALUES (?, ?)`)

  let count = 0
  withTransaction(db, () => {
    db.exec(`DELETE FROM ${aliasTable}`)
    for (const [alias, id] of Object.entries(entries)) {
      if (!knownIds.has(id)) {
        console.warn(`[aliases] ${target} に無いid ${id} ('${alias}') をスキップ`)
        continue
      }
      insert.run(alias, id)
      count++
    }
  })
  console.log(`[aliases] ${aliasTable}: ${count}件`)
}
