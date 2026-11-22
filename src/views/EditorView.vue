<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import ComponentToolbar from '@/components/editor/ComponentToolbar.vue'
import GachaBannerPicker from '@/components/editor/GachaBannerPicker.vue'
import ChanmiEventPicker from '@/components/editor/ChanmiEventPicker.vue'
import { chanmiSlugOf, type ChampionsMeeting } from '@/utils/championsMeeting'
import MarkdownEditor from '@/components/editor/markdown/MarkdownEditor.vue'
import BlockEditDialog from '@/components/editor/markdown/BlockEditDialog.vue'
import type { ComponentBlock } from '@/components/editor/markdown/componentBlocks'
import {
  GACHA_FRONTMATTER_FIELDS,
  emptyGachaFrontmatter,
  parseFrontmatter,
  splitChanmiScript,
  buildGachaBodyTemplate,
  CHANMI_BODY_TEMPLATE,
  PREVIEW_FRONTMATTER_MESSAGE,
  fillChanmiCourse,
} from '@/components/editor/editorShared'

type Category = 'gacha' | 'chanmi'
type Mode = 'new' | 'edit'

const category = ref<Category>('gacha')
const mode = ref<Mode>('new')
const existingSlugs = ref<string[]>([])
const selectedExistingSlug = ref('')
const newSlug = ref('')
const frontmatter = reactive(emptyGachaFrontmatter())
const body = ref('')
const scriptPrefix = ref('')
const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)
// 見た目表示がおかしいときの逃げ道として、全ブロックをコードで表示できるようにする
const showAllCode = ref(false)
const showPreview = ref(true)
const editingBlock = ref<ComponentBlock | null>(null)
const blockEditError = ref('')
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const savedSlug = ref('')

const effectiveSlug = computed(() => (mode.value === 'edit' ? selectedExistingSlug.value : newSlug.value))

const savedArticleUrl = computed(() => {
  if (category.value === 'gacha') return '/gacha'
  return `/chanmi/${savedSlug.value}`
})

const previewUrl = computed(() => `/editor-preview/${category.value}`)

// bannerが未設定の既存記事は従来の画像を表示しているので、それを選択欄にも見せる
const gachaFallbackSrc = computed(() =>
  mode.value === 'edit' && selectedExistingSlug.value ? `/images/gacha/${selectedExistingSlug.value}.png` : undefined,
)

// ガチャ名が空なら選んだウマ娘/サポカの名前で埋める(既に入力済みなら触らない)
const onBannerPicked = (label: string) => {
  if (!frontmatter.gacha?.trim()) frontmatter.gacha = label
}

// 新規chanmi記事で選んだ開催(公式告知の開催一覧から)
const selectedMeeting = ref<ChampionsMeeting | null>(null)

// 既存記事の構成に沿ったテンプレをbodyの初期状態として差し込む(開催を選んでいればコース欄も埋める)
const applyTemplate = () => {
  if (category.value === 'gacha') {
    body.value = buildGachaBodyTemplate(frontmatter.gacha ?? '')
    return
  }
  const conditions = selectedMeeting.value?.conditions
  body.value = conditions ? fillChanmiCourse(CHANMI_BODY_TEMPLATE, conditions) : CHANMI_BODY_TEMPLATE
}

// slugは記事一覧のバナー/開催日と紐づく規則(leo2 = Leo 2回目)で決まるので自動入力する。本文はコース欄だけ書き換える
const onMeetingPicked = (meeting: ChampionsMeeting) => {
  selectedMeeting.value = meeting
  newSlug.value = chanmiSlugOf(meeting.series, meeting.round)
  if (meeting.conditions) body.value = fillChanmiCourse(body.value, meeting.conditions)
}

const resetForm = () => {
  selectedMeeting.value = null
  Object.assign(frontmatter, emptyGachaFrontmatter())
  scriptPrefix.value = ''
  newSlug.value = ''
  selectedExistingSlug.value = ''
  saveStatus.value = 'idle'
  body.value = ''
  if (mode.value === 'new') applyTemplate()
}

const fetchExistingSlugs = async () => {
  const res = await fetch(`/__editor-api/articles/${category.value}`)
  existingSlugs.value = res.ok ? await res.json() : []
}

watch(category, () => {
  resetForm()
  fetchExistingSlugs()
})

watch(mode, () => {
  saveStatus.value = 'idle'
  if (mode.value === 'edit') {
    fetchExistingSlugs()
  } else {
    resetForm()
  }
})

watch(selectedExistingSlug, async (slug) => {
  if (!slug) return
  const res = await fetch(`/__editor-api/articles/${category.value}/${slug}`)
  if (!res.ok) return
  const { content } = await res.json()
  if (category.value === 'gacha') {
    const { frontmatter: parsed, body: parsedBody } = parseFrontmatter(content)
    Object.assign(frontmatter, emptyGachaFrontmatter(), parsed)
    body.value = parsedBody
    scriptPrefix.value = ''
  } else {
    const { scriptPrefix: prefix, body: parsedBody } = splitChanmiScript(content)
    scriptPrefix.value = prefix
    body.value = parsedBody
  }
})

// 本文/frontmatterの編集内容をプレビュー用スクラッチファイルへ書き出す(実記事は一切変更しない)
let previewTimer: ReturnType<typeof setTimeout> | null = null
const pushPreview = async () => {
  const fullBody = category.value === 'chanmi' ? scriptPrefix.value + body.value : body.value
  const payload: Record<string, unknown> = { category: category.value, body: fullBody }
  if (category.value === 'gacha') payload.frontmatter = { ...frontmatter }
  try {
    await fetch('/__editor-api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // プレビュー更新の失敗は致命的ではないので握りつぶす
  }
  postFrontmatterToPreview()
}

// MarkdownのHMRは本文(コンポーネント)しか差し替えず、frontmatter(名前付きexport)は古いまま残る。
// ガチャ名・目玉画像・おすすめ表をすぐ反映させるため、frontmatterはiframeへ直接送る。
// chanmiはfrontmatterが無いので、記事冒頭のコース図を出すためにslugだけ送る
const previewFrameRef = ref<HTMLIFrameElement | null>(null)
const postFrontmatterToPreview = () => {
  const payload = category.value === 'gacha' ? { ...frontmatter } : { slug: effectiveSlug.value }
  previewFrameRef.value?.contentWindow?.postMessage(
    { type: PREVIEW_FRONTMATTER_MESSAGE, category: category.value, frontmatter: payload },
    window.location.origin,
  )
}
const schedulePreview = () => {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(pushPreview, 400)
}
watch([body, scriptPrefix, category, frontmatter], schedulePreview, { deep: true })
watch(effectiveSlug, postFrontmatterToPreview)
onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
})

fetchExistingSlugs()
applyTemplate()
schedulePreview()

// ブロック要素は行の途中でも前後を改行で区切って入れる。インライン(育成ウマ娘のチップ)はカーソル位置にそのまま入れる
const insertSnippet = (snippet: string, options: { inline: boolean } = { inline: false }) => {
  if (editorRef.value) editorRef.value.insert(snippet, { block: !options.inline })
  else body.value += snippet
}

const getSelectedText = () => editorRef.value?.getSelectedText() ?? ''

const openBlockEditor = (block: ComponentBlock) => {
  blockEditError.value = ''
  editingBlock.value = block
}

const applyBlockEdit = (snippet: string) => {
  const block = editingBlock.value
  if (!block) return
  if (editorRef.value?.replaceBlock(block, snippet)) {
    editingBlock.value = null
  } else {
    blockEditError.value = '編集中に本文が変わったため適用できませんでした。もう一度ブロックの「編集」から開き直してください。'
    editingBlock.value = null
  }
}

const save = async () => {
  if (!effectiveSlug.value) {
    saveStatus.value = 'error'
    return
  }
  saveStatus.value = 'saving'
  const fullBody = category.value === 'chanmi' ? scriptPrefix.value + body.value : body.value
  const payload: Record<string, unknown> = {
    category: category.value,
    slug: effectiveSlug.value,
    body: fullBody,
  }
  if (category.value === 'gacha') {
    payload.frontmatter = { ...frontmatter }
  }
  try {
    const res = await fetch('/__editor-api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('save failed')
    savedSlug.value = effectiveSlug.value
    saveStatus.value = 'saved'
    await fetchExistingSlugs()
  } catch {
    saveStatus.value = 'error'
  }
}
</script>

<template>
  <div class="editor-view">
    <h1>Article Editor</h1>
    <p class="dev-note">開発時限定のローカルツールです。本番ビルドには含まれません。</p>

    <div class="controls-row">
      <label>
        カテゴリ
        <select v-model="category">
          <option value="gacha">gacha</option>
          <option value="chanmi">chanmi</option>
        </select>
      </label>
      <label>
        モード
        <select v-model="mode">
          <option value="new">新規</option>
          <option value="edit">既存編集</option>
        </select>
      </label>
    </div>

    <div v-if="mode === 'edit'" class="controls-row">
      <label>
        編集対象
        <select v-model="selectedExistingSlug">
          <option value="" disabled>選択してください</option>
          <option v-for="slug in existingSlugs" :key="slug" :value="slug">{{ slug }}</option>
        </select>
      </label>
    </div>
    <div v-else class="controls-row">
      <label>
        slug(ファイル名)
        <input v-model="newSlug" type="text" placeholder="gachaなら日付(2026-07-01)、chanmiなら任意のslug" />
      </label>
    </div>

    <section v-if="category === 'chanmi' && mode === 'new'" class="info-card">
      <ChanmiEventPicker :existing-slugs="existingSlugs" :selected="selectedMeeting" @select="onMeetingPicked" />
    </section>

    <section v-if="category === 'gacha'" class="info-card gacha-meta">
      <GachaBannerPicker v-model="frontmatter.banner!" :fallback-src="gachaFallbackSrc" @picked="onBannerPicked" />
      <div class="frontmatter-form">
        <div v-for="field in GACHA_FRONTMATTER_FIELDS" :key="field.key" class="frontmatter-field">
          <label :for="`fm-${field.key}`">{{ field.label }}</label>
          <input :id="`fm-${field.key}`" v-model="frontmatter[field.key]" type="text" />
        </div>
      </div>
    </section>

    <ComponentToolbar :slug="effectiveSlug" :get-selected-text="getSelectedText" @insert="insertSnippet" />

    <div v-if="mode === 'new'" class="template-row">
      <button type="button" class="template-btn" @click="applyTemplate">テンプレートを再挿入</button>
      <span class="hint">現在の本文を既存記事の構成テンプレで上書きします(gachaは上のgacha欄から見出しを生成)</span>
    </div>

    <div class="view-options">
      <label><input v-model="showAllCode" type="checkbox" /> すべてコードで表示</label>
      <label><input v-model="showPreview" type="checkbox" /> プレビューを表示</label>
      <span class="hint">ブロックは「編集」かクリックでフォームを開き、「&lt;/&gt;」でそのブロックだけコード表示</span>
    </div>
    <p v-if="blockEditError" class="status-error">{{ blockEditError }}</p>

    <div class="editor-split">
      <MarkdownEditor
        ref="editorRef"
        v-model="body"
        class="body-editor"
        :all-raw="showAllCode"
        placeholder="本文(Markdown)"
        @edit-block="openBlockEditor"
      />
      <div v-if="showPreview" class="preview-pane">
        <div class="preview-header">
          <span>プレビュー</span>
          <a :href="previewUrl" target="_blank" rel="noopener" class="preview-open-link"
            >別タブで開く</a
          >
        </div>
        <iframe
          ref="previewFrameRef"
          :src="previewUrl"
          class="preview-frame"
          title="記事プレビュー"
          @load="postFrontmatterToPreview"
        />
      </div>
    </div>

    <BlockEditDialog
      v-if="editingBlock"
      :key="editingBlock.from"
      :block="editingBlock"
      :slug="effectiveSlug"
      @apply="applyBlockEdit"
      @close="editingBlock = null"
    />

    <div class="save-row">
      <button type="button" class="save-btn" :disabled="!effectiveSlug || saveStatus === 'saving'" @click="save">
        保存
      </button>
      <span v-if="saveStatus === 'saved'" class="status-saved">
        保存しました。<RouterLink :to="savedArticleUrl">記事を確認する</RouterLink>
      </span>
      <span v-else-if="saveStatus === 'error'" class="status-error">保存に失敗しました</span>
    </div>
  </div>
</template>

<style scoped>
.editor-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dev-note {
  font-size: 0.85rem;
  opacity: 0.7;
}

.controls-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.controls-row label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.controls-row select,
.controls-row input {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.35rem 0.5rem;
  min-width: 260px;
}

.template-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.template-btn {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.template-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.template-row .hint {
  font-size: 0.75rem;
  opacity: 0.7;
}

.gacha-meta {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.frontmatter-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.frontmatter-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.frontmatter-field label {
  font-size: 0.8rem;
  opacity: 0.8;
}

.frontmatter-field input {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.35rem 0.5rem;
}

.view-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  font-size: 0.85rem;
}

.view-options .hint {
  font-size: 0.75rem;
  opacity: 0.7;
}

.editor-split {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  height: 75vh;
  min-height: 420px;
}

.editor-split .body-editor {
  flex: 1;
  min-width: 0;
}

.preview-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  opacity: 0.8;
}

.preview-open-link {
  color: var(--color-accent);
}

.preview-frame {
  flex: 1;
  width: 100%;
  min-height: 0;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

@media (max-width: 900px) {
  .editor-split {
    flex-direction: column;
    height: auto;
  }

  .editor-split .body-editor {
    height: 70vh;
  }

  .preview-frame {
    height: 60vh;
  }
}

.save-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.save-btn {
  background-color: var(--color-accent);
  border: none;
  border-radius: 4px;
  color: #000;
  padding: 0.5rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-saved {
  color: var(--color-accent);
}

.status-error {
  color: #e05252;
}
</style>
