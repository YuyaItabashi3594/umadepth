import indexFile from '@/data/outfitIndex.json'
import type { OutfitIndexEntry, OutfitIndexFile } from '@/types/outfitDetailType'

// <UmaChip>の指定方法:
//   :id="103802"                 エディタの一覧から選んだもの(name は表示名)
//   name="Wedding Curren Chan"   data/seed/outfit_aliases.json の通称
//   name="Curren Chan"           キャラ名だけなら最初の衣装(初期実装)
const data = indexFile as unknown as OutfitIndexFile
const byId = new Map(data.outfits.map((o) => [o.id, o]))
const idByAlias = new Map(data.aliases.map(([alias, id]) => [alias.toLowerCase(), id]))
const firstIdByName = new Map<string, number>()
for (const o of data.outfits) {
  const key = o.name.toLowerCase()
  if (!firstIdByName.has(key)) firstIdByName.set(key, o.id)
}

export function resolveOutfit(ref: { id?: number; name?: string }): OutfitIndexEntry | undefined {
  const key = ref.name?.trim().toLowerCase()
  const id = ref.id ?? (key ? (idByAlias.get(key) ?? firstIdByName.get(key)) : undefined)
  return id === undefined ? undefined : byId.get(id)
}

// エディタで一覧から選んだとき、通称が登録済みならその名前を表示名にする
const aliasById = new Map<number, string>()
for (const [alias, id] of data.aliases) if (!aliasById.has(id)) aliasById.set(id, alias)

export const outfitAliasOf = (id: number) => aliasById.get(id)
