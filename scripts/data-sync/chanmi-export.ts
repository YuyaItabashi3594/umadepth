import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { ChampionsMeeting, SeriesKey } from '../../src/utils/championsMeeting.ts'
import { ROOT } from './db.ts'

const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'championsMeetings.json')
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

interface Row {
  series: SeriesKey
  round: number
  start_at: string | null
  jp_start_at: string | null
  conditions: string | null
  en_here_id: number | null
  en_coming_id: number | null
  banner_path: string | null
  banner_source: string | null
}

// 取得に失敗して古い画像のままのこともあるので、種類/言語は実際に保存した元URLから判定する
const bannerKindOf = (url: string) => (/banner_3032/.test(url) ? 'coming' : 'here')
const bannerLangOf = (url: string) => (/umamusume-en\./.test(url) ? 'en' : 'ja')

export function exportChampionsMeetings(db: DatabaseSync) {
  const rows = db
    .prepare(
      `SELECT series, round, start_at, jp_start_at, conditions, en_here_id, en_coming_id, banner_path, banner_source
       FROM champions_meetings ORDER BY COALESCE(start_at, '9999'), jp_start_at, series, round`,
    )
    .all() as unknown as Row[]
  const entries: ChampionsMeeting[] = rows.map((r) => {
    const hasBanner =
      r.banner_path !== null && r.banner_source !== null && fs.existsSync(path.join(ROOT, 'public', r.banner_path))
    return {
      series: r.series,
      round: r.round,
      start: r.start_at?.slice(0, 10) ?? null,
      jpStart: r.jp_start_at ? new Date(new Date(r.jp_start_at).getTime() + JST_OFFSET_MS).toISOString().slice(0, 10) : null,
      global: r.en_here_id !== null || r.en_coming_id !== null,
      conditions: r.conditions,
      banner: hasBanner ? r.banner_path : null,
      bannerKind: hasBanner ? bannerKindOf(r.banner_source!) : null,
      bannerLang: hasBanner ? bannerLangOf(r.banner_source!) : null,
    }
  })
  // 差分が見やすいよう1開催1行で書き出す
  fs.writeFileSync(OUTPUT_PATH, `[\n${entries.map((e) => `  ${JSON.stringify(e)}`).join(',\n')}\n]\n`)
  console.log(`[export] ${path.relative(ROOT, OUTPUT_PATH)}: ${entries.length}開催`)
}
