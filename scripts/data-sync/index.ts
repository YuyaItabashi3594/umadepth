// 衣装(育成ウマ娘)/サポートカード/スキル/チャンミ告知のデータ同期
//   npm run data:sync                         全部を差分取得(一覧はTTL 24h、詳細/GameTora/画像は未取得分だけ)
//   npm run data:sync -- outfits              衣装だけ (supports でサポカだけ、skills でスキルだけ、chanmi でチャンミだけ)
//   npm run data:sync -- --force              一覧のTTLを無視
//   npm run data:sync -- --refresh-all        詳細/GameToraを全件取り直す(画像はファイルが無いものだけ)
//   npm run data:sync -- --export-only        外部にアクセスせずaliases取り込みとJSON書き出しだけ
import { openDb } from './db.ts'
import { syncCharacters } from './characters.ts'
import { syncOutfitDetails, syncOutfitList } from './outfit-umapyoi.ts'
import { syncOutfitGameTora, syncOutfitImages } from './outfit-gametora.ts'
import { exportOutfits } from './outfit-export.ts'
import { syncSupportList } from './support-umapyoi.ts'
import { syncSupportGameTora, syncSupportImages, syncSupportTypeIcons } from './support-gametora.ts'
import { exportSupportCards } from './support-export.ts'
import { syncSupportEffects } from './support-effects.ts'
import { exportSupportCardDetails } from './support-detail-export.ts'
import { loadAliases } from './aliases.ts'
import { rebuildSkillRelations, syncSkillIcons, syncSkills } from './skill-gametora.ts'
import { exportSkills } from './skill-export.ts'
import { syncChampionsMeetingBanners, syncChampionsMeetings } from './chanmi-umapyoi.ts'
import { exportChampionsMeetings } from './chanmi-export.ts'
import { syncChanmiCourseImages, syncRacecourses } from './chanmi-courses.ts'

const TARGETS = ['outfits', 'supports', 'skills', 'chanmi']
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const targets = new Set(args.filter((a) => !a.startsWith('--')))
for (const t of targets) {
  if (!TARGETS.includes(t)) throw new Error(`不明な対象: ${t} (${TARGETS.join(' / ')})`)
}
const runOutfits = targets.size === 0 || targets.has('outfits')
const runSupports = targets.size === 0 || targets.has('supports')
const runSkills = targets.size === 0 || targets.has('skills')
const runChanmi = targets.size === 0 || targets.has('chanmi')

const force = flags.has('--force')
const refreshAll = flags.has('--refresh-all')
const exportOnly = flags.has('--export-only')

const db = openDb()
try {
  // スキル単体ではキャラ一覧は不要
  if (!exportOnly && (runOutfits || runSupports)) await syncCharacters(db, force)

  if (runOutfits) {
    if (!exportOnly) {
      await syncOutfitList(db, force)
      await syncOutfitDetails(db, refreshAll)
      await syncOutfitGameTora(db, refreshAll)
      await syncOutfitImages(db)
    }
    loadAliases(db, 'outfits')
    exportOutfits(db)
  }

  if (runSupports) {
    if (!exportOnly) {
      await syncSupportList(db, force)
      await syncSupportGameTora(db, refreshAll)
      await syncSupportImages(db)
      await syncSupportTypeIcons()
      await syncSupportEffects(db, force || refreshAll)
    }
    loadAliases(db, 'support_cards')
    exportSupportCards(db)
    exportSupportCardDetails(db)
  }

  // 衣装/サポカのgametora_jsonを参照するので最後に実行する
  if (runSkills) {
    if (!exportOnly) {
      await syncSkills(db, force, refreshAll)
      await syncSkillIcons(db)
    }
    rebuildSkillRelations(db)
    exportSkills(db)
  }

  if (runChanmi) {
    if (!exportOnly) {
      await syncChampionsMeetings(db, force)
      await syncChampionsMeetingBanners(db)
      await syncRacecourses(db, force)
      await syncChanmiCourseImages(db)
    }
    exportChampionsMeetings(db)
  }
} finally {
  db.close()
}
