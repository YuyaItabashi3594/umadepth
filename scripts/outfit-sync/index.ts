// 衣装(育成ウマ娘)データの同期
//   npm run data:sync                     差分のみ取得(一覧はTTL 24h、詳細/GameTora/画像は未取得分だけ)
//   npm run data:sync -- --force          一覧のTTLを無視
//   npm run data:sync -- --refresh-all    詳細/GameToraを全件取り直す(画像はファイルが無いものだけ)
//   npm run data:sync -- --export-only    API/GameToraにアクセスせずJSON書き出しだけ
import { openDb } from './db.ts'
import { syncCharacters, syncOutfitDetails, syncOutfitList } from './umapyoi.ts'
import { syncGameToraData, syncImages } from './gametora.ts'
import { loadAliases } from './aliases.ts'
import { exportOutfits } from './export.ts'

const args = new Set(process.argv.slice(2))
const force = args.has('--force')
const refreshAll = args.has('--refresh-all')
const exportOnly = args.has('--export-only')

const db = openDb()
try {
  if (!exportOnly) {
    await syncCharacters(db, force)
    await syncOutfitList(db, force)
    await syncOutfitDetails(db, refreshAll)
    await syncGameToraData(db, refreshAll)
    await syncImages(db)
  }
  loadAliases(db)
  exportOutfits(db)
} finally {
  db.close()
}
