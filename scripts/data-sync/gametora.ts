import fs from 'node:fs'
import path from 'node:path'
import { fetchBinary, fetchText, HttpError } from './http.ts'

// GameToraのページはNext.js製で、表示データが __NEXT_DATA__ のpageProps.itemDataに入っている
export async function fetchItemData<T>(url: string): Promise<T> {
  const html = await fetchText(url)
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match?.[1]) throw new Error('__NEXT_DATA__ が見つからない')
  const itemData = JSON.parse(match[1])?.props?.pageProps?.itemData as T | undefined
  if (!itemData) throw new Error('pageProps.itemData が見つからない')
  return itemData
}

export interface ImageTarget<Id extends number | string = number> {
  id: Id
  url: string
}

// dir/{id}.png が無いものだけダウンロードする。ファイルの有無を正とし、保存済みのidを返す
export async function downloadMissingImages<Id extends number | string>(
  label: string,
  dir: string,
  targets: ImageTarget<Id>[],
): Promise<Set<Id>> {
  fs.mkdirSync(dir, { recursive: true })
  const fileOf = (id: Id) => path.join(dir, `${id}.png`)
  const missing = targets.filter((t) => !fs.existsSync(fileOf(t.id)))
  console.log(`[gametora] ${label}画像取得対象: ${missing.length}枚 (保存済み ${targets.length - missing.length}枚)`)

  for (const [index, { id, url }] of missing.entries()) {
    try {
      const { contentType, body } = await fetchBinary(url)
      if (!contentType.startsWith('image/png')) throw new Error(`想定外のContent-Type: ${contentType}`)
      fs.writeFileSync(fileOf(id), body)
      console.log(`[gametora] ${label}画像 ${index + 1}/${missing.length} ${id}.png`)
    } catch (err) {
      const reason = err instanceof HttpError ? `HTTP ${err.status}` : err instanceof Error ? err.message : err
      console.warn(`[gametora] ${label}画像 ${id} 失敗: ${reason}`)
    }
  }

  return new Set(targets.filter((t) => fs.existsSync(fileOf(t.id))).map((t) => t.id))
}
