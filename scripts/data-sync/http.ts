export const UMAPYOI_BASE = 'https://umapyoi.net'
export const GAMETORA_BASE = 'https://gametora.com'

// 外部サイトに負荷をかけないよう、ホストごとに最低間隔を空けてリクエストする
const USER_AGENT = 'umadepth-sync/1.0 (personal fan guide; low-frequency manual sync)'
const MIN_INTERVAL_MS = 1000
const MAX_RETRIES = 2

const lastRequestAt = new Map<string, number>()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class HttpError extends Error {
  readonly status: number

  constructor(url: string, status: number) {
    super(`HTTP ${status}: ${url}`)
    this.status = status
  }
}

async function throttle(host: string) {
  const wait = (lastRequestAt.get(host) ?? 0) + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt.set(host, Date.now())
}

export async function politeFetch(url: string): Promise<Response> {
  const host = new URL(url).host
  for (let attempt = 0; ; attempt++) {
    await throttle(host)
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    // 429/5xxは少し待ってリトライ。それ以外はそのまま返して呼び出し側で判断する
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      await sleep(5000 * (attempt + 1))
      continue
    }
    return res
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await politeFetch(url)
  if (!res.ok) throw new HttpError(url, res.status)
  return (await res.json()) as T
}

export async function fetchText(url: string): Promise<string> {
  const res = await politeFetch(url)
  if (!res.ok) throw new HttpError(url, res.status)
  return res.text()
}

export async function fetchBinary(url: string): Promise<{ contentType: string; body: Buffer }> {
  const res = await politeFetch(url)
  if (!res.ok) throw new HttpError(url, res.status)
  return {
    contentType: res.headers.get('content-type') ?? '',
    body: Buffer.from(await res.arrayBuffer()),
  }
}
