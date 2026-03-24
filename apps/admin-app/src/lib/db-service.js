import { db } from './firebase-client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/** Firestore ドキュメントIDに使えない文字を避ける簡易サニタイズ */
export function sanitizeDocIdSegment(raw) {
  if (typeof raw !== 'string') return '';
  const t = raw.trim();
  if (!t) return '';
  return t.replace(/[/\\]/g, '_').slice(0, 700);
}

/**
 * 商品ドキュメント ID の運用ポリシー（優先度【中】）
 * - JAN / EAN: 8〜13 桁の数字のみ
 * - UUID（自動生成）: 標準形式
 * - SKU: 英数字で始まり、英数字・ハイフン・アンダースコア 3〜128 文字
 */
const RE_JAN = /^[0-9]{8,13}$/;
const RE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RE_SKU = /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;

export function assertValidItemIdPolicy(sanitizedId) {
  if (typeof sanitizedId !== 'string' || !sanitizedId) {
    throw new Error('商品ID（itemId）が空です。');
  }
  if (sanitizedId.length > 700) {
    throw new Error('商品IDが長すぎます。');
  }
  if (RE_JAN.test(sanitizedId) || RE_UUID.test(sanitizedId) || RE_SKU.test(sanitizedId)) {
    return;
  }
  throw new Error(
    '商品IDの形式が不正です。JAN（8〜13桁の数字）、UUID、または英数字・「-」「_」のみのSKU（3文字以上）で入力してください。',
  );
}

/**
 * パス上の storeId と Custom Claims の整合（store_staff は主所属と完全一致必須）
 * @param {string} storeId - URL パスに使う店舗 ID
 * @param {{ chainId?: string, storeId?: string, role?: string }} authInfo - getIdTokenResult().claims 相当
 */
export function assertPathMatchesClaims(storeId, authInfo) {
  if (!authInfo || typeof authInfo !== 'object') {
    throw new Error('認証情報がありません。ログインし直してください。');
  }
  const cid = authInfo.chainId;
  const rid = typeof authInfo.role === 'string' ? authInfo.role : '';
  const primaryStore = authInfo.storeId;

  if (!cid || typeof cid !== 'string') {
    throw new Error('トークンに chainId がありません。Custom Claims を確認してください。');
  }
  const sid = typeof storeId === 'string' ? storeId.trim() : '';
  if (!sid) {
    throw new Error('店舗ID（storeId）を指定してください。');
  }

  if (rid === 'store_staff') {
    if (!primaryStore || primaryStore !== sid) {
      throw new Error('書き込み先の店舗IDが、ログイン中の店舗と一致しません。');
    }
  }

  if (rid !== 'chain_admin' && rid !== 'store_staff') {
    throw new Error('この操作を許可されたロールではありません。');
  }
}

/**
 * 商品データを Firestore に保存する（新規・更新共通）
 * - ドキュメント内の chainId / storeId はパス・Claims と一致させる（上書き注入）
 * - updatedAt は常に serverTimestamp()（クライアント時刻は禁止）
 * - itemData に含まれる chainId / storeId / updatedAt は無視される
 *
 * @param {string} storeId - パス stores/{storeId}/items/...
 * @param {string} itemId - ドキュメント ID（SKU 等。空なら呼び出し側で自動生成推奨）
 * @param {Record<string, unknown>} itemData - name, category, location, guideText 等
 * @param {{ chainId: string, storeId?: string, role: string }} authInfo - Claims
 */
export async function saveStoreItem(storeId, itemId, itemData, authInfo) {
  assertPathMatchesClaims(storeId, authInfo);

  const id = sanitizeDocIdSegment(itemId);
  if (!id) {
    throw new Error('商品ID（itemId）が空です。SKU / JAN を入力するか、自動生成してください。');
  }
  assertValidItemIdPolicy(id);

  const chainId = authInfo.chainId;
  const sid = typeof storeId === 'string' ? storeId.trim() : '';

  const stripped = { ...(itemData && typeof itemData === 'object' ? itemData : {}) };
  delete stripped.chainId;
  delete stripped.storeId;
  delete stripped.updatedAt;

  const docData = {
    ...stripped,
    chainId,
    storeId: sid,
    updatedAt: serverTimestamp(),
  };

  const itemRef = doc(db, 'stores', sid, 'items', id);

  try {
    await setDoc(itemRef, docData, { merge: true });
    if (import.meta.env.DEV) {
      console.log(`[db-service] Item "${id}" saved to stores/${sid}/items/${id}`);
    }
  } catch (error) {
    console.error('[db-service] Firestore save error:', error);
    throw error;
  }
}
