import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

// 記号(## や -)は残したまま、見出しの大きさや強調を記事に近づけて読みやすくする
const markdownHighlight = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.6em', fontWeight: '700' },
  { tag: t.heading2, fontSize: '1.4em', fontWeight: '700' },
  { tag: t.heading3, fontSize: '1.2em', fontWeight: '700' },
  { tag: t.heading4, fontSize: '1.05em', fontWeight: '700' },
  { tag: [t.heading5, t.heading6], fontWeight: '700' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.link, t.url], color: 'var(--color-accent)' },
  { tag: t.monospace, fontFamily: 'monospace', backgroundColor: 'var(--color-background-mute)' },
  // Markdownの記号(# - * > など)は薄くする
  { tag: [t.processingInstruction, t.contentSeparator], color: 'var(--md-mark-color)' },
  { tag: t.quote, fontStyle: 'italic', opacity: '0.85' },
  // コード表示中のVueタグ
  { tag: [t.tagName, t.angleBracket], color: '#2f8f5b', fontFamily: 'monospace' },
  { tag: t.attributeName, color: '#b5652b', fontFamily: 'monospace' },
  { tag: t.attributeValue, color: '#3a6fb0', fontFamily: 'monospace' },
  { tag: t.comment, color: 'var(--md-mark-color)', fontStyle: 'italic' },
])

const editorTheme = EditorView.theme({
  '&': {
    '--md-mark-color': 'rgba(127, 127, 127, 0.75)',
    height: '100%',
    backgroundColor: 'var(--color-background-soft)',
    color: 'var(--color-text)',
    fontSize: '0.95rem',
  },
  '&.cm-focused': { outline: '2px solid var(--color-accent-soft)' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.65' },
  '.cm-content': { padding: '0.75rem 0', caretColor: 'var(--color-text)' },
  '.cm-line': { padding: '0 0.9rem' },
  '.cm-activeLine': { backgroundColor: 'var(--color-accent-soft)' },
  '.cm-cursor': { borderLeftColor: 'var(--color-text)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(184, 134, 11, 0.25)',
  },
  '.cm-block-widget': { padding: '0 0.9rem' },
  '.cm-raw-block': { backgroundColor: 'var(--color-background-mute)', fontFamily: 'monospace', fontSize: '0.85rem' },
  '.cm-raw-header': { padding: '0.15rem 0.9rem 0' },
  '.cm-raw-header button': {
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    background: 'var(--color-background)',
    color: 'var(--color-text)',
    fontSize: '0.75rem',
    padding: '0 0.5rem',
    cursor: 'pointer',
  },
  '.cm-md-image': { padding: '0.25rem 0.9rem' },
  '.cm-md-image img': { maxHeight: '160px', maxWidth: '100%', borderRadius: '4px' },
  '.cm-placeholder': { color: 'var(--md-mark-color)' },
})

export const markdownAppearance = [syntaxHighlighting(markdownHighlight), editorTheme]
