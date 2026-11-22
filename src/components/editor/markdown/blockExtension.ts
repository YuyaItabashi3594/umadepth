import { createApp, type App, type Component } from 'vue'
import { Facet, RangeSet, StateEffect, StateField, type EditorState, type Extension, type Range } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import SkillChip from '@/components/SkillChip.vue'
import UmaChip from '@/components/UmaChip.vue'
import { disableDetailPanel } from '@/composables/useDetailPanel'
import BlockPreview from './BlockPreview.vue'
import { scanDocument, type ComponentBlock, type ScanResult } from './componentBlocks'
import { COMPONENT_LABELS } from '../editorShared'

// コンポーネントブロックを実物の見た目(Vue)に置き換えるCodeMirror拡張。
// 文書(Markdown文字列)自体は一切変えず、表示だけを差し替える

export interface BlockHandlers {
  edit: (block: ComponentBlock) => void
}

// ブロック単位で「コード表示」に切り替える(値は各ブロックのfrom)
export const toggleRawBlock = StateEffect.define<number>()
// 全ブロックをコード表示にする
export const setAllRaw = StateEffect.define<boolean>()

interface BlockState {
  scan: ScanResult
  rawFroms: Set<number>
  allRaw: boolean
  decorations: DecorationSet
  atomic: DecorationSet
}

// --- ウィジェット ---

const mountedApps = new WeakMap<HTMLElement, App>()

// Vueコンポーネントを1つのウィジェットとしてマウントする。keyが同じなら再描画しない(上の行を編集してもチラつかない)
class VueWidget extends WidgetType {
  constructor(
    readonly key: string,
    readonly component: Component,
    readonly props: (view: EditorView, dom: HTMLElement) => Record<string, unknown>,
    readonly inline: boolean,
  ) {
    super()
  }

  eq(other: WidgetType) {
    return other instanceof VueWidget && other.key === this.key
  }

  toDOM(view: EditorView) {
    const dom = document.createElement(this.inline ? 'span' : 'div')
    dom.className = this.inline ? 'cm-inline-widget' : 'cm-block-widget'
    const app = createApp(this.component, this.props(view, dom))
    // エディタ内のクリックは編集操作なので、カード/ウマ娘の詳細パネルは出さない
    disableDetailPanel(app)
    app.mount(dom)
    mountedApps.set(dom, app)
    // 画像の読み込みで高さが変わるので、CodeMirrorに再計測させる
    dom.addEventListener('load', () => view.requestMeasure(), true)
    return dom
  }

  destroy(dom: HTMLElement) {
    mountedApps.get(dom)?.unmount()
    mountedApps.delete(dom)
  }

  // ブロック内のボタン操作をCodeMirrorに奪われないようにする。インラインはクリックでカーソルを置けるようにする
  ignoreEvent() {
    return !this.inline
  }
}

// コード表示中のブロックの上に出す「表示に戻す」バー
class RawHeaderWidget extends WidgetType {
  constructor(readonly label: string) {
    super()
  }

  eq(other: WidgetType) {
    return other instanceof RawHeaderWidget && other.label === this.label
  }

  toDOM(view: EditorView) {
    const dom = document.createElement('div')
    dom.className = 'cm-raw-header'
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = `▲ ${this.label} を表示に戻す`
    button.addEventListener('click', () => {
      view.dispatch({ effects: toggleRawBlock.of(view.posAtDOM(dom)) })
    })
    dom.append(button)
    return dom
  }

  ignoreEvent() {
    return true
  }
}

class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
  ) {
    super()
  }

  eq(other: WidgetType) {
    return other instanceof ImageWidget && other.src === this.src && other.alt === this.alt
  }

  toDOM(view: EditorView) {
    const dom = document.createElement('div')
    dom.className = 'cm-md-image'
    const img = document.createElement('img')
    img.src = this.src
    img.alt = this.alt
    img.addEventListener('load', () => view.requestMeasure())
    dom.append(img)
    return dom
  }
}

const BLOCK_LABELS: Record<ComponentBlock['kind'], string> = {
  supportcard: COMPONENT_LABELS.supportcard,
  cardrow: COMPONENT_LABELS.cardrow,
  imagemodal: COMPONENT_LABELS.imagemodal,
  imagedescription: COMPONENT_LABELS.imagedescription,
  'collapsible-open': COMPONENT_LABELS.collapsible,
  'collapsible-close': `${COMPONENT_LABELS.collapsible}(終わり)`,
}

// --- 状態 ---

function blockAtDom(view: EditorView, dom: HTMLElement): ComponentBlock | undefined {
  const pos = view.posAtDOM(dom)
  return view.state.field(blockField).scan.blocks.find((b) => b.from === pos)
}

const handlersFacet = Facet.define<BlockHandlers, BlockHandlers>({
  combine: (values) => values[0] ?? { edit: () => {} },
})

function buildDecorations(state: EditorState, value: Omit<BlockState, 'decorations' | 'atomic'>) {
  const decos: Range<Decoration>[] = []
  const atomic: Range<Decoration>[] = []
  const { scan, rawFroms, allRaw } = value

  for (const block of scan.blocks) {
    const label = BLOCK_LABELS[block.kind]
    if (allRaw || rawFroms.has(block.from)) {
      if (!allRaw) {
        decos.push(Decoration.widget({ widget: new RawHeaderWidget(label), block: true, side: -1 }).range(block.from))
      }
      for (let pos = block.from; pos <= block.to; ) {
        const line = state.doc.lineAt(pos)
        decos.push(Decoration.line({ class: 'cm-raw-block' }).range(line.from))
        pos = line.to + 1
      }
      continue
    }
    const widget = new VueWidget(
      `${block.kind}:${block.source}`,
      BlockPreview,
      (view, dom) => ({
        block,
        label,
        onEdit: () => {
          const current = blockAtDom(view, dom)
          if (current) view.state.facet(handlersFacet).edit(current)
        },
        onRaw: () => view.dispatch({ effects: toggleRawBlock.of(view.posAtDOM(dom)) }),
      }),
      false,
    )
    const deco = Decoration.replace({ widget, block: true })
    decos.push(deco.range(block.from, block.to))
    atomic.push(deco.range(block.from, block.to))
  }

  // インラインのSkillChip/UmaChipは、カーソルが重なっている間だけコードを見せる
  const head = state.selection.main
  const inlineChips = [
    ...scan.skills.map((chip) => ({ chip, kind: 'skill', component: SkillChip })),
    ...scan.umas.map((chip) => ({ chip, kind: 'uma', component: UmaChip })),
  ]
  for (const { chip, kind, component } of inlineChips) {
    if (allRaw || (head.from <= chip.to && head.to >= chip.from)) continue
    const widget = new VueWidget(`${kind}:${chip.name}:${chip.id}`, component, () => ({ name: chip.name, id: chip.id }), true)
    decos.push(Decoration.replace({ widget }).range(chip.from, chip.to))
  }

  if (!allRaw) {
    for (const image of scan.images) {
      decos.push(Decoration.widget({ widget: new ImageWidget(image.src, image.alt), block: true, side: 1 }).range(image.lineEnd))
    }
  }

  return { decorations: Decoration.set(decos, true), atomic: Decoration.set(atomic, true) }
}

const blockField = StateField.define<BlockState>({
  create(state) {
    const base = { scan: scanDocument(state.doc.toString()), rawFroms: new Set<number>(), allRaw: false }
    return { ...base, ...buildDecorations(state, base) }
  },
  update(value, tr) {
    let { scan, rawFroms, allRaw } = value
    let changed = false
    if (tr.docChanged) {
      scan = scanDocument(tr.state.doc.toString())
      rawFroms = new Set([...rawFroms].map((pos) => tr.changes.mapPos(pos, 1)))
      changed = true
    }
    for (const effect of tr.effects) {
      if (effect.is(toggleRawBlock)) {
        rawFroms = new Set(rawFroms)
        if (rawFroms.has(effect.value)) rawFroms.delete(effect.value)
        else rawFroms.add(effect.value)
        changed = true
      } else if (effect.is(setAllRaw)) {
        allRaw = effect.value
        rawFroms = new Set()
        changed = true
      }
    }
    // インラインのスキル表示はカーソル位置で変わるので、選択変更でも作り直す
    if (!changed && !tr.selection) return value
    const base = { scan, rawFroms, allRaw }
    return { ...base, ...buildDecorations(tr.state, base) }
  },
  provide: (field) => [
    EditorView.decorations.from(field, (v) => v.decorations),
    // ブロックはカーソル移動で1文字ずつ入り込まないよう1塊として扱う
    EditorView.atomicRanges.of((view) => view.state.field(field).atomic ?? RangeSet.empty),
  ],
})

export function componentBlocks(blockHandlers: BlockHandlers): Extension {
  return [handlersFacet.of(blockHandlers), blockField]
}

export function getBlocks(state: EditorState): ComponentBlock[] {
  return state.field(blockField).scan.blocks
}
