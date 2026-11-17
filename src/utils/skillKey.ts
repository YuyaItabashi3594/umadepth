// 記事の<SkillChip name>とスキル名を突き合わせるためのキー。
// 大文字小文字・空白・記号ゆれ("Do ya breakin!" / "Do Ya Breakin'!")を吸収する。
// scripts/data-sync(書き出し側)とSkillChip.vue(参照側)で同じ関数を使うこと
export function skillKey(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s!?'"‘’“”.,:;~・…\-–—]/g, '')
}

// "Corner Acceleration" で "Corner Acceleration ○" を引けるようにする補助キー
export function stripSkillGrade(key: string): string {
  return key.replace(/[◎○×]/g, '')
}
