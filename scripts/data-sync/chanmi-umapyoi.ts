import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import sharp from 'sharp'
import { fetchBinary, fetchJson, HttpError, UMAPYOI_BASE } from './http.ts'
import { isFresh, LIST_TTL_MS, logFetch, ROOT, withTransaction } from './db.ts'
import { nowIso } from './text.ts'
import {
  CATEGORIES,
  chanmiSlugOf,
  parseChanmiSlug,
  seriesOf,
  ZODIACS,
  type SeriesKey,
} from '../../src/utils/championsMeeting.ts'

// 公式ニュースの検索API。英語版は1語なら通る(複数語の 'Champions Meeting' は500になる)
const NEWS_EN_URL = `${UMAPYOI_BASE}/api/v1/en/news/search/Champions`
const NEWS_JP_URL = `${UMAPYOI_BASE}/api/v1/news/search/${encodeURIComponent('チャンピオンズミーティング')}`
const BANNER_DIR = path.join(ROOT, 'public', 'images', 'chanmi')
const ARTICLE_DIR = path.join(ROOT, 'src', 'views', 'chanmi')
// 開催期間は約6日。開始からこの日数以内なら「これから/開催中」として記事が無くてもバナーを取る
const UPCOMING_GRACE_DAYS = 7
// グローバル版で未告知の開催を、日本版の告知から何件先まで載せるか
const FUTURE_LIMIT = 6

interface NewsPost {
  announce_id: number
  title: string
  message: string
  image: string | null
  post_at: number // unix秒
}

type Lang = 'en' | 'ja'
type PostKind = 'here' | 'coming'

interface CmPost {
  lang: Lang
  announceId: number
  series: SeriesKey
  kind: PostKind
  postAt: number
  image: string | null
  message: string
  code: string | null // バナーのファイル名 banner_303{1=開催中|2=予告}{XXYY} のXXYY。予告と開催中で同じ値
  codeRound: number | null // 星座シリーズならXXYY = 星座番号+回数なので回数が読める
}

interface CmEvent {
  series: SeriesKey
  round: number
  posts: Partial<Record<`${Lang}_${PostKind}`, CmPost>>
  ids: Set<number> // この開催に振られた告知ID(英語版/日本版、予告が複数あれば全部)
}

const normalizeTitle = (title: string) => title.replace(/&nbsp;| /g, ' ')

function bannerCode(image: string | null, series: SeriesKey) {
  const digits = image?.match(/banner_303[12](\d{4,})(?=[_.])/)?.[1]
  const code = digits ? digits.slice(-4) : null
  const zodiacIndex = ZODIACS.findIndex((z) => z.key === series)
  const codeRound =
    code && zodiacIndex !== -1 && Number(code.slice(0, 2)) === zodiacIndex + 1 && Number(code.slice(2)) > 0
      ? Number(code.slice(2))
      : null
  return { code, codeRound }
}

// 英語版タイトル例: 'The race event Champions Meeting: Leo Cup is here!' / 'Champions Meeting: Gemini Cup coming in early June!'
// リーグ選択の告知('league selection period')はバナーの使い回しがあるので使わない。
// 英語版は日本版と同じannounce_idで同じ告知を出すので、対になる日本版があればタイトルの書式に関係なくそちらの解釈に従う
// (星座名をやめた後の英語版タイトルの書式はまだ分からない)
function parseEnPost(post: NewsPost, jpById: Map<number, CmPost>): CmPost | null {
  const twin = jpById.get(post.announce_id)
  if (twin) {
    return { ...twin, lang: 'en', postAt: post.post_at, image: post.image, message: post.message, ...bannerCode(post.image, twin.series) }
  }
  const title = normalizeTitle(post.title)
  const series = seriesOf(title.match(/Champions Meeting:?\s+"?(\w+)/)?.[1]?.toLowerCase() ?? '')?.key
  if (!series || /league selection/i.test(title)) return null
  const kind: PostKind | null = /is here/i.test(title) ? 'here' : /coming/i.test(title) ? 'coming' : null
  if (!kind) return null
  return { lang: 'en', announceId: post.announce_id, series, kind, postAt: post.post_at, image: post.image, message: post.message, ...bannerCode(post.image, series) }
}

// 日本版タイトル例: 'レースイベント「チャンピオンズミーティング レオ杯」開催！' / '6/13「チャンピオンズミーティング MILE」開催予定！'
function parseJpPost(post: NewsPost): CmPost | null {
  const title = normalizeTitle(post.title)
  const name = title.match(/「チャンピオンズミーティング\s*([^」]+?)杯?」/)?.[1]?.trim()
  if (!name || /参加リーグ/.test(title)) return null
  const series = ZODIACS.find((z) => z.jp === name)?.key ?? CATEGORIES.find((c) => c.label === name.toUpperCase())?.key
  if (!series) return null
  const kind: PostKind | null = /開催予定|開催決定/.test(title) ? 'coming' : /開催[！!]/.test(title) ? 'here' : null
  if (!kind) return null
  return { lang: 'ja', announceId: post.announce_id, series, kind, postAt: post.post_at, image: post.image, message: post.message, ...bannerCode(post.image, series) }
}

// 同じ言語の告知に (シリーズ, 回数) を振る。
// 開催中告知: ファイル名から読めればそれ、読めなければ「それより前の同シリーズ開催中告知の数 + 1」。
// 予告: 同じバナー番号の開催中告知があればそれと同じ回、無ければ同様に数える(まだ開催前なので次の回)
function assignRounds(posts: CmPost[]): Map<CmPost, number> {
  const rounds = new Map<CmPost, number>()
  const heres = posts.filter((p) => p.kind === 'here').sort((a, b) => a.postAt - b.postAt)
  const heldBefore = (p: CmPost) => heres.filter((h) => h.series === p.series && h.postAt < p.postAt).length
  for (const here of heres) rounds.set(here, here.codeRound ?? heldBefore(here) + 1)
  for (const coming of posts.filter((p) => p.kind === 'coming')) {
    const twin = heres.find((h) => h.series === coming.series && h.code !== null && h.code === coming.code && h.postAt >= coming.postAt)
    rounds.set(coming, (twin && rounds.get(twin)) ?? coming.codeRound ?? heldBefore(coming) + 1)
  }
  return rounds
}

function groupEvents(enPosts: CmPost[], jpPosts: CmPost[]): CmEvent[] {
  const jpRounds = assignRounds(jpPosts)
  const jpById = new Map(jpPosts.map((p) => [p.announceId, p]))
  // 英語版は日本版と同じannounce_idで同じ告知を出している(2022年以降分)。対になる日本版があればその回に揃える
  const enOnly = enPosts.filter((p) => !jpById.has(p.announceId))
  const enRounds = assignRounds(enOnly)
  const events = new Map<string, CmEvent>()
  const add = (post: CmPost, series: SeriesKey, round: number, kind: PostKind) => {
    const key = `${series}:${round}`
    const event = events.get(key) ?? { series, round, posts: {}, ids: new Set<number>() }
    event.ids.add(post.announceId)
    const slot = `${post.lang}_${kind}` as const
    // 同じ種類の告知が複数あれば新しいほう(日程確定版/訂正版)を使う
    if (!event.posts[slot] || event.posts[slot].postAt < post.postAt) event.posts[slot] = post
    events.set(key, event)
  }
  for (const post of jpPosts) add(post, post.series, jpRounds.get(post)!, post.kind)
  for (const post of enPosts) {
    const twin = jpById.get(post.announceId)
    if (twin) add(post, twin.series, jpRounds.get(twin)!, twin.kind)
    else add(post, post.series, enRounds.get(post)!, post.kind)
  }

  // 日本版にしか無い開催のうち、グローバル版がまだ追いついていないもの(英語版と対になる日本版告知より後)だけ残す
  const linkedUntil = Math.max(0, ...enPosts.map((p) => jpById.get(p.announceId)?.postAt ?? 0))
  const jpDate = (e: CmEvent) => (e.posts.ja_here ?? e.posts.ja_coming)?.postAt ?? 0
  const isGlobal = (e: CmEvent) => Boolean(e.posts.en_here ?? e.posts.en_coming)
  const future = [...events.values()]
    .filter((e) => !isGlobal(e) && jpDate(e) > linkedUntil)
    .sort((a, b) => jpDate(a) - jpDate(b))
    .slice(0, FUTURE_LIMIT)
  return [...[...events.values()].filter(isGlobal), ...future]
}

const stripTags = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function parseEnConditions(message: string): string | null {
  const section = message.match(/Race Conditions\s*<\/h2>([\s\S]*?)(?:<br>\s*<br>|<h2)/i)?.[1]
  return section ? stripTags(section) || null : null
}

const JP_TRACKS: Record<string, string> = {
  札幌: 'Sapporo', 函館: 'Hakodate', 福島: 'Fukushima', 新潟: 'Niigata', 東京: 'Tokyo', 中山: 'Nakayama',
  中京: 'Chukyo', 京都: 'Kyoto', 阪神: 'Hanshin', 小倉: 'Kokura', 大井: 'Oi', 川崎: 'Kawasaki',
  船橋: 'Funabashi', 盛岡: 'Morioka', ロンシャン: 'Longchamp', サンタアニタパーク: 'Santa Anita Park',
}
const JP_WORDS: Record<string, string> = {
  芝: 'Turf', ダート: 'Dirt', 春: 'Spring', 夏: 'Summer', 秋: 'Fall', 冬: 'Winter',
  晴: 'Sunny', 曇: 'Cloudy', 雨: 'Rainy', 雪: 'Snowy', 良: 'Firm', 稍重: 'Good', 重: 'Soft', 不良: 'Heavy',
}
const JP_DISTANCES: Record<string, string> = { 短距離: 'Sprint', マイル: 'Mile', 中距離: 'Medium', 長距離: 'Long' }
const JP_SIDES: Record<string, string> = { 右: 'Right-Handed', 左: 'Left-Handed', 内: 'Inner', 外: 'Outer' }

// 日本版の対象レース '中山 芝 2000m（中距離） 右・内 春 晴 良 昼' を英語版の書式に寄せる
//   → 'Nakayama / Turf / 2000m (Medium) / Right-Handed / Inner / Spring / Sunny / Firm'
function parseJpConditions(message: string): string | null {
  const line = message.match(/対象レース\s*<\/h2>([^<]*)/)?.[1]
  if (!line?.trim()) return null
  const parts: string[] = []
  for (const token of stripTags(line).split(' ')) {
    const distance = token.match(/^(\d+)m[（(](.+?)[）)]$/)
    if (distance) parts.push(`${distance[1]}m (${JP_DISTANCES[distance[2] ?? ''] ?? distance[2]})`)
    else if (/^[右左]/.test(token)) parts.push(...token.split('・').map((s) => s.split('→').map((c) => JP_SIDES[c] ?? c).join(' → ')))
    else if (token === '昼' || token === '夜') continue
    else parts.push(JP_TRACKS[token] ?? JP_WORDS[token] ?? token)
  }
  return parts.join(' / ')
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

// 英語版予告の 'Round 1: From 10:00 p.m., Nov 21, 2026 (UTC)' からRound 1開始を読む
function parseEnRound1Start(message: string): string | null {
  const m = stripTags(message).match(
    /Round 1:?\s*(?:From\s*)?(\d{1,2}):(\d{2})\s*([ap])\.m\.,\s*([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})/,
  )
  if (!m) return null
  const month = MONTHS.indexOf((m[4] ?? '').toLowerCase())
  if (month === -1) return null
  const hour = (Number(m[1]) % 12) + (m[3] === 'p' ? 12 : 0)
  return new Date(Date.UTC(Number(m[6]), month, Number(m[5]), hour, Number(m[2]))).toISOString()
}

// 日本版予告の 'ラウンド1：4/13 12:00 ～' (年なし, JST)。告知日より前の月なら翌年とみなす
function parseJpRound1Start(post: CmPost): string | null {
  const m = stripTags(post.message).match(/ラウンド1[：:]\s*(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/)
  if (!m) return null
  const posted = new Date(post.postAt * 1000)
  const month = Number(m[1]) - 1
  const year = posted.getUTCFullYear() + (month < posted.getUTCMonth() ? 1 : 0)
  return new Date(Date.UTC(year, month, Number(m[2]), Number(m[3]) - 9, Number(m[4]))).toISOString()
}

const isoOf = (post: CmPost | undefined) => (post ? new Date(post.postAt * 1000).toISOString() : null)

const fetchPosts = async (url: string, parse: (p: NewsPost) => CmPost | null) =>
  (await fetchJson<NewsPost[]>(url)).map(parse).filter((p): p is CmPost => p !== null)

// 記事slug → その開催の告知ID群。回数は日本版の告知履歴を数えて振っているので、履歴の欠け/増えで
// 既存記事(mile2等)が別の開催を指すようにならないよう、一度結びついた告知IDを覚えておいて毎回照合する。
// DBが消えても残るようseed(コミット対象)に置き、同期が自動で追記する
const PINS_PATH = path.join(ROOT, 'data', 'seed', 'chanmi_article_pins.json')

type Pins = Record<string, number[]>

function articleSlugs() {
  return fs
    .readdirSync(ARTICLE_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

// ずれを見つけたら例外で止める(DB/JSONは書き換えない)。問題が無ければ更新後のpinsを返す
function checkArticlePins(events: CmEvent[]): { pins: Pins; changed: boolean } {
  const pins: Pins = fs.existsSync(PINS_PATH) ? JSON.parse(fs.readFileSync(PINS_PATH, 'utf-8')) : {}
  const keyOf = (e: { series: string; round: number }) => `${e.series}:${e.round}`
  const eventByKey = new Map(events.map((e) => [keyOf(e), e]))
  const keyById = new Map(events.flatMap((e) => [...e.ids].map((id) => [id, keyOf(e)] as const)))
  const problems: string[] = []
  let changed = false

  for (const slug of articleSlugs()) {
    const key = parseChanmiSlug(slug)
    if (!key) continue
    const event = eventByKey.get(keyOf(key))
    const pinned = pins[slug] ?? []
    if (pinned.length > 0) {
      // 覚えている告知が今どの開催に振られているか
      const movedTo = [...new Set(pinned.map((id) => keyById.get(id)).filter((k) => k !== undefined))]
      const stillHere = event !== undefined && pinned.some((id) => event.ids.has(id))
      if (!stillHere && (event !== undefined || movedTo.length > 0)) {
        problems.push(
          `  ${slug}.md: 以前は告知 ${pinned.join(', ')} の開催だったが、` +
            (movedTo.length > 0 ? `その告知は今 ${movedTo.join(' / ')} に振られている` : 'その告知が見つからない') +
            (event ? `。${keyOf(key)} は今 告知 ${[...event.ids].join(', ')} の開催` : ''),
        )
        continue
      }
    }
    if (!event) continue
    // 予告→開催中のように告知は後から増えるので、和集合で覚え直す
    const merged = [...new Set([...pinned, ...event.ids])].sort((a, b) => a - b)
    if (merged.length !== pinned.length) {
      pins[slug] = merged
      changed = true
    }
  }

  if (problems.length > 0) {
    throw new Error(
      [
        'チャンミ記事と開催の対応がずれた(ニュースの告知履歴が変わり、回数の振り直しが起きた可能性)。DB/JSONは更新していない',
        ...problems,
        '対処: 記事のファイル名を正しい回のslugに変える。意図した変更なら data/seed/chanmi_article_pins.json の該当行を消して再実行',
      ].join('\n'),
    )
  }
  return { pins, changed }
}

export async function syncChampionsMeetings(db: DatabaseSync, force: boolean) {
  if (!force && isFresh(db, NEWS_EN_URL, LIST_TTL_MS) && isFresh(db, NEWS_JP_URL, LIST_TTL_MS)) {
    console.log('[umapyoi] チャンミ告知: TTL内のためスキップ')
    return
  }
  const jpPosts = await fetchPosts(NEWS_JP_URL, parseJpPost)
  const jpById = new Map(jpPosts.map((p) => [p.announceId, p]))
  const enPosts = await fetchPosts(NEWS_EN_URL, (p) => parseEnPost(p, jpById))
  const events = groupEvents(enPosts, jpPosts)
  // ずれていたらここで止まる。前回成功時の取得ログも消すので、TTL内でも次の同期で取り直して再度照合される
  let pinCheck: ReturnType<typeof checkArticlePins>
  try {
    pinCheck = checkArticlePins(events)
  } catch (err) {
    db.prepare('DELETE FROM api_fetch_log WHERE endpoint IN (?, ?)').run(NEWS_JP_URL, NEWS_EN_URL)
    throw err
  }
  const { pins, changed: pinsChanged } = pinCheck

  const upsert = db.prepare(
    `INSERT INTO champions_meetings
       (series, round, start_at, jp_start_at, conditions, conditions_lang, en_here_id, en_coming_id, jp_here_id, jp_coming_id,
        banner_url, banner_kind, banner_lang, fetched_at)
     VALUES (:series, :round, :startAt, :jpStartAt, :conditions, :conditionsLang, :enHereId, :enComingId, :jpHereId, :jpComingId,
        :bannerUrl, :bannerKind, :bannerLang, :fetchedAt)
     ON CONFLICT(series, round) DO UPDATE SET
       start_at = excluded.start_at, jp_start_at = excluded.jp_start_at,
       conditions = excluded.conditions, conditions_lang = excluded.conditions_lang,
       en_here_id = excluded.en_here_id, en_coming_id = excluded.en_coming_id,
       jp_here_id = excluded.jp_here_id, jp_coming_id = excluded.jp_coming_id,
       banner_url = excluded.banner_url, banner_kind = excluded.banner_kind, banner_lang = excluded.banner_lang,
       fetched_at = excluded.fetched_at`,
  )
  const fetchedAt = nowIso()
  withTransaction(db, () => {
    for (const { series, round, posts } of events) {
      const { en_here: enHere, en_coming: enComing, ja_here: jaHere, ja_coming: jaComing } = posts
      const enConditions = (enHere && parseEnConditions(enHere.message)) ?? (enComing && parseEnConditions(enComing.message))
      const jpConditions = (jaHere && parseJpConditions(jaHere.message)) ?? (jaComing && parseJpConditions(jaComing.message))
      // 英語版が出たら日本版のバナーから自動で置き換わる(banner_urlが変わるので取り直しになる)
      const bannerPost = [enHere, enComing, jaHere, jaComing].find((p) => p?.image)
      upsert.run({
        series,
        round,
        startAt: isoOf(enHere) ?? (enComing ? parseEnRound1Start(enComing.message) : null),
        jpStartAt: isoOf(jaHere) ?? (jaComing ? parseJpRound1Start(jaComing) : null),
        conditions: enConditions ?? jpConditions ?? null,
        conditionsLang: enConditions ? 'en' : jpConditions ? 'ja' : null,
        enHereId: enHere?.announceId ?? null,
        enComingId: enComing?.announceId ?? null,
        jpHereId: jaHere?.announceId ?? null,
        jpComingId: jaComing?.announceId ?? null,
        bannerUrl: bannerPost?.image ?? null,
        bannerKind: bannerPost?.kind ?? null,
        bannerLang: bannerPost?.lang ?? null,
        fetchedAt,
      })
    }
    // 先の開催の範囲から外れたもの・振り直しで消えた組み合わせは捨てる(ニュースから毎回作り直せる)
    db.prepare('DELETE FROM champions_meetings WHERE fetched_at <> ?').run(fetchedAt)
  })
  if (pinsChanged) {
    // 差分が見やすいよう1記事1行で書き出す
    const lines = Object.keys(pins)
      .sort((a, b) => a.localeCompare(b))
      .map((slug) => `  ${JSON.stringify(slug)}: ${JSON.stringify(pins[slug])}`)
    fs.writeFileSync(PINS_PATH, `{\n${lines.join(',\n')}\n}\n`)
    console.log(`[umapyoi] チャンミ記事の対応を更新: ${path.relative(ROOT, PINS_PATH)}`)
  }
  logFetch(db, NEWS_JP_URL, 200, jpPosts.length)
  logFetch(db, NEWS_EN_URL, 200, enPosts.length)
  const future = events.filter((e) => !e.posts.en_here && !e.posts.en_coming).length
  console.log(
    `[umapyoi] チャンミ告知: 英語版${enPosts.length}件・日本版${jpPosts.length}件 → ${events.length}開催 (うち日本版のみ ${future})`,
  )
}

interface BannerRow {
  series: SeriesKey
  round: number
  start_at: string | null
  banner_url: string
  banner_source: string | null
}

// 記事がある開催・これから/開催中の開催・日本版から推定した先の開催だけバナーを取る(全開催分は要らない)。
// 予告→開催中、日本版→英語版でバナーURLが変わったら取り直す。元PNG(約360KB)をWebP(約50KB)へ変換して保存する
export async function syncChampionsMeetingBanners(db: DatabaseSync) {
  const articleKeys = new Set(
    fs
      .readdirSync(ARTICLE_DIR)
      .map((f) => parseChanmiSlug(f.replace(/\.md$/, '')))
      .filter((k) => k !== null)
      .map((k) => `${k.series}:${k.round}`),
  )
  const upcomingFrom = Date.now() - UPCOMING_GRACE_DAYS * 24 * 60 * 60 * 1000
  const rows = db
    .prepare(
      `SELECT series, round, start_at, banner_url, banner_source
       FROM champions_meetings WHERE banner_url IS NOT NULL`,
    )
    .all() as unknown as BannerRow[]
  const targets = rows.filter(
    (r) =>
      articleKeys.has(`${r.series}:${r.round}`) ||
      r.start_at === null ||
      new Date(r.start_at).getTime() >= upcomingFrom,
  )
  const fileOf = (r: BannerRow) => `/images/chanmi/${chanmiSlugOf(r.series, r.round)}.webp`
  const stale = targets.filter(
    (r) => r.banner_source !== r.banner_url || !fs.existsSync(path.join(ROOT, 'public', fileOf(r))),
  )
  console.log(`[umapyoi] チャンミバナー取得対象: ${stale.length}枚 (取得済み ${targets.length - stale.length}枚)`)

  fs.mkdirSync(BANNER_DIR, { recursive: true })
  const save = db.prepare(
    'UPDATE champions_meetings SET banner_path = :bannerPath, banner_source = :bannerSource WHERE series = :series AND round = :round',
  )
  for (const row of stale) {
    const file = fileOf(row)
    try {
      const { contentType, body } = await fetchBinary(row.banner_url)
      if (!contentType.startsWith('image/')) throw new Error(`想定外のContent-Type: ${contentType}`)
      await sharp(body).webp({ quality: 80 }).toFile(path.join(ROOT, 'public', file))
      save.run({ bannerPath: file, bannerSource: row.banner_url, series: row.series, round: row.round })
      console.log(`[umapyoi] チャンミバナー ${file}`)
    } catch (err) {
      const reason = err instanceof HttpError ? `HTTP ${err.status}` : err instanceof Error ? err.message : err
      console.warn(`[umapyoi] チャンミバナー ${row.series} ${row.round}回目 失敗: ${reason}`)
    }
  }
}
