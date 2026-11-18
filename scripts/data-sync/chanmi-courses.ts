import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import sharp from 'sharp'
import { fetchBinary, fetchJson, fetchText, GAMETORA_BASE, HttpError } from './http.ts'
import { isFresh, logFetch, ROOT, withTransaction } from './db.ts'
import { nowIso } from './text.ts'

// チャンミのコース図。GameTora(/umamusume/racetracks)のコースデータと、コースごとのコース図(simple/en)を使う
const MEDIA_BASE = 'https://media.gametora.com/umamusume/racetrack'
const MANIFEST_URL = `${GAMETORA_BASE}/data/manifests/umamusume.json`
const RACETRACKS_PAGE_URL = `${GAMETORA_BASE}/umamusume/racetracks`
const FETCH_LOG_KEY = 'gametora:racetracks'
// コースデータはめったに変わらない
const RACETRACKS_TTL_MS = 7 * 24 * 60 * 60 * 1000
// GameToraの英語版が表示している時点。ページのJSから読めなかったときだけ使う
const FALLBACK_EN_PERIOD = 'pre_2_5th_anni'
const IMAGE_DIR = path.join(ROOT, 'public', 'images', 'chanmi', 'courses')

// 競馬場。name はレース条件の表記(日本版の英訳は chanmi-umapyoi.ts の JP_TRACKS)、slug はGameToraのURL
export const TRACKS = [
  { id: 10001, name: 'Sapporo', slug: 'sapporo' },
  { id: 10002, name: 'Hakodate', slug: 'hakodate' },
  { id: 10003, name: 'Niigata', slug: 'niigata' },
  { id: 10004, name: 'Fukushima', slug: 'fukushima' },
  { id: 10005, name: 'Nakayama', slug: 'nakayama' },
  { id: 10006, name: 'Tokyo', slug: 'tokyo' },
  { id: 10007, name: 'Chukyo', slug: 'chukyo' },
  { id: 10008, name: 'Kyoto', slug: 'kyoto' },
  { id: 10009, name: 'Hanshin', slug: 'hanshin' },
  { id: 10010, name: 'Kokura', slug: 'kokura' },
  { id: 10101, name: 'Oi', slug: 'ooi', aliases: ['ooi'] },
  { id: 10103, name: 'Kawasaki', slug: 'kawasaki' },
  { id: 10104, name: 'Funabashi', slug: 'funabashi' },
  { id: 10105, name: 'Morioka', slug: 'morioka' },
  { id: 10201, name: 'Longchamp', slug: 'longchamp' },
  { id: 10202, name: 'Santa Anita Park', slug: 'santa_anita', aliases: ['santa anita'] },
  { id: 10203, name: 'Del Mar', slug: 'del_mar' },
]

const trackOf = (name: string) => {
  const key = name.toLowerCase()
  return TRACKS.find((t) => t.name.toLowerCase() === key || t.aliases?.includes(key))
}

interface GameToraCourse {
  id: number
  terrain: number
  length: number
  inout: number
}

interface GameToraTrack {
  id: number
  courses: GameToraCourse[]
}

// 英語版がどの時点のデータを見ているか(pre_2_5th_anni等)は、racetracksページのJSに書かれている
//   u={ja:"present",ko:"pre_yhs",zh_tw:"pre_sp_removal",en:"pre_2_5th_anni"}
async function detectEnPeriod(): Promise<string> {
  try {
    const html = await fetchText(RACETRACKS_PAGE_URL)
    const chunk = html.match(/\/_next\/static\/chunks\/pages\/umamusume\/racetracks-[\w-]+\.js/)?.[0]
    if (!chunk) throw new Error('ページのJSが見つからない')
    const js = await fetchText(`${GAMETORA_BASE}${chunk}`)
    const period = js.match(/\{ja:"present"[^}]*?\ben:"(\w+)"/)?.[1]
    if (!period) throw new Error('英語版の時点が見つからない')
    return period
  } catch (err) {
    console.warn(`[gametora] 英語版の時点を読めなかったので ${FALLBACK_EN_PERIOD} を使う: ${err instanceof Error ? err.message : err}`)
    return FALLBACK_EN_PERIOD
  }
}

export async function syncRacecourses(db: DatabaseSync, force: boolean) {
  const count = (db.prepare('SELECT count(*) AS c FROM racecourses').get() as { c: number }).c
  if (count > 0 && !force && isFresh(db, FETCH_LOG_KEY, RACETRACKS_TTL_MS)) {
    console.log(`[gametora] コースデータ: 取得済み(${count}件)のためスキップ`)
    return
  }
  const period = await detectEnPeriod()
  const manifest = await fetchJson<Record<string, string>>(MANIFEST_URL)
  const presentHash = manifest.racetracks
  if (!presentHash) throw new Error('manifestにracetracksが無い')
  const historyHash = period === 'present' ? undefined : manifest[`history/${period}/racetracks`]
  if (period !== 'present' && !historyHash) console.warn(`[gametora] history/${period}/racetracks が無いので現行データを使う`)

  const present = await fetchJson<GameToraTrack[]>(`${GAMETORA_BASE}/data/umamusume/racetracks.${presentHash}.json`)
  const history = historyHash
    ? await fetchJson<GameToraTrack[]>(`${GAMETORA_BASE}/data/umamusume/history/${period}/racetracks.${historyHash}.json`)
    : []
  // 英語版の時点に存在するコースはその時点のデータとコース図、後から追加されたコースは現行のもの
  const historyIds = new Set(history.flatMap((t) => t.courses.map((c) => c.id)))
  const historyTracks = new Map(history.map((t) => [t.id, t]))
  const upsert = db.prepare(
    `INSERT INTO racecourses (id, track_id, terrain, length, inout, image_url, fetched_at)
     VALUES (:id, :trackId, :terrain, :length, :inout, :imageUrl, :fetchedAt)
     ON CONFLICT(id) DO UPDATE SET track_id = excluded.track_id, terrain = excluded.terrain, length = excluded.length,
       inout = excluded.inout, image_url = excluded.image_url, fetched_at = excluded.fetched_at`,
  )
  const fetchedAt = nowIso()
  let total = 0
  withTransaction(db, () => {
    for (const track of present) {
      for (const presentCourse of track.courses) {
        const fromHistory = historyIds.has(presentCourse.id)
        const course = fromHistory
          ? (historyTracks.get(track.id)?.courses.find((c) => c.id === presentCourse.id) ?? presentCourse)
          : presentCourse
        const prefix = fromHistory ? `${MEDIA_BASE}/history/${period}` : MEDIA_BASE
        upsert.run({
          id: course.id,
          trackId: track.id,
          terrain: course.terrain,
          length: course.length,
          inout: course.inout,
          imageUrl: `${prefix}/simple/en/${track.id}/${course.id}.png`,
          fetchedAt,
        })
        total++
      }
    }
  })
  logFetch(db, FETCH_LOG_KEY, 200, total)
  console.log(`[gametora] コースデータ: ${total}件 (英語版の時点: ${period})`)
}

// GameToraのinout: 2 内 / 3 外 / 4 外→内
const inoutOf = (side: string) => {
  if (/outer\s*→\s*inner/.test(side)) return 4
  return side.startsWith('inner') ? 2 : 3
}

// レース条件 'Hanshin / Turf / 3,200m (Long) / Right-Handed / Outer → Inner / Rain / Heavy' からコースIDを引く
export function resolveCourseId(db: DatabaseSync, conditions: string | null): number | null {
  if (!conditions) return null
  const parts = conditions
    .split('/')
    .map((s) => s.trim().replace(/^\w+:\s*/, ''))
    .filter(Boolean)
  const track = trackOf(parts[0] ?? '')
  const terrainWord = parts.find((p) => /^(turf|dirt)$/i.test(p))?.toLowerCase()
  const lengthText = parts.map((p) => p.match(/^([\d,]+)\s*m\b/i)?.[1]).find(Boolean)
  if (!track || !terrainWord || !lengthText) return null
  const sideText = parts.find((p) => /^(inner|outer)\b/i.test(p))?.toLowerCase()
  const inout = sideText ? inoutOf(sideText) : null

  const candidates = db
    .prepare('SELECT id, inout FROM racecourses WHERE track_id = ? AND terrain = ? AND length = ?')
    .all(track.id, terrainWord === 'turf' ? 1 : 2, Number(lengthText.replace(/,/g, ''))) as { id: number; inout: number }[]
  // 内/外の表記が無ければ内外の区別が無いコース(東京など)。それでも1つに絞れなければ判定しない
  const matched = candidates.length === 1 && inout === null ? candidates : candidates.filter((c) => c.inout === (inout ?? 1))
  return matched.length === 1 ? (matched[0]?.id ?? null) : null
}

export const courseImagePathOf = (courseId: number) => `/images/chanmi/courses/${courseId}.webp`

export const gametoraTrackUrlOf = (trackId: number) => {
  const slug = TRACKS.find((t) => t.id === trackId)?.slug
  return slug ? `${GAMETORA_BASE}/umamusume/racetracks/${slug}` : null
}

// 透明背景に濃い線なので、ダークモードや拡大表示(黒い背景)でも見えるよう白地に載せる。
// 図の周りの余白が広いので詰めて、少しだけ余白を付け直す
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
async function toCourseWebp(png: Buffer, file: string) {
  // sharpは1つのパイプライン内だとflattenより先にtrimを掛ける(透明のまま判定して何も削れない)ので、2段に分ける
  const flat = await sharp(png).flatten({ background: WHITE }).png().toBuffer()
  const trimmed = await sharp(flat).trim({ background: WHITE }).toBuffer()
  await sharp(trimmed)
    .extend({ top: 16, bottom: 16, left: 16, right: 16, background: WHITE })
    .webp({ lossless: true })
    .toFile(file)
}

interface ImageRow {
  id: number
  image_url: string
  image_source: string | null
}

// チャンミで使うコースだけ、コース図を取ってwebp(可逆。線と文字だけの図なので非可逆と大差ない)で保存する
export async function syncChanmiCourseImages(db: DatabaseSync) {
  const conditionsList = db
    .prepare('SELECT series, round, conditions FROM champions_meetings')
    .all() as { series: string; round: number; conditions: string | null }[]
  const courseIds = new Set<number>()
  for (const row of conditionsList) {
    const id = resolveCourseId(db, row.conditions)
    if (id !== null) courseIds.add(id)
    else if (row.conditions) console.warn(`[gametora] コース特定できず: ${row.series} ${row.round}回目 (${row.conditions})`)
  }
  const select = db.prepare('SELECT id, image_url, image_source FROM racecourses WHERE id = ?')
  const rows = [...courseIds].map((id) => select.get(id) as unknown as ImageRow)
  const stale = rows.filter(
    (r) => r.image_source !== r.image_url || !fs.existsSync(path.join(ROOT, 'public', courseImagePathOf(r.id))),
  )
  console.log(`[gametora] コース図取得対象: ${stale.length}枚 (取得済み ${rows.length - stale.length}枚)`)

  fs.mkdirSync(IMAGE_DIR, { recursive: true })
  const save = db.prepare('UPDATE racecourses SET image_source = :source WHERE id = :id')
  for (const row of stale) {
    try {
      const { contentType, body } = await fetchBinary(row.image_url)
      if (!contentType.startsWith('image/')) throw new Error(`想定外のContent-Type: ${contentType}`)
      await toCourseWebp(body, path.join(ROOT, 'public', courseImagePathOf(row.id)))
      save.run({ source: row.image_url, id: row.id })
      console.log(`[gametora] コース図 ${courseImagePathOf(row.id)}`)
    } catch (err) {
      const reason = err instanceof HttpError ? `HTTP ${err.status}` : err instanceof Error ? err.message : err
      console.warn(`[gametora] コース図 ${row.id} 失敗: ${reason}`)
    }
  }
}
