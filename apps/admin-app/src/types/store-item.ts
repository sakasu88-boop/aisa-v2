import type { Timestamp } from 'firebase/firestore';

/**
 * stores/{storeId}/items/{itemId} — Firestore 正本
 * セキュリティルール用に chainId / storeId を必ず含める（パス上の storeId と一致）
 *
 * 論理モデル・時刻の値オブジェクト（ms）は `apps/shared-schema/item.ts`。
 * ここでは Firestore SDK の `Timestamp` をそのまま扱う。
 */
export interface StoreItemLocation {
  /** 0–1（画像マップ上の位置。レターボックス除く描画矩形基準） */
  x: number;
  y: number;
  /** 例: A-3棚。顧客向けラベル・Algolia フィルタ用 */
  sectionName?: string;
}

export type StockStatus = 'in_stock' | 'low' | 'out_of_stock' | 'unknown';

/**
 * Algolia 同期（Functions）で検索・絞り込みに使う項目。
 * 不要なフィールドは省略してよいが、追加するときはインデックス設定を更新する。
 */
export interface StoreItemDoc {
  /** 商品名（検索メイン） */
  name: string;
  /** カテゴリ（facet / 絞り込み） */
  category: string;
  location: StoreItemLocation;
  /** 自然言語案内（顧客アプリにそのまま表示） */
  guideText: string;

  /** ルール検証用（必須） */
  chainId: string;
  storeId: string;

  updatedAt: Timestamp;

  /** 内部棚番（お客様 UI 非表示。Algolia 同期からも除外推奨） */
  internalCode?: string;
  /** POP 向けランドマーク表現 */
  displayLabel?: string;
  categoryIcon?: string;
  themeColor?: string;

  /** 任意: SKU / バーコード（検索・運用） */
  sku?: string;
  /** 任意: 税込価格（Algolia 数値フィルタ・表示） */
  price?: number;
  /** 任意: セール */
  isOnSale?: boolean;
  salePrice?: number;
  saleEndsAt?: Timestamp;
  /** 任意: 在庫（facet やバッジ表示） */
  stockStatus?: StockStatus;
  /** 任意: 追加検索キーワード（読み仮名・別名など） */
  searchKeywords?: string[];
  /** 任意: サムネイル（Algolia / UI） */
  imageUrl?: string;
}
