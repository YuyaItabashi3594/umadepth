import { inject, provide, readonly, ref, shallowRef, type App, type InjectionKey } from 'vue'
import type { SupportCardDetail, SupportCardDetailFile, SupportEffectSymbol } from '@/types/supportCardDetailType'
import type { OutfitDetail, OutfitDetailFile } from '@/types/outfitDetailType'

// 記事中の<SupportCard>/<UmaChip>をクリックすると、画面右上に詳細パネル(DetailPanel)を1枚だけ出す。
// 開いている対象はアプリ全体で1つなので、状態はモジュールで共有する
export type DetailKind = 'support' | 'outfit'

export interface DetailTarget {
  kind: DetailKind
  id: number
}

const target = ref<DetailTarget | null>(null)
let triggerEl: HTMLElement | null = null

export const detailTarget = readonly(target)
export const isDetailOpenFor = (kind: DetailKind, id: number | undefined) =>
  target.value?.kind === kind && target.value.id === id

// パネル外クリックで閉じる判定から除外するための目印(クリックで開く側に付ける)
export const DETAIL_TRIGGER_ATTR = 'data-detail-trigger'
export const DETAIL_PANEL_ID = 'detail-panel'

// 同じ対象ならトグル、別の対象なら切り替え
export function toggleDetail(kind: DetailKind, id: number, trigger: HTMLElement) {
  if (isDetailOpenFor(kind, id)) {
    closeDetail()
    return
  }
  LOADERS[kind]()
  target.value = { kind, id }
  triggerEl = trigger
}

// Esc/閉じるボタンのときはキーボード操作を続けられるよう、開いた要素へフォーカスを戻す
export function closeDetail(options: { restoreFocus?: boolean } = {}) {
  if (target.value === null) return
  target.value = null
  if (options.restoreFocus) triggerEl?.focus()
  triggerEl = null
}

// --- 詳細データ。種類ごとに初めて開いたときに1回だけ読み込む ---
export interface SupportCardDetailStore {
  byId: Map<number, SupportCardDetail>
  effects: Map<number, { name: string; symbol: SupportEffectSymbol }>
}

const supportStore = shallowRef<SupportCardDetailStore | null>(null)
const outfitStore = shallowRef<Map<number, OutfitDetail> | null>(null)
export const supportCardDetailStore = readonly(supportStore)
export const outfitDetailStore = readonly(outfitStore)

const once = (load: () => Promise<void>) => {
  let loading: Promise<void> | null = null
  return () => {
    loading ??= load()
  }
}

const LOADERS: Record<DetailKind, () => void> = {
  support: once(async () => {
    const data = (await import('@/data/supportCardDetails.json')).default as unknown as SupportCardDetailFile
    supportStore.value = {
      byId: new Map(data.cards.map((c) => [c.id, c])),
      effects: new Map(data.effects.map(([id, name, symbol]) => [id, { name, symbol }])),
    }
  }),
  outfit: once(async () => {
    const data = (await import('@/data/outfitDetails.json')).default as unknown as OutfitDetailFile
    outfitStore.value = new Map(data.outfits.map((o) => [o.id, o]))
  }),
}

// エディタ内(ブロックプレビュー・インライン表示)ではクリックは編集操作なので、詳細パネルを出さない
const DISABLED_KEY: InjectionKey<boolean> = Symbol('detailPanelDisabled')
export const disableDetailPanel = (app?: App) => (app ? app.provide(DISABLED_KEY, true) : provide(DISABLED_KEY, true))
export const isDetailPanelDisabled = () => inject(DISABLED_KEY, false)
