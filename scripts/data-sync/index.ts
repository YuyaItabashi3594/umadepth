// 衣装(育成ウマ娘)/サポートカードのデータ同期
//   npm run data:sync                         両方を差分取得(一覧はTTL 24h、詳細/GameTora/画像は未取得分だけ)
//   npm run data:sync -- outfits              衣装だけ (supports でサポカだけ)
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
import { loadAliases } from './aliases.ts'

const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const targets = new Set(args.filter((a) => !a.startsWith('--')))
for (const t of targets) {
  if (t !== 'outfits' && t !== 'supports') throw new Error(`不明な対象: ${t} (outfits / supports)`)
}
const runOutfits = targets.size === 0 || targets.has('outfits')
const runSupports = targets.size === 0 || targets.has('supports')

const force = flags.has('--force')
const refreshAll = flags.has('--refresh-all')
const exportOnly = flags.has('--export-only')

const db = openDb()
try {
  if (!exportOnly) await syncCharacters(db, force)

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
    }
    loadAliases(db, 'support_cards')
    exportSupportCards(db)
  }
} finally {
  db.close()
}
