import { algoliasearch } from 'algoliasearch';

/**
 * 一般客向け: Search-Only API Key のみ使用（Admin Key は絶対に含めない）
 * @see https://www.algolia.com/doc/guides/security/api-keys/
 */
export function getAlgoliaEnv() {
  return {
    appId: import.meta.env.VITE_ALGOLIA_APP_ID ?? '',
    /** Search-Only API Key（書き込み不可） */
    searchApiKey: import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY ?? '',
    indexName: import.meta.env.VITE_ALGOLIA_INDEX_NAME ?? 'prod_items',
    defaultStoreId: import.meta.env.VITE_DEFAULT_STORE_ID ?? '',
  };
}

export function createSearchClient() {
  const { appId, searchApiKey } = getAlgoliaEnv();
  if (!appId || !searchApiKey) {
    return null;
  }
  return algoliasearch(appId, searchApiKey);
}

/** @param {ReturnType<typeof createSearchClient>} client */
export async function searchStoreItems(client, { query, storeId, hitsPerPage = 10 }) {
  const { indexName } = getAlgoliaEnv();
  if (!client) {
    return { hits: [], usedMock: true };
  }

  const filters = storeId ? `storeId:"${String(storeId).replace(/"/g, '\\"')}"` : undefined;

  const response = await client.searchSingleIndex({
    indexName,
    searchParams: {
      query: query ?? '',
      hitsPerPage,
      ...(filters ? { filters } : {}),
    },
  });

  const hits = response.hits ?? [];
  return { hits, usedMock: false };
}
