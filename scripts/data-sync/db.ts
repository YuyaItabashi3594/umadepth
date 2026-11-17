import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export const ROOT = path.resolve(import.meta.dirname, '..', '..')
export const DB_PATH = path.join(ROOT, 'data', 'umadepth.db')

// APIとseedからいつでも再構築できるキャッシュなので、DBファイル自体はコミットしない
const SCHEMA = `
CREATE TABLE IF NOT EXISTS characters (
  id           INTEGER PRIMARY KEY,           -- umapyoi web id (= outfit.chara_web_id)
  game_id      INTEGER UNIQUE,                -- ゲーム内chara_id (= outfit.chara_game_id)。関係者などはNULL
  slug         TEXT NOT NULL UNIQUE,          -- name_en_internal (admirevega)
  name_en      TEXT NOT NULL,                 -- 正規化済み
  name_jp      TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('umamusume', 'staff')),
  raw_json     TEXT NOT NULL,
  fetched_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outfits (
  id                   INTEGER PRIMARY KEY,   -- 100101 (game_id*100+連番)
  character_id         INTEGER NOT NULL REFERENCES characters(id),
  gametora_slug        TEXT NOT NULL UNIQUE,  -- '100101-special-week'
  title                TEXT NOT NULL,         -- umapyoi一覧のtitle(未翻訳だと日本語)。正規化済み
  title_en             TEXT,                  -- umapyoi詳細
  title_jp             TEXT,                  -- GameTora
  running_style        INTEGER CHECK (running_style BETWEEN 1 AND 4),  -- 1逃げ 2先行 3差し 4追込
  default_rarity       INTEGER,
  talent_speed         INTEGER,
  talent_stamina       INTEGER,
  talent_power         INTEGER,
  talent_guts          INTEGER,
  talent_wit           INTEGER,
  is_limited           INTEGER NOT NULL DEFAULT 0,
  apt_turf             TEXT,                  -- 適性(S〜G)。GameTora
  apt_dirt             TEXT,
  apt_short            TEXT,
  apt_mile             TEXT,
  apt_medium           TEXT,
  apt_long             TEXT,
  apt_front            TEXT,
  apt_pace             TEXT,
  apt_late             TEXT,
  apt_end              TEXT,
  release_jp           TEXT,                  -- YYYY-MM-DD
  release_en           TEXT,                  -- グローバル版実装日。未実装ならNULL
  obtained             TEXT,                  -- 'gacha' など
  image_path           TEXT,                  -- public配下のパス('/images/outfits/100101.png')
  list_json            TEXT NOT NULL,
  detail_json          TEXT,
  gametora_json        TEXT,
  fetched_at           TEXT NOT NULL,
  detail_fetched_at    TEXT,                  -- NULLのものがumapyoi詳細の取得対象
  gametora_fetched_at  TEXT                   -- NULLのものがGameToraの取得対象
);
CREATE INDEX IF NOT EXISTS idx_outfits_character ON outfits(character_id);

CREATE TABLE IF NOT EXISTS outfit_aliases (
  alias      TEXT PRIMARY KEY,                -- 記事で使う通称 ('Wedding Curren Chan')
  outfit_id  INTEGER NOT NULL REFERENCES outfits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_cards (
  id                   INTEGER PRIMARY KEY,   -- 30028 (先頭桁 1=R 2=SR 3=SSR)
  chara_game_id        INTEGER NOT NULL,      -- umapyoiのchara_id。グループカードは代表キャラ等で意味を持たない
  character_id         INTEGER REFERENCES characters(id),  -- game_id一致で解決。キャラ一覧に無い(Yayoi等)はNULL
  gametora_slug        TEXT NOT NULL UNIQUE,  -- '30028-kitasan-black'
  rarity               INTEGER NOT NULL CHECK (rarity BETWEEN 1 AND 3),  -- 1=R 2=SR 3=SSR
  title_umapyoi        TEXT,                  -- umapyoi一覧のtitle_en(非公式訳のことがある)。NULLあり
  type                 TEXT,                  -- GameToraのtype('speed'等)をそのまま
  name_en              TEXT,                  -- GameToraのchar_name。グループカードはグループ名
  name_jp              TEXT,
  title_en             TEXT,                  -- GameTora。グローバル版の公式名
  title_jp             TEXT,
  obtained             TEXT,
  release_jp           TEXT,
  release_en           TEXT,                  -- グローバル版実装日。未実装ならNULL
  image_path           TEXT,                  -- '/images/support-cards/30028.png'。SR/SSRのみ
  list_json            TEXT NOT NULL,
  gametora_json        TEXT,                  -- itemData(効果・ヒントスキル等を含む)
  fetched_at           TEXT NOT NULL,
  gametora_fetched_at  TEXT                   -- NULLのものがGameToraの取得対象
);
CREATE INDEX IF NOT EXISTS idx_support_cards_character ON support_cards(character_id);

CREATE TABLE IF NOT EXISTS support_card_aliases (
  alias            TEXT PRIMARY KEY,          -- 記事/既存コードでの呼び名
  support_card_id  INTEGER NOT NULL REFERENCES support_cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
  id                INTEGER PRIMARY KEY,      -- 200512。継承固有はGameToraのgene_version.id(9xxxxx)
  name_en           TEXT,                     -- 公式英語名。グローバル版未実装で訳が無ければNULL
  name_en_gametora  TEXT NOT NULL,            -- GameTora独自訳(enname)。記事の名前引き用
  name_jp           TEXT NOT NULL,
  desc_en           TEXT,                     -- 公式英語説明。無ければNULL
  desc_jp           TEXT,                     -- 継承固有はデータに無いのでNULL
  rarity            INTEGER NOT NULL,         -- 1白 2金 3-5固有 6進化 (GameToraの値そのまま)
  cost              INTEGER,                  -- SP。固有/進化はNULL
  icon_id           INTEGER NOT NULL,
  is_global         INTEGER NOT NULL,         -- GameToraのunreleasedに'en'が無ければ1
  parent_skill_id   INTEGER,                  -- 継承固有の元スキル
  raw_json          TEXT NOT NULL,
  fetched_at        TEXT NOT NULL
);

-- 衣装/サポカのgametora_jsonから毎回作り直す派生テーブル
CREATE TABLE IF NOT EXISTS outfit_skills (
  outfit_id  INTEGER NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  skill_id   INTEGER NOT NULL REFERENCES skills(id),
  kind       TEXT NOT NULL CHECK (kind IN ('unique', 'innate', 'awakening', 'event')),
  sort       INTEGER NOT NULL,
  PRIMARY KEY (outfit_id, kind, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_outfit_skills_skill ON outfit_skills(skill_id);

CREATE TABLE IF NOT EXISTS support_card_skills (
  support_card_id  INTEGER NOT NULL REFERENCES support_cards(id) ON DELETE CASCADE,
  skill_id         INTEGER NOT NULL REFERENCES skills(id),
  kind             TEXT NOT NULL CHECK (kind IN ('hint', 'event')),
  sort             INTEGER NOT NULL,
  PRIMARY KEY (support_card_id, kind, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_support_card_skills_skill ON support_card_skills(skill_id);

CREATE TABLE IF NOT EXISTS api_fetch_log (
  endpoint     TEXT PRIMARY KEY,
  fetched_at   TEXT NOT NULL,
  http_status  INTEGER,
  item_count   INTEGER
);
`

export function openDb(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
  db.exec(SCHEMA)
  return db
}

export function withTransaction(db: DatabaseSync, fn: () => void) {
  db.exec('BEGIN')
  try {
    fn()
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function logFetch(db: DatabaseSync, endpoint: string, status: number, itemCount: number | null) {
  db.prepare(
    `INSERT INTO api_fetch_log (endpoint, fetched_at, http_status, item_count)
     VALUES (:endpoint, :fetchedAt, :status, :itemCount)
     ON CONFLICT(endpoint) DO UPDATE SET
       fetched_at = excluded.fetched_at, http_status = excluded.http_status, item_count = excluded.item_count`,
  ).run({ endpoint, fetchedAt: new Date().toISOString(), status, itemCount })
}

export const LIST_TTL_MS = 24 * 60 * 60 * 1000

// 一覧系エンドポイントをTTL内に再取得しないための判定
export function isFresh(db: DatabaseSync, endpoint: string, ttlMs: number): boolean {
  const row = db
    .prepare('SELECT fetched_at FROM api_fetch_log WHERE endpoint = ? AND http_status = 200')
    .get(endpoint) as { fetched_at: string } | undefined
  if (!row) return false
  return Date.now() - new Date(row.fetched_at).getTime() < ttlMs
}
