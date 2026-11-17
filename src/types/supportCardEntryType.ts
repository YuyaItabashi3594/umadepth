import type { CardType } from './supportCardType'

// scripts/data-sync が書き出す src/data/supportCards.json の1件分
export type SupportCardKind = CardType | 'group'
export type SupportCardRarity = 'r' | 'sr' | 'ssr'

export interface SupportCardEntry {
  id: number // 30028
  gameId: number // umapyoiのchara_id。グループカードでは代表キャラ等
  characterSlug: string | null // キャラ一覧に無いもの(Yayoi等)はnull
  name: { en: string; jp: string | null } // グループカードはグループ名
  title: { en: string | null; jp: string | null }
  rarity: SupportCardRarity
  type: SupportCardKind | null
  obtained: string | null
  releaseJp: string | null
  releaseEn: string | null // グローバル版未実装ならnull
  image: string | null // '/images/support-cards/30028.png'。Rカードはnull
  aliases: string[]
}

// src/data/supportCardAliases.json: '{type}/{rarity}/{name}' → <SupportCard>表示に必要な分だけ
export type SupportCardAliasMap = Record<
  string,
  Pick<SupportCardEntry, 'id' | 'rarity' | 'type' | 'image'> & { title: string | null }
>
