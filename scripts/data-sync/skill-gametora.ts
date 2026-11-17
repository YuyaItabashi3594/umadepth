import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { fetchJson, GAMETORA_BASE } from './http.ts'
import { isFresh, LIST_TTL_MS, logFetch, ROOT, withTransaction } from './db.ts'
import { normalizeText, nowIso } from './text.ts'
import { downloadMissingImages } from './gametora.ts'

// スキル一覧ページはクライアント側で /data/umamusume/skills.{hash}.json (全件1ファイル) を読んでいる。
// hashはmanifestに載っていて、データ更新時だけ変わる
const MANIFEST_URL = `${GAMETORA_BASE}/data/manifests/umamusume.json`
const ICON_DIR = path.join(ROOT, 'public', 'images', 'skills')

interface GameToraGeneVersion {
  id: number
  name_en?: string
  desc_en?: string
  rarity: number
  cost?: number
  iconid: number
  parent_skills?: number[]
}

interface GameToraSkill {
  id: number
  name_en?: string // 公式英語名(グローバル版実装済み or データ内に訳あり)
  enname: string // GameTora独自訳
  jpname: string
  desc_en?: string
  jpdesc?: string
  rarity: number
  cost?: number
  iconid: number
  unreleased?: string[] // 未実装サーバー ('en' = グローバル版)
  gene_version?: GameToraGeneVersion
}

const text = (value: string | undefined) => (value ? normalizeText(value) : null)

export async function syncSkills(db: DatabaseSync, force: boolean, refreshAll: boolean) {
  if (!force && !refreshAll && isFresh(db, MANIFEST_URL, LIST_TTL_MS)) {
    console.log('[gametora] スキル: manifestがTTL内のためスキップ')
    return
  }
  const manifest = await fetchJson<Record<string, string>>(MANIFEST_URL)
  const hash = manifest.skills
  if (!hash) throw new Error('manifestにskillsが無い')
  const skillsUrl = `${GAMETORA_BASE}/data/umamusume/skills.${hash}.json`

  // 同じhashを取得済みなら中身も同じ
  if (refreshAll || !isFresh(db, skillsUrl, Number.POSITIVE_INFINITY)) {
    const items = await fetchJson<GameToraSkill[]>(skillsUrl)
    const count = upsertSkills(db, items)
    logFetch(db, skillsUrl, 200, count)
    console.log(`[gametora] スキル: ${count}件 (継承固有含む)`)
  } else {
    console.log(`[gametora] スキル: hash ${hash} は取得済みのためスキップ`)
  }
  // スキル本体の取得に失敗したらmanifestも未取得扱いにして次回やり直す
  logFetch(db, MANIFEST_URL, 200, Object.keys(manifest).length)
}

function upsertSkills(db: DatabaseSync, items: GameToraSkill[]): number {
  const stmt = db.prepare(
    `INSERT INTO skills (id, name_en, name_en_gametora, name_jp, desc_en, desc_jp, rarity, cost, icon_id,
       is_global, parent_skill_id, raw_json, fetched_at)
     VALUES (:id, :nameEn, :nameEnGametora, :nameJp, :descEn, :descJp, :rarity, :cost, :iconId,
       :isGlobal, :parentId, :raw, :fetchedAt)
     ON CONFLICT(id) DO UPDATE SET
       name_en = excluded.name_en, name_en_gametora = excluded.name_en_gametora, name_jp = excluded.name_jp,
       desc_en = excluded.desc_en, desc_jp = excluded.desc_jp, rarity = excluded.rarity, cost = excluded.cost,
       icon_id = excluded.icon_id, is_global = excluded.is_global, parent_skill_id = excluded.parent_skill_id,
       raw_json = excluded.raw_json, fetched_at = excluded.fetched_at`,
  )
  const fetchedAt = nowIso()
  let count = 0
  withTransaction(db, () => {
    for (const item of items) {
      const isGlobal = item.unreleased?.includes('en') ? 0 : 1
      stmt.run({
        id: item.id,
        nameEn: text(item.name_en),
        nameEnGametora: normalizeText(item.enname),
        nameJp: normalizeText(item.jpname),
        descEn: text(item.desc_en),
        descJp: text(item.jpdesc),
        rarity: item.rarity,
        cost: item.cost ?? null,
        iconId: item.iconid,
        isGlobal,
        parentId: null,
        raw: JSON.stringify(item),
        fetchedAt,
      })
      count++

      // 継承固有は親スキルの中にだけ入っているので別行にする。名前と実装状況は親と同じ
      const gene = item.gene_version
      if (gene) {
        stmt.run({
          id: gene.id,
          nameEn: text(gene.name_en),
          nameEnGametora: normalizeText(item.enname),
          nameJp: normalizeText(item.jpname),
          descEn: text(gene.desc_en),
          descJp: null,
          rarity: gene.rarity,
          cost: gene.cost ?? null,
          iconId: gene.iconid,
          isGlobal,
          parentId: gene.parent_skills?.[0] ?? item.id,
          raw: JSON.stringify(gene),
          fetchedAt,
        })
        count++
      }
    }
  })
  return count
}

// 64x64のアイコン。種類が少ない(百数十)ので全部保存する
export async function syncSkillIcons(db: DatabaseSync) {
  const iconIds = (db.prepare('SELECT DISTINCT icon_id FROM skills ORDER BY icon_id').all() as { icon_id: number }[]).map(
    (r) => r.icon_id,
  )
  await downloadMissingImages(
    'スキルアイコン',
    ICON_DIR,
    iconIds.map((id) => ({ id, url: `${GAMETORA_BASE}/images/umamusume/skill_icons/utx_ico_skill_${id}.png` })),
  )
}

interface OutfitSkillsJson {
  skills_unique?: number[]
  skills_innate?: number[]
  skills_awakening?: number[]
  skills_awakening_en?: number[] // グローバル版は覚醒スキルが少ないことがある
  skills_event?: number[]
}

interface SupportSkillsJson {
  hints?: { hint_skills?: number[] }
  event_skills?: number[]
}

// 外部アクセスなし。取得済みのgametora_jsonから衣装/サポカ⇔スキルの対応を作り直す
export function rebuildSkillRelations(db: DatabaseSync) {
  const known = new Set((db.prepare('SELECT id FROM skills').all() as { id: number }[]).map((r) => r.id))
  if (known.size === 0) {
    console.warn('[skills] skillsが空のため対応表を作れない (data:sync -- skills を先に実行)')
    return
  }
  const missing = new Set<number>()

  const insertOutfit = db.prepare(
    'INSERT OR IGNORE INTO outfit_skills (outfit_id, skill_id, kind, sort) VALUES (?, ?, ?, ?)',
  )
  const insertSupport = db.prepare(
    'INSERT OR IGNORE INTO support_card_skills (support_card_id, skill_id, kind, sort) VALUES (?, ?, ?, ?)',
  )
  const insertAll = (ids: number[] | undefined, insert: (skillId: number, sort: number) => void) => {
    ;(ids ?? []).forEach((skillId, sort) => {
      if (known.has(skillId)) insert(skillId, sort)
      else missing.add(skillId)
    })
  }

  let outfitRows = 0
  let supportRows = 0
  withTransaction(db, () => {
    db.exec('DELETE FROM outfit_skills; DELETE FROM support_card_skills;')

    const outfits = db.prepare('SELECT id, gametora_json FROM outfits WHERE gametora_json IS NOT NULL').all() as {
      id: number
      gametora_json: string
    }[]
    for (const { id, gametora_json } of outfits) {
      const o = JSON.parse(gametora_json) as OutfitSkillsJson
      const kinds = {
        unique: o.skills_unique,
        innate: o.skills_innate,
        awakening: o.skills_awakening_en ?? o.skills_awakening,
        event: o.skills_event,
      }
      for (const [kind, ids] of Object.entries(kinds)) {
        insertAll(ids, (skillId, sort) => {
          outfitRows += Number(insertOutfit.run(id, skillId, kind, sort).changes)
        })
      }
    }

    const supports = db
      .prepare('SELECT id, gametora_json FROM support_cards WHERE gametora_json IS NOT NULL')
      .all() as { id: number; gametora_json: string }[]
    for (const { id, gametora_json } of supports) {
      const s = JSON.parse(gametora_json) as SupportSkillsJson
      for (const [kind, ids] of Object.entries({ hint: s.hints?.hint_skills, event: s.event_skills })) {
        insertAll(ids, (skillId, sort) => {
          supportRows += Number(insertSupport.run(id, skillId, kind, sort).changes)
        })
      }
    }
  })

  console.log(`[skills] 対応表: 衣装 ${outfitRows}件 / サポカ ${supportRows}件`)
  if (missing.size > 0) {
    console.warn(`[skills] skillsに無いスキルid ${missing.size}件: ${[...missing].slice(0, 10).join(', ')}`)
  }
}
