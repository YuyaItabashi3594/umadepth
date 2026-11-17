import type { SupportCardData } from '../editorShared'

// エディタ本文からVueコンポーネント部分を見つけて構造化する。
// 想定外の書き方(未対応の属性・中身)はnullを返し、そのブロックはコードのまま表示する(=情報を落とさない)

export interface CardRowData {
  columns: number | null
  cards: SupportCardData[]
}

export interface ImageModalData {
  src: string
  alt: string
  width: number
}

export type ImageDescriptionImage =
  | { kind: 'cardrow'; data: CardRowData }
  | { kind: 'imagemodal'; data: ImageModalData }
  | { kind: 'supportcard'; data: SupportCardData }

export interface ImageDescriptionData {
  image: ImageDescriptionImage
  description: string
}

interface BlockBase {
  from: number // 行頭
  to: number // 終了タグがある行の行末(改行を含まない)
  source: string
}

export type ComponentBlock = BlockBase &
  (
    | { kind: 'supportcard'; data: SupportCardData }
    | { kind: 'cardrow'; data: CardRowData }
    | { kind: 'imagemodal'; data: ImageModalData }
    | { kind: 'imagedescription'; data: ImageDescriptionData }
    | { kind: 'collapsible-open'; data: { title: string } }
    | { kind: 'collapsible-close'; data: null }
  )

export type BlockKind = ComponentBlock['kind']

export interface InlineSkill {
  from: number
  to: number
  name?: string
  id?: number
}

export interface MarkdownImage {
  lineEnd: number
  src: string
  alt: string
}

export interface ScanResult {
  blocks: ComponentBlock[]
  skills: InlineSkill[]
  images: MarkdownImage[]
}

// --- 属性 ---

const ATTR_RE = /([:@#]?[A-Za-z_][\w.-]*)(?:\s*=\s*"([^"]*)")?/g

const unescapeAttr = (value: string) => value.replace(/&quot;/g, '"')

function parseTag(tag: string, name: string, allowed: readonly string[]): Map<string, string> | null {
  const match = tag.match(new RegExp(`^<${name}\\b([\\s\\S]*?)\\/?>$`))
  if (!match) return null
  const attrs = new Map<string, string>()
  for (const [, key, value] of (match[1] ?? '').matchAll(ATTR_RE)) {
    if (!key || !allowed.includes(key)) return null // 編集時に失われる属性があるなら構造化しない
    attrs.set(key, unescapeAttr(value ?? ''))
  }
  return attrs
}

// --- 各コンポーネント ---

const SUPPORT_CARD_TAG_RE = /<SupportCard\b[^>]*?\/>/g

function parseSupportCard(tag: string): SupportCardData | null {
  const attrs = parseTag(tag, 'SupportCard', [':id', 'type', 'rarity', 'name', ':width', 'width', 'description'])
  if (!attrs || !tag.endsWith('/>')) return null
  const id = attrs.get(':id')
  const type = attrs.get('type')
  const rarity = attrs.get('rarity')
  const name = attrs.get('name') ?? ''
  let card: SupportCardData
  // :id 形式(nameは表示名で任意) と 旧形式(type/rarity/nameが必須) の2通り
  if (id !== undefined) {
    if (type || rarity || !/^\d+$/.test(id)) return null
    card = { id: Number(id), type: '', rarity: '', name }
  } else {
    if (!type || !rarity || !name) return null
    card = { type, rarity, name }
  }
  const width = attrs.get(':width') ?? attrs.get('width')
  if (width) card.width = Number(width)
  const description = attrs.get('description')
  if (description) card.description = description
  return card
}

function parseCardRow(source: string): CardRowData | null {
  const match = source.match(/^(<CardRow\b[^>]*>)([\s\S]*)<\/CardRow>$/)
  if (!match) return null
  const attrs = parseTag(match[1] ?? '', 'CardRow', [':columns'])
  if (!attrs) return null
  const inner = match[2] ?? ''
  // SupportCard以外(コメントや別コンポーネント)が混ざっていたら構造化しない
  if (inner.replace(SUPPORT_CARD_TAG_RE, '').trim() !== '') return null
  const cards: SupportCardData[] = []
  for (const [tag] of inner.matchAll(SUPPORT_CARD_TAG_RE)) {
    const card = parseSupportCard(tag)
    if (!card) return null
    cards.push(card)
  }
  const columns = attrs.get(':columns')
  return { columns: columns ? Number(columns) : null, cards }
}

function parseImageModal(tag: string): ImageModalData | null {
  const attrs = parseTag(tag, 'ImageModal', ['class', 'src', 'alt'])
  if (!attrs || !tag.endsWith('/>')) return null
  const src = attrs.get('src')
  // buildImageModalSnippetが出す class="w-[Npx]" だけを対象にする
  const width = attrs.get('class')?.match(/^w-\[(\d+)px\]$/)?.[1]
  if (!src || !width) return null
  return { src, alt: attrs.get('alt') ?? '', width: Number(width) }
}

function dedent(text: string): string {
  const lines = text.split('\n')
  while (lines.length && !lines[0]?.trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1]?.trim()) lines.pop()
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)?.[0].length ?? 0)
  const min = indents.length ? Math.min(...indents) : 0
  return lines.map((l) => l.slice(min)).join('\n')
}

function parseImageDescription(source: string): ImageDescriptionData | null {
  const match = source.match(
    /^<ImageDescription>\s*<template #image>([\s\S]*?)<\/template>\s*<template #description>([\s\S]*?)<\/template>\s*<\/ImageDescription>$/,
  )
  if (!match) return null
  const imageSource = (match[1] ?? '').trim()
  let image: ImageDescriptionImage | null = null
  if (imageSource.startsWith('<CardRow')) {
    const data = parseCardRow(imageSource)
    if (data) image = { kind: 'cardrow', data }
  } else if (imageSource.startsWith('<SupportCard')) {
    const data = parseSupportCard(imageSource)
    if (data) image = { kind: 'supportcard', data }
  } else if (imageSource.startsWith('<ImageModal')) {
    const data = parseImageModal(imageSource)
    if (data) image = { kind: 'imagemodal', data }
  }
  if (!image) return null
  return { image, description: dedent(match[2] ?? '') }
}

function parseCollapsibleOpen(tag: string): { title: string } | null {
  const attrs = parseTag(tag, 'CollapsibleSection', ['title'])
  return attrs ? { title: attrs.get('title') ?? '' } : null
}

// --- 文書全体の走査 ---

const lineEndOf = (text: string, pos: number) => {
  const idx = text.indexOf('\n', pos)
  return idx === -1 ? text.length : idx
}

// lineStartから始まるブロックを、閉じ記号(close)のある行の行末まで切り出す。閉じ記号の後ろに文字があれば対象外
function sliceUntil(text: string, lineStart: number, close: string): { to: number; source: string } | null {
  const closeIdx = text.indexOf(close, lineStart)
  if (closeIdx === -1) return null
  const to = lineEndOf(text, closeIdx)
  if (text.slice(closeIdx + close.length, to).trim() !== '') return null
  return { to, source: text.slice(lineStart, to) }
}

function matchBlock(text: string, lineStart: number, line: string): ComponentBlock | null {
  const trimmed = line.trim()
  const build = <K extends BlockKind>(
    kind: K,
    close: string,
    parse: (s: string) => Extract<ComponentBlock, { kind: K }>['data'] | null,
  ) => {
    const sliced = sliceUntil(text, lineStart, close)
    if (!sliced) return null
    const data = parse(sliced.source.trim())
    if (data === null && kind !== 'collapsible-close') return null
    return { kind, from: lineStart, to: sliced.to, source: sliced.source, data } as ComponentBlock
  }

  if (trimmed.startsWith('<ImageDescription')) return build('imagedescription', '</ImageDescription>', parseImageDescription)
  if (trimmed.startsWith('<CardRow')) return build('cardrow', '</CardRow>', parseCardRow)
  if (trimmed.startsWith('<ImageModal')) return build('imagemodal', '/>', parseImageModal)
  if (trimmed.startsWith('<SupportCard')) return build('supportcard', '/>', parseSupportCard)
  if (/^<CollapsibleSection\b[^>]*>$/.test(trimmed)) {
    const data = parseCollapsibleOpen(trimmed)
    return data ? { kind: 'collapsible-open', from: lineStart, to: lineStart + line.length, source: line, data } : null
  }
  if (trimmed === '</CollapsibleSection>') {
    return { kind: 'collapsible-close', from: lineStart, to: lineStart + line.length, source: line, data: null }
  }
  return null
}

const SKILL_RE = /<SkillChip\b([^>]*?)\/>/g
const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g

function scanInline(line: string, lineStart: number, result: ScanResult) {
  for (const match of line.matchAll(SKILL_RE)) {
    const attrs = parseTag(match[0], 'SkillChip', ['name', ':id', 'id'])
    if (!attrs) continue
    const id = attrs.get(':id') ?? attrs.get('id')
    const from = lineStart + (match.index ?? 0)
    result.skills.push({ from, to: from + match[0].length, name: attrs.get('name'), id: id ? Number(id) : undefined })
  }
  for (const match of line.matchAll(MD_IMAGE_RE)) {
    result.images.push({ lineEnd: lineStart + line.length, alt: match[1] ?? '', src: match[2] ?? '' })
  }
}

export function scanDocument(text: string): ScanResult {
  const result: ScanResult = { blocks: [], skills: [], images: [] }
  let pos = 0
  let inFence = false
  while (pos <= text.length) {
    const lineEnd = lineEndOf(text, pos)
    const line = text.slice(pos, lineEnd)
    if (line.trimStart().startsWith('```')) inFence = !inFence
    const block = inFence ? null : matchBlock(text, pos, line)
    if (block) {
      result.blocks.push(block)
      pos = block.to + 1
      continue
    }
    if (!inFence) scanInline(line, pos, result)
    pos = lineEnd + 1
  }
  return result
}
