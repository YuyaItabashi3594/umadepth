// APIの文字列にはNBSPやゼロ幅スペースが混入しているので、保存前に揃える。
// 日本語の全角文字まで変換されるのでNFKCは使わない。
export function normalizeText(value: string): string {
  return value
    .replace(/[​-‍⁠﻿]/g, '')
    .replace(/ /g, ' ')
    .trim()
}

export function nowIso(): string {
  return new Date().toISOString()
}
