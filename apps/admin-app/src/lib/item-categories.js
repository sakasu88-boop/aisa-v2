/**
 * カテゴリは Algolia ファセット用に固定値のみ許可（表記揺れ防止）
 * 運用で増やす場合はこの配列と Algolia の facet 設定を同期すること。
 */
export const ITEM_CATEGORY_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: 'フルーツ・野菜', label: 'フルーツ・野菜' },
  { value: '精肉・鮮魚', label: '精肉・鮮魚' },
  { value: 'デイリー・チルド', label: 'デイリー・チルド' },
  { value: '惣菜・デリ', label: '惣菜・デリ' },
  { value: '米・パン・麺', label: '米・パン・麺' },
  { value: '調味料・油', label: '調味料・油' },
  { value: '菓子・スナック', label: '菓子・スナック' },
  { value: '飲料・酒類', label: '飲料・酒類' },
  { value: '日用品・雑貨', label: '日用品・雑貨' },
  { value: '洗剤・掃除', label: '洗剤・掃除' },
  { value: 'ベビー・ペット', label: 'ベビー・ペット' },
  { value: 'その他', label: 'その他' },
];

/** @param {string} value */
export function isAllowedCategory(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  return ITEM_CATEGORY_OPTIONS.some((o) => o.value === value && o.value !== '');
}
