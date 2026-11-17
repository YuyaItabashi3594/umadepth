import { inject, provide, readonly, ref, shallowRef, type InjectionKey } from 'vue'
import type { SupportCardDetail, SupportCardDetailFile, SupportEffectSymbol } from '@/types/supportCardDetailType'

// 記事中の<SupportCard>をクリックすると、画面右上に詳細パネル(SupportCardDetailPanel)を1枚だけ出す。
// 開いているカードはアプリ全体で1つなので、状態はモジュールで共有する
const openId = ref<number | null>(null)
let triggerEl: HTMLElement | null = null

export const supportCardDetailId = readonly(openId)

// パネル外クリックで閉じる判定から除外するための目印(カード側に付ける)
export const SUPPORT_CARD_TRIGGER_ATTR = 'data-support-card-trigger'
export const SUPPORT_CARD_PANEL_ID = 'support-card-detail'

// 同じカードならトグル、別のカードなら切り替え
export function toggleSupportCardDetail(id: number, trigger: HTMLElement) {
  if (openId.value === id) {
    closeSupportCardDetail()
    return
  }
  loadSupportCardDetails()
  openId.value = id
  triggerEl = trigger
}

// Esc/閉じるボタンのときはキーボード操作を続けられるよう、開いたカードへフォーカスを戻す
export function closeSupportCardDetail(options: { restoreFocus?: boolean } = {}) {
  if (openId.value === null) return
  openId.value = null
  if (options.restoreFocus) triggerEl?.focus()
  triggerEl = null
}

// --- 詳細データ(src/data/supportCardDetails.json)。初めて開いたときに1回だけ読み込む ---
export interface SupportCardDetailStore {
  byId: Map<number, SupportCardDetail>
  effects: Map<number, { name: string; symbol: SupportEffectSymbol }>
}

const store = shallowRef<SupportCardDetailStore | null>(null)
let loading: Promise<void> | null = null

export const supportCardDetailStore = readonly(store)

function loadSupportCardDetails() {
  loading ??= import('@/data/supportCardDetails.json').then((mod) => {
    const data = mod.default as unknown as SupportCardDetailFile
    store.value = {
      byId: new Map(data.cards.map((c) => [c.id, c])),
      effects: new Map(data.effects.map(([id, name, symbol]) => [id, { name, symbol }])),
    }
  })
}

// エディタのブロックプレビューではクリック = 編集ダイアログなので、配下の<SupportCard>のパネル表示を止める
const DISABLED_KEY: InjectionKey<boolean> = Symbol('supportCardDetailDisabled')
export const disableSupportCardDetail = () => provide(DISABLED_KEY, true)
export const isSupportCardDetailDisabled = () => inject(DISABLED_KEY, false)
