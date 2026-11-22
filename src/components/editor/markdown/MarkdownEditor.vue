<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState, Transaction } from '@codemirror/state'
import { EditorView, drawSelection, highlightActiveLine, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { componentBlocks, setAllRaw } from './blockExtension'
import { markdownAppearance } from './markdownTheme'
import type { ComponentBlock } from './componentBlocks'

// Markdownはテキストのまま、Vueコンポーネント部分だけを見た目で表示するエディタ
const model = defineModel<string>({ required: true })
const props = defineProps<{ allRaw?: boolean; placeholder?: string }>()
const emit = defineEmits<{ editBlock: [ComponentBlock] }>()

const host = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null
// 自分が発火したupdate:modelValueが戻ってきたときに文書を差し替えないための控え
let lastEmitted = model.value

onMounted(() => {
  if (!host.value) return
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: model.value,
      extensions: [
        history(),
        drawSelection(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        markdown({ base: markdownLanguage }),
        markdownAppearance,
        cmPlaceholder(props.placeholder ?? ''),
        componentBlocks({ edit: (block) => emit('editBlock', block) }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return
          lastEmitted = update.state.doc.toString()
          model.value = lastEmitted
        }),
      ],
    }),
  })
  if (props.allRaw) view.dispatch({ effects: setAllRaw.of(true) })
})

// 記事の読み込みやテンプレ適用など外部からの差し替え。Ctrl+Zで読み込み前に戻らないよう履歴に積まない
watch(model, (value) => {
  if (!view || value === lastEmitted) return
  lastEmitted = value
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
    annotations: Transaction.addToHistory.of(false),
  })
})

watch(
  () => props.allRaw,
  (value) => view?.dispatch({ effects: setAllRaw.of(!!value) }),
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

// ブロック系スニペットは行の途中に入るとブロックとして認識されないので、前後を改行で区切る。
// 挿入はエディタ上のパネルから続けて行うことがあるので、ページ自体はスクロールさせない(カーソル位置へはエディタ内だけスクロール)
function insert(text: string, options: { block?: boolean } = {}) {
  if (!view) return
  const { scrollX, scrollY } = window
  const { from, to } = view.state.selection.main
  let insertText = text
  if (options.block) {
    const doc = view.state.doc
    if (from > doc.lineAt(from).from) insertText = `\n${insertText}`
    if (to < doc.lineAt(to).to) insertText = `${insertText}\n`
  }
  view.dispatch({
    changes: { from, to, insert: insertText },
    selection: { anchor: from + insertText.length },
    scrollIntoView: true,
  })
  view.focus()
  // CodeMirrorのscrollIntoViewは外側(ウィンドウ)もスクロールする。エディタ内のスクロールが済んだ後で戻す
  requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
}

function getSelectedText(): string {
  if (!view) return ''
  const { from, to } = view.state.selection.main
  return view.state.sliceDoc(from, to)
}

// 編集ダイアログを開いている間に本文が変わっていたら、別の場所を上書きしないよう中止する
function replaceBlock(block: ComponentBlock, text: string): boolean {
  if (!view || view.state.sliceDoc(block.from, block.to) !== block.source) return false
  view.dispatch({ changes: { from: block.from, to: block.to, insert: text } })
  view.focus()
  return true
}

defineExpose({ insert, getSelectedText, replaceBlock })
</script>

<template>
  <div ref="host" class="markdown-editor" />
</template>

<style scoped>
.markdown-editor {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

.markdown-editor :deep(.cm-editor) {
  height: 100%;
}
</style>
