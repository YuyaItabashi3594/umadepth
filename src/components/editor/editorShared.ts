import { aliasOf } from '@/utils/supportCardIndex'

// 画面に出す名前。記事に書くタグ名(SupportCard等)は変えない
export const COMPONENT_LABELS = {
  supportcard: 'サポートカード',
  cardrow: 'カード並び',
  imagedescription: '画像＋説明文',
  collapsible: '折りたたみ',
  imagemodal: '拡大画像',
} as const

// <SupportCard>1枚分。idがあれば :id 形式、無ければ旧形式(type/rarity/name)で書き出す
export interface SupportCardData {
  id?: number
  type: string
  rarity: string
  name: string
  width?: number
  description?: string
}

export function emptySupportCardData(): SupportCardData {
  return { type: '', rarity: '', name: '' }
}

export const isSupportCardSelected = (card: SupportCardData) =>
  card.id !== undefined || Boolean(card.type && card.rarity && card.name)

// 一覧から選んだカード。通称が登録済みなら記事の既存の書き方(type/rarity/name)に揃え、未登録なら :id で書く
export function supportCardDataFromId(id: number, name: string, base?: SupportCardData): SupportCardData {
  const keep = { width: base?.width, description: base?.description }
  const alias = aliasOf(id)
  return alias ? { ...alias, ...keep } : { id, type: '', rarity: '', name, ...keep }
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;')
}

export function buildSupportCardTag(card: SupportCardData): string {
  const attrs =
    card.id !== undefined
      ? [`:id="${card.id}"`, `name="${escapeAttr(card.name)}"`]
      : [`type="${card.type}"`, `rarity="${card.rarity}"`, `name="${escapeAttr(card.name)}"`]
  if (card.width) attrs.push(`:width="${card.width}"`)
  if (card.description) attrs.push(`description="${escapeAttr(card.description)}"`)
  return `<SupportCard ${attrs.join(' ')} />`
}

export function buildCardRowSnippet(columns: number | null, cards: SupportCardData[]): string {
  const inner = cards
    .filter(isSupportCardSelected)
    .map((c) => `  ${buildSupportCardTag(c)}`)
    .join('\n')
  const openTag = columns ? `<CardRow :columns="${columns}">` : '<CardRow>'
  return `${openTag}\n${inner}\n</CardRow>`
}

export function buildImageModalSnippet(src: string, alt: string, widthPx: number): string {
  return `<ImageModal class="w-[${widthPx}px]" src="${src}" alt="${escapeAttr(alt)}" />`
}

// 既存記事に合わせてtemplate内は2スペース字下げ(複数行でも各行に付ける)
const indent = (text: string) =>
  text
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n')

export function buildImageDescriptionSnippet(imageSnippet: string, description: string): string {
  return `<ImageDescription>\n<template #image>\n${indent(imageSnippet)}\n</template>\n<template #description>\n${indent(description)}\n</template>\n</ImageDescription>`
}

export function buildCollapsibleOpenTag(title: string): string {
  return `<CollapsibleSection title="${escapeAttr(title)}">`
}

export function buildCollapsibleSnippet(title: string, content: string): string {
  return `${buildCollapsibleOpenTag(title)}\n${content}\n</CollapsibleSection>`
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

// banner: ガチャ一覧の見出しに出す目玉の画像パス。エディタでは一覧から選ぶので、上の文字入力欄には含めない。
// 空なら従来どおり public/images/gacha/{slug}.png を表示する
// Editor → プレビューiframe へfrontmatterを送るpostMessageの種別
export const PREVIEW_FRONTMATTER_MESSAGE = 'umadepth-editor-frontmatter'

export function emptyGachaFrontmatter(): Record<string, string> {
  return { ...Object.fromEntries(GACHA_FRONTMATTER_FIELDS.map((f) => [f.key, ''])), banner: '' }
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
【コース 例: Tokyo,Turf,1600m(Mile)】
【季節,天候,馬場 例: Spring,☀,Firm】

## General

### Stats
【ステータス目安】

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
