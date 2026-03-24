/**
 * 共有ドメイン型（firebase / firebase-admin に依存しない）
 *
 * 時刻は **エポックミリ秒（number）** を正とする値オブジェクトとし、
 * Firestore では保存直前に `serverTimestamp()` / 読取後に `toMillis()` で変換する。
 * これによりクライアント SDK の Timestamp と Admin SDK の Timestamp の型競合を避ける。
 */
export type UnixMs = number;

/** マップ上の正規化座標（0–1） */
export interface ItemLocation {
  x: number;
  y: number;
  sectionName?: string;
}

/**
 * 論理モデル（stores/{storeId}/items/{itemId}）
 * Firestore 実体では `updatedAt` に Timestamp を置く場合、リポジトリ層で updatedAtMs ↔ Timestamp を変換する。
 */
export interface StoreItemDoc {
  name: string;
  category: string;
  location: ItemLocation;
  guideText: string;
  chainId: string;
  storeId: string;
  /** 更新時刻（ms）。永続化時は各環境の serverTimestamp / Algolia は updatedAtMs に写す */
  updatedAtMs: UnixMs;

  /** 内部棚番（お客様 UI 非表示。Algolia 同期からも除外推奨） */
  internalCode?: string;
  displayLabel?: string;
  categoryIcon?: string;
  themeColor?: string;

  sku?: string;
  price?: number;
  searchKeywords?: string[];
  imageUrl?: string;
}

/** Algolia に載せる公開レコード（internalCode は含めない） */
export type AlgoliaItemRecord = {
  objectID: string;
  storeId: string;
  itemId: string;
  chainId?: string;
  name: string;
  category: string;
  guideText: string;
  location: ItemLocation | null;
  displayLabel?: string;
  categoryIcon?: string;
  themeColor?: string;
  updatedAtMs?: number;
};
