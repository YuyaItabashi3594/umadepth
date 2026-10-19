<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import ComponentToolbar from '@/components/editor/ComponentToolbar.vue'
import {
  GACHA_FRONTMATTER_FIELDS,
  emptyGachaFrontmatter,
  parseFrontmatter,
  splitChanmiScript,
  buildGachaBodyTemplate,
  CHANMI_BODY_TEMPLATE,
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
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const savedSlug = ref('')

const effectiveSlug = computed(() => (mode.value === 'edit' ? selectedExistingSlug.value : newSlug.value))

const savedArticleUrl = computed(() => {
  if (category.value === 'gacha') return '/gacha'
  return `/chanmi/${savedSlug.value}`
})

const previewUrl = computed(() => `/editor-preview/${category.value}`)

// 既存記事の構成に沿ったテンプレをbodyの初期状態として差し込む
const applyTemplate = () => {
  body.value =
    category.value === 'gacha' ? buildGachaBodyTemplate(frontmatter.gacha ?? '') : CHANMI_BODY_TEMPLATE
}

const resetForm = () => {
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
}
const schedulePreview = () => {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(pushPreview, 400)
}
watch([body, scriptPrefix, category, frontmatter], schedulePreview, { deep: true })
onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
})

fetchExistingSlugs()
applyTemplate()
schedulePreview()

const insertSnippet = (snippet: string) => {
  const el = textareaRef.value
  if (!el) {
    body.value += snippet
    return
  }
  const start = el.selectionStart
  const end = el.selectionEnd
  body.value = body.value.slice(0, start) + snippet + body.value.slice(end)
  nextTick(() => {
    el.focus()
    const pos = start + snippet.length
    el.setSelectionRange(pos, pos)
  })
}

const getSelectedText = () => {
  const el = textareaRef.value
  if (!el) return ''
  return body.value.slice(el.selectionStart, el.selectionEnd)
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

    <section v-if="category === 'gacha'" class="info-card frontmatter-form">
      <div v-for="field in GACHA_FRONTMATTER_FIELDS" :key="field.key" class="frontmatter-field">
        <label :for="`fm-${field.key}`">{{ field.label }}</label>
        <input :id="`fm-${field.key}`" v-model="frontmatter[field.key]" type="text" />
      </div>
    </section>

    <ComponentToolbar :slug="effectiveSlug" :get-selected-text="getSelectedText" @insert="insertSnippet" />

    <div v-if="mode === 'new'" class="template-row">
      <button type="button" class="template-btn" @click="applyTemplate">テンプレートを再挿入</button>
      <span class="hint">現在の本文を既存記事の構成テンプレで上書きします(gachaは上のgacha欄から見出しを生成)</span>
    </div>

    <div class="editor-split">
      <textarea
        ref="textareaRef"
        v-model="body"
        class="body-textarea"
        rows="20"
        placeholder="本文(Markdown)"
      />
      <div class="preview-pane">
        <div class="preview-header">
          <span>プレビュー</span>
          <a :href="previewUrl" target="_blank" rel="noopener" class="preview-open-link"
            >別タブで開く</a
          >
        </div>
        <iframe :src="previewUrl" class="preview-frame" title="記事プレビュー" />
      </div>
    </div>

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

.editor-split {
  display: flex;
  gap: 1rem;
  align-items: stretch;
}

.editor-split .body-textarea {
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
  height: 460px;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

@media (max-width: 900px) {
  .editor-split {
    flex-direction: column;
  }
}

.body-textarea {
  width: 100%;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  color: var(--color-text);
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.9rem;
  resize: vertical;
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
