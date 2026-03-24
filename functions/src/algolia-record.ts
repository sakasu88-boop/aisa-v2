import type { DocumentSnapshot, Timestamp } from 'firebase-admin/firestore';

/** Algolia objectID: グローバル一意 + 店舗逆引き用 */
export function algoliaObjectId(storeId: string, itemId: string): string {
  return `${storeId}__${itemId}`;
}

/**
 * Firestore ドキュメント → Algolia レコード（JSON 互換）
 * Timestamp は数値 ms に落とす
 */
export function firestoreItemToAlgoliaRecord(
  storeId: string,
  itemId: string,
  snap: DocumentSnapshot,
): Record<string, unknown> | null {
  const data = snap.data();
  if (!data) return null;

  const base: Record<string, unknown> = {
    objectID: algoliaObjectId(storeId, itemId),
    storeId,
    itemId,
    chainId: data.chainId,
    name: data.name,
    category: data.category,
    guideText: data.guideText,
    location: data.location ?? null,
  };

  if (data.displayLabel != null) base.displayLabel = data.displayLabel;
  if (data.categoryIcon != null) base.categoryIcon = data.categoryIcon;
  if (data.themeColor != null) base.themeColor = data.themeColor;

  // internalCode は一般客・検索インデックスに載せない（誤露出防止）

  const updatedAt = data.updatedAt as Timestamp | undefined;
  if (updatedAt && typeof updatedAt.toMillis === 'function') {
    base.updatedAtMs = updatedAt.toMillis();
  }

  return base;
}
