import indexFile from '@/data/supportCardIndex.json'
import type { SupportCardIndexEntry, SupportCardIndexFile } from '@/types/supportCardEntryType'

// <SupportCard>の指定方法は2通り:
//   :id="30028"                              エディタのカード一覧から選んだもの
//   type="speed" rarity="ssr" name="Kitasan Black"  旧形式。data/seed/support_card_aliases.json の通称で解決
const data = indexFile as unknown as SupportCardIndexFile
const byId = new Map(data.cards.map((c) => [c.id, c]))
const idByAlias = new Map(data.aliases)

export interface SupportCardRef {
  id?: number
  type?: string
  rarity?: string
  name?: string
}

export const aliasKeyOf = (ref: SupportCardRef) => `${ref.type}/${ref.rarity}/${ref.name}`

export function resolveSupportCard(ref: SupportCardRef): SupportCardIndexEntry | undefined {
  const id = ref.id ?? idByAlias.get(aliasKeyOf(ref))
  return id === undefined ? undefined : byId.get(id)
}

// 通称が登録済みならその形式(type/rarity/name)で書けるよう、id→通称の逆引きを用意する
const aliasById = new Map<number, string>()
for (const [alias, id] of data.aliases) if (!aliasById.has(id)) aliasById.set(id, alias)

export function aliasOf(id: number): { type: string; rarity: string; name: string } | undefined {
  const alias = aliasById.get(id)
  if (!alias) return undefined
  const [type = '', rarity = '', ...rest] = alias.split('/')
  return { type, rarity, name: rest.join('/') }
}
