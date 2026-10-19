import { supportCardCatalog, supportCardGroupNames, type CardRarity } from '@/types/supportCardType'

export const CARD_TYPE_OPTIONS = ['speed', 'stamina', 'power', 'guts', 'wit', 'pals', 'group'] as const
export type CardTypeOption = (typeof CARD_TYPE_OPTIONS)[number]

export function getRarityOptions(type: string): CardRarity[] {
  if (type === 'group') return ['ssr']
  if (type === 'pals') return ['any']
  if (type in supportCardCatalog) return ['ssr', 'sr']
  return []
}

export function getNameOptions(type: string, rarity: string): readonly string[] {
  if (type === 'group') return supportCardGroupNames
  const rarityMap = supportCardCatalog[type as keyof typeof supportCardCatalog]
  if (!rarityMap) return []
  return rarityMap[rarity as CardRarity] ?? []
}

export interface SupportCardData {
  type: string
  rarity: string
  name: string
  width?: number
  description?: string
}

export function emptySupportCardData(): SupportCardData {
  return { type: '', rarity: '', name: '' }
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;')
}

export function buildSupportCardTag(card: SupportCardData): string {
  const attrs = [`type="${card.type}"`, `rarity="${card.rarity}"`, `name="${escapeAttr(card.name)}"`]
  if (card.width) attrs.push(`:width="${card.width}"`)
  if (card.description) attrs.push(`description="${escapeAttr(card.description)}"`)
  return `<SupportCard ${attrs.join(' ')} />`
}

export function buildCardRowSnippet(columns: number | null, cards: SupportCardData[]): string {
  const inner = cards
    .filter((c) => c.type && c.rarity && c.name)
    .map((c) => `  ${buildSupportCardTag(c)}`)
    .join('\n')
  const openTag = columns ? `<CardRow :columns="${columns}">` : '<CardRow>'
  return `${openTag}\n${inner}\n</CardRow>`
}

export function buildImageModalSnippet(src: string, alt: string, widthPx: number): string {
  return `<ImageModal class="w-[${widthPx}px]" src="${src}" alt="${escapeAttr(alt)}" />`
}

export function buildImageDescriptionSnippet(imageSnippet: string, description: string): string {
  return `<ImageDescription>\n<template #image>\n  ${imageSnippet}\n</template>\n<template #description>\n  ${description}\n</template>\n</ImageDescription>`
}

export function buildCollapsibleSnippet(title: string, content: string): string {
  return `<CollapsibleSection title="${escapeAttr(title)}">\n${content}\n</CollapsibleSection>`
}

export const GACHA_FRONTMATTER_FIELDS = [
  { key: 'date', label: 'date' },
  { key: 'gacha', label: 'gacha' },
  { key: 'lowUma', label: 'low uma' },
  { key: 'lowSupport', label: 'low support' },
  { key: 'medUma', label: 'medium uma' },
  { key: 'medSupport', label: 'medium support' },
  { key: 'whaleUma', label: 'whale uma' },
  { key: 'whaleSupport', label: 'whale support' },
  { key: 'meUma', label: 'me uma' },
  { key: 'meSupport', label: 'me support' },
] as const

export function emptyGachaFrontmatter(): Record<string, string> {
  return Object.fromEntries(GACHA_FRONTMATTER_FIELDS.map((f) => [f.key, '']))
}

// 既存gacha記事は「### {引いたウマ/カード名}」の見出しを並べる構成なので、
// frontmatterのgacha欄(カンマ区切り)から見出しスタブを生成する
export function buildGachaBodyTemplate(gachaField: string): string {
  const names = gachaField
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const targets = names.length > 0 ? names : ['']
  return targets.map((name) => `### ${name}\n\n`).join('\n')
}

// 既存chanmi記事(leo2/gemini2等)に共通する構成をテンプレ化
export const CHANMI_BODY_TEMPLATE = `## Course
{{コース 例: Tokyo,Turf,1600m(Mile)}}
{{季節,天候,馬場 例: Spring,☀,Firm}}

## General

### Stats
{{ステータス目安}}

### Skills
-

### Cards


## Front

### Skills
-

### Deck

#### Core


#### Optional


### My uma


## Pace

### Skills
-

### Deck

#### Core


#### Optional


### My uma


## Late

### Skills
-

### Deck

#### Core


#### Optional


### My uma


## End

### Skills
-

### Deck

#### Core


#### Optional


### My uma
`

export function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n?/)
  if (!match) return { frontmatter: {}, body: content }
  const frontmatter: Record<string, string> = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const lineMatch = line.match(/^(\w+):\s*"((?:[^"\\]|\\.)*)"\s*$/)
    const key = lineMatch?.[1]
    const value = lineMatch?.[2]
    if (key !== undefined && value !== undefined) {
      frontmatter[key] = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
  }
  return { frontmatter, body: content.slice(match[0]?.length ?? 0) }
}

export function splitChanmiScript(content: string): { scriptPrefix: string; body: string } {
  const match = content.match(/^<script setup>[\s\S]*?<\/script>\n*/)
  if (!match) return { scriptPrefix: '', body: content }
  return { scriptPrefix: match[0], body: content.slice(match[0].length) }
}
