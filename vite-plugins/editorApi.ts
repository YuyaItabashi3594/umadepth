import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const ROOT = path.resolve(__dirname, '..')
const CATEGORIES = ['gacha', 'chanmi'] as const
type Category = (typeof CATEGORIES)[number]

const SLUG_RE = /^[a-zA-Z0-9_-]+$/

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}

function articlesDir(category: Category) {
  return path.join(ROOT, 'src', 'views', category)
}

function myumaDir(slug: string) {
  return path.join(ROOT, 'public', 'images', 'myuma', slug)
}

// プレビュー用スクラッチファイル置き場(実記事とは別ディレクトリ、slug不使用でパス固定=traversalリスクなし)
function previewDir() {
  return path.join(ROOT, 'src', 'views', '_editorPreview')
}

// baseDir配下に収まっているかを確認してから解決済みパスを返す（パストラバーサル対策）
function resolveSafe(baseDir: string, filename: string): string | null {
  const target = path.resolve(baseDir, filename)
  if (target !== baseDir && !target.startsWith(baseDir + path.sep)) {
    return null
  }
  return target
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function serializeFrontmatter(frontmatter: Record<string, string>): string {
  const lines = Object.entries(frontmatter).map(([key, value]) => {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    return `${key}: "${escaped}"`
  })
  return `---\n${lines.join('\n')}\n---\n\n`
}

export function editorApiPlugin(): Plugin {
  return {
    name: 'editor-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__editor-api', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost')
          const parts = url.pathname.split('/').filter(Boolean)

          // GET /__editor-api/articles/:category
          if (req.method === 'GET' && parts[0] === 'articles' && parts.length === 2) {
            const category = parts[1]
            if (!isCategory(category)) return sendJson(res, 400, { error: 'invalid category' })
            const dir = articlesDir(category)
            const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
            return sendJson(
              res,
              200,
              files.map((f) => f.replace(/\.md$/, '')),
            )
          }

          // GET /__editor-api/articles/:category/:slug
          if (req.method === 'GET' && parts[0] === 'articles' && parts.length === 3) {
            const category = parts[1]
            const slug = parts[2]
            if (!isCategory(category)) return sendJson(res, 400, { error: 'invalid category' })
            if (!SLUG_RE.test(slug)) return sendJson(res, 400, { error: 'invalid slug' })
            const filePath = resolveSafe(articlesDir(category), `${slug}.md`)
            if (!filePath || !fs.existsSync(filePath)) return sendJson(res, 404, { error: 'not found' })
            const content = fs.readFileSync(filePath, 'utf-8')
            return sendJson(res, 200, { content })
          }

          // POST /__editor-api/articles
          if (req.method === 'POST' && parts[0] === 'articles' && parts.length === 1) {
            const raw = await readRequestBody(req)
            const payload = JSON.parse(raw) as {
              category: string
              slug: string
              frontmatter?: Record<string, string>
              body: string
            }
            if (!isCategory(payload.category)) return sendJson(res, 400, { error: 'invalid category' })
            if (!SLUG_RE.test(payload.slug)) return sendJson(res, 400, { error: 'invalid slug' })
            const filePath = resolveSafe(articlesDir(payload.category), `${payload.slug}.md`)
            if (!filePath) return sendJson(res, 400, { error: 'invalid path' })
            const content = payload.frontmatter
              ? serializeFrontmatter(payload.frontmatter) + payload.body
              : payload.body
            fs.writeFileSync(filePath, content, 'utf-8')
            return sendJson(res, 200, { ok: true })
          }

          // POST /__editor-api/preview
          if (req.method === 'POST' && parts[0] === 'preview' && parts.length === 1) {
            const raw = await readRequestBody(req)
            const payload = JSON.parse(raw) as {
              category: string
              frontmatter?: Record<string, string>
              body: string
            }
            if (!isCategory(payload.category)) return sendJson(res, 400, { error: 'invalid category' })
            const dir = previewDir()
            fs.mkdirSync(dir, { recursive: true })
            const content = payload.frontmatter
              ? serializeFrontmatter(payload.frontmatter) + payload.body
              : payload.body
            fs.writeFileSync(path.join(dir, `${payload.category}.md`), content, 'utf-8')
            return sendJson(res, 200, { ok: true })
          }

          // GET /__editor-api/images/:slug
          if (req.method === 'GET' && parts[0] === 'images' && parts.length === 2) {
            const slug = parts[1]
            if (!SLUG_RE.test(slug)) return sendJson(res, 400, { error: 'invalid slug' })
            const dir = myumaDir(slug)
            if (!fs.existsSync(dir)) return sendJson(res, 200, [])
            const files = fs.readdirSync(dir).filter((f) => !f.startsWith('.'))
            return sendJson(res, 200, files)
          }

          sendJson(res, 404, { error: 'unknown endpoint' })
        } catch (err) {
          sendJson(res, 500, { error: err instanceof Error ? err.message : 'internal error' })
        }
      })
    },
  }
}
