import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { SkillDataFile, SkillEntry, SkillRarity } from '../../src/types/skillType.ts'
import { skillKey, stripSkillGrade } from '../../src/utils/skillKey.ts'
import { ROOT } from './db.ts'

const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'skills.json')

interface SkillRow {
  id: number
  name_en: string | null
  name_en_gametora: string
  name_jp: string
  desc_en: string | null
  desc_jp: string | null
  rarity: number
  cost: number | null
  icon_id: number
  is_global: number
  parent_skill_id: number | null
}

export function exportSkills(db: DatabaseSync) {
  // 名前が重複したとき先勝ちにするため優先度順に並べる: 通常スキル > 継承固有、実装済み > 未実装、id昇順
  const rows = db
    .prepare(
      `SELECT id, name_en, name_en_gametora, name_jp, desc_en, desc_jp, rarity, cost, icon_id, is_global, parent_skill_id
       FROM skills ORDER BY (parent_skill_id IS NOT NULL), is_global DESC, id`,
    )
    .all() as unknown as SkillRow[]

  const skills: SkillEntry[] = rows.map((row) => ({
    id: row.id,
    // グローバル版のページなので英語優先。公式訳が無いもの(主に未実装)は日本語
    name: row.name_en ?? row.name_jp,
    nameJp: row.name_jp,
    desc: row.desc_en ?? row.desc_jp,
    descLang: row.desc_en ? 'en' : 'ja',
    rarity: row.rarity as SkillRarity,
    cost: row.cost,
    icon: row.icon_id,
    global: row.is_global === 1,
    inherited: row.parent_skill_id !== null,
  }))

  // 公式英語名・GameTora訳・日本語名のどれでも引けるようにする。
  // 完全一致を全件登録してから、◎○×を外したキーを空いている所にだけ足す
  const names = new Map<string, number>()
  const keysOf = (row: SkillRow) =>
    [row.name_en, row.name_en_gametora, row.name_jp].filter((n): n is string => !!n).map(skillKey)
  for (const row of rows) {
    for (const key of keysOf(row)) if (!names.has(key)) names.set(key, row.id)
  }
  for (const row of rows) {
    for (const key of keysOf(row).map(stripSkillGrade)) if (key && !names.has(key)) names.set(key, row.id)
  }

  const data: SkillDataFile = {
    skills: skills.toSorted((a, b) => a.id - b.id),
    names: [...names].toSorted(([a], [b]) => a.localeCompare(b)),
  }
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  // 件数が多いので1件1行にする(整形すると肥大化し、1行に詰めると差分が読めない)
  const lines = (items: unknown[]) => items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')
  const json = `{\n  "skills": [\n${lines(data.skills)}\n  ],\n  "names": [\n${lines(data.names)}\n  ]\n}\n`
  fs.writeFileSync(OUTPUT_PATH, json, 'utf-8')
  const kb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(0)
  console.log(`[export] ${path.relative(ROOT, OUTPUT_PATH)}: ${skills.length}件 / 名前索引${names.size}件 (${kb}KB)`)
}
