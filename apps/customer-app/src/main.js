import './styles.css';
import { createSearchClient, searchStoreItems } from './lib/algolia-client.js';
import { initSearchUi } from './search-ui.js';

const client = createSearchClient();
initSearchUi(searchStoreItems, client);
