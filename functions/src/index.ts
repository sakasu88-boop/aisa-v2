import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { defineSecret, defineString } from 'firebase-functions/params';
import { algoliasearch } from 'algoliasearch';
import { algoliaObjectId, firestoreItemToAlgoliaRecord } from './algolia-record.js';

/**
 * Secrets（Admin API Key はクライアントに絶対出さない）
 *   firebase functions:secrets:set ALGOLIA_APP_ID
 *   firebase functions:secrets:set ALGOLIA_ADMIN_API_KEY
 *
 * インデックス名（非シークレットでも可）:
 *   firebase functions:config:set は非推奨のため defineString を使用
 */
const algoliaAppId = defineSecret('ALGOLIA_APP_ID');
const algoliaAdminApiKey = defineSecret('ALGOLIA_ADMIN_API_KEY');
const algoliaIndexName = defineString('ALGOLIA_INDEX_NAME', {
  default: 'prod_items',
  description: 'Algolia index name',
});

/**
 * stores/{storeId}/items/{itemId} の作成・更新・削除を Algolia に反映
 * objectID = storeId__itemId
 *
 * リトライ: Gen2 のイベントは Cloud Run 上で実行され、失敗時の再試行ポリシーは
 * プロジェクト／トリガー設定に依存します。コンソールの「再試行」設定と
 * Cloud Monitoring（ERROR ログに対するアラート）の併用を推奨します。
 * @see https://cloud.google.com/functions/docs/bestpractices/retries
 */
export const syncStoreItemToAlgolia = onDocumentWritten(
  {
    document: 'stores/{storeId}/items/{itemId}',
    secrets: [algoliaAppId, algoliaAdminApiKey],
    region: 'asia-northeast1',
  },
  async (event) => {
    const storeId = event.params.storeId as string;
    const itemId = event.params.itemId as string;
    const oid = algoliaObjectId(storeId, itemId);

    const appId = algoliaAppId.value();
    const apiKey = algoliaAdminApiKey.value();
    const indexName = algoliaIndexName.value();

    if (!appId || !apiKey) {
      logger.warn('Algolia secrets not set; skip sync', { storeId, itemId });
      return;
    }

    const client = algoliasearch(appId, apiKey);

    try {
      const after = event.data?.after;
      if (!after?.exists) {
        await client.deleteObject({ indexName, objectID: oid });
        logger.info('Algolia deleteObject', { objectID: oid });
        return;
      }

      const record = firestoreItemToAlgoliaRecord(storeId, itemId, after);
      if (!record) {
        logger.warn('Empty snapshot after; skip saveObjects', { oid });
        return;
      }

      await client.saveObjects({ indexName, objects: [record] });
      logger.info('Algolia saveObjects', { objectID: oid, indexName });
    } catch (error) {
      logger.error('Algolia sync failed', {
        error,
        objectID: oid,
        storeId,
        itemId,
        indexName,
      });
      throw error;
    }
  },
);
