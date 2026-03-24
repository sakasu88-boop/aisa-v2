/**
 * POP 検索 UI: Algolia ヒットをカード表示し、マップピンと案内文を更新
 * internalCode はレンダリングしない
 */

const DEMO_HITS = [
  {
    objectID: 'demo_store__banana',
    name: '完熟バナナ',
    category: 'フルーツ・野菜',
    displayLabel: 'くだものコーナー入口',
    guideText: 'エスカレーターを降りてすぐ、黄色い看板が目印です！',
    location: { x: 0.45, y: 0.28 },
    categoryIcon: '🍌',
    themeColor: '#FFD700',
    storeId: 'demo_store',
  },
];

/** @type {typeof DEMO_HITS[0] | null} */
let selectedHit = null;

/** @type {typeof DEMO_HITS} */
let lastHits = [];

/** カテゴリのフォールバック色（themeColor が無いとき） */
const CATEGORY_THEME = {
  'フルーツ・野菜': '#22c55e',
  精肉・鮮魚: '#0ea5e9',
  'デイリー・チルド': '#38bdf8',
  '惣菜・デリ': '#f97316',
  '米・パン・麺': '#eab308',
  '調味料・油': '#a3a3a3',
  '菓子・スナック': '#ec4899',
  '飲料・酒類': '#8b5cf6',
  '日用品・雑貨': '#64748b',
  '洗剤・掃除': '#3b82f6',
  'ベビー・ペット': '#f472b6',
  その他: '#0d9488',
};

function cardAccent(hit) {
  if (hit.themeColor && /^#[0-9A-Fa-f]{6}$/.test(hit.themeColor)) {
    return hit.themeColor;
  }
  return CATEGORY_THEME[hit.category] ?? CATEGORY_THEME['その他'];
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 案内文内の方向・位置語を強調（エスケープ後に適用） */
const GUIDE_KEYWORDS = [
  'エスカレーター',
  '黄色い看板',
  '突き当たり',
  '右手',
  '左手',
  '右側',
  '左側',
  'まっすぐ',
  '奥',
  '手前',
  '上段',
  '中段',
  '下段',
  'レジ',
  '入口',
  '出口',
  '角',
  '通路',
  'コーナー',
  'すぐ近く',
  'すぐ',
  '向こう',
  '棚',
];

function emphasizeGuideKeywords(text) {
  const esc = escapeHtml(text);
  const sorted = [...GUIDE_KEYWORDS].sort((a, b) => b.length - a.length);
  const pattern = sorted.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!pattern) return esc;
  const re = new RegExp(`(${pattern})`, 'g');
  return esc.replace(re, '<strong class="guide-keyword">$1</strong>');
}

/**
 * @param {import('./lib/algolia-client.js').searchStoreItems} searchFn
 * @param {ReturnType<import('./lib/algolia-client.js').createSearchClient>} client
 */
export function initSearchUi(searchFn, client) {
  const input = document.getElementById('store-search');
  const storeFilter = document.getElementById('store-filter');
  const resultsEl = document.getElementById('search-results');
  const mapPin = document.getElementById('map-pin');
  const routeTitle = document.getElementById('route-kicker');
  const routeLead = document.querySelector('.route-lead');
  const routeText = document.getElementById('route-natural');
  const mapHint = document.getElementById('map-hint-line');

  if (!input || !resultsEl) return;

  if (storeFilter && !storeFilter.value && import.meta.env.VITE_DEFAULT_STORE_ID) {
    storeFilter.value = import.meta.env.VITE_DEFAULT_STORE_ID;
  }

  let debounceTimer;

  async function runSearch() {
    const q = input.value.trim();
    const storeId = storeFilter?.value?.trim() || undefined;

    if (!client) {
      renderHits(resultsEl, DEMO_HITS.filter((h) => !storeId || h.storeId === storeId), true);
      return;
    }

    try {
      const { hits } = await searchFn(client, { query: q, storeId, hitsPerPage: 12 });
      renderHits(resultsEl, hits, false);
    } catch (e) {
      console.error(e);
      resultsEl.innerHTML =
        '<p class="search-empty">検索に失敗しました。環境変数（Search-Only Key）を確認してください。</p>';
    }
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch, 280);
  }

  input.addEventListener('input', scheduleSearch);
  storeFilter?.addEventListener('change', runSearch);
  storeFilter?.addEventListener('input', scheduleSearch);

  function renderHits(container, hits, isMock) {
    lastHits = hits;
    if (!hits.length) {
      container.innerHTML = '<p class="search-empty">該当する商品が見つかりませんでした。</p>';
      return;
    }

    const mockBadge = isMock
      ? '<p class="search-mock-badge">デモデータ（Algolia の .env を設定すると本番検索に切り替わります）</p>'
      : '';

    container.innerHTML =
      mockBadge +
      hits
        .map((hit, i) => {
          const accent = cardAccent(hit);
          const icon = hit.categoryIcon || '🛒';
          const place = hit.displayLabel || hit.name;
          const title = hit.name;
          // internalCode は表示しない
          return `
            <article class="hit-card" style="--hit-accent:${accent}" data-hit-index="${i}">
              <div class="hit-card-visual">${escapeHtml(icon)}</div>
              <div class="hit-card-body">
                <h3 class="hit-card-title">${escapeHtml(title)}</h3>
                <p class="hit-card-place">${escapeHtml(place)}</p>
                <p class="hit-card-guide">${emphasizeGuideKeywords(hit.guideText || '')}</p>
                <button type="button" class="hit-card-map-btn" data-hit-index="${i}">地図で見る</button>
              </div>
            </article>
          `;
        })
        .join('');

    container.querySelectorAll('.hit-card-map-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-hit-index'));
        const hit = lastHits[idx];
        if (hit) focusOnMap(hit);
      });
    });
  }

  function focusOnMap(hit) {
    selectedHit = hit;
    const loc = hit.location;
    if (loc && typeof loc.x === 'number' && typeof loc.y === 'number' && mapPin) {
      mapPin.style.left = `${loc.x * 100}%`;
      mapPin.style.top = `${loc.y * 100}%`;
      mapPin.style.transform = 'translate(-50%, -100%)';
      mapPin.hidden = false;
      mapPin.setAttribute('aria-hidden', 'false');
    }
    const place = hit.displayLabel || hit.name;
    if (routeTitle) routeTitle.textContent = 'おすすめの案内';
    if (routeLead) routeLead.textContent = '近くの目印はこちらです。';
    if (routeText) {
      routeText.innerHTML = `<span class="route-pop">${escapeHtml(place)}</span>。${emphasizeGuideKeywords(hit.guideText || '')}`;
    }
    if (mapHint) {
      mapHint.textContent = '座標の数値は表示しません。ピンが目印です。';
    }
    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  runSearch();
}
