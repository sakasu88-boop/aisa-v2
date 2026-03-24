import './styles.css';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './lib/firebase-client';
import { saveStoreItem } from './lib/db-service.js';
import { ITEM_CATEGORY_OPTIONS, isAllowedCategory } from './lib/item-categories.js';
import { initMapPlot } from './map-plot.js';

function fillCategorySelect() {
  const sel = document.getElementById('field-item-category');
  if (!sel || sel.tagName !== 'SELECT') return;
  while (sel.firstChild) sel.removeChild(sel.firstChild);
  for (const o of ITEM_CATEGORY_OPTIONS) {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    sel.appendChild(opt);
  }
}

fillCategorySelect();

const appRoot = document.getElementById('app');
const modal = document.getElementById('login-modal');
const openBtns = [document.getElementById('open-login'), document.getElementById('open-login-header')].filter(
  Boolean,
);
const closeBtn = document.getElementById('close-login');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginSubmit = document.getElementById('login-submit');
const userEmailEl = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

/** 未ログイン時はモーダルを閉じられない（ログイン後は手動で開閉可能） */
let loginModalForced = false;

/**
 * Firebase Auth のエラーコードをユーザー向け日本語に変換
 * @see https://firebase.google.com/docs/auth/admin/errors
 */
function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
    'auth/missing-email': 'メールアドレスを入力してください。',
    'auth/user-not-found': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/wrong-password': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/invalid-login-credentials': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/user-disabled': 'このアカウントは無効化されています。管理者にお問い合わせください。',
    'auth/too-many-requests': '試行回数が多すぎます。しばらくしてから再度お試しください。',
    'auth/network-request-failed': 'ネットワークに接続できません。接続を確認してください。',
    'auth/operation-not-allowed': 'メール／パスワードでのログインが有効になっていません。Firebase コンソールで認証方式を確認してください。',
    'auth/internal-error': 'サーバーで問題が発生しました。しばらくしてから再度お試しください。',
    'auth/invalid-api-key': 'アプリの設定（API キー）が正しくありません。.env を確認してください。',
    'auth/app-deleted': 'Firebase プロジェクトの設定に問題があります。',
    'auth/invalid-user-token': 'セッションが無効です。再度ログインしてください。',
    'auth/user-token-expired': 'セッションの有効期限が切れました。再度ログインしてください。',
  };
  if (code && messages[code]) {
    return messages[code];
  }
  return 'ログインに失敗しました。入力内容を確認するか、しばらくしてから再度お試しください。';
}

function setLoginError(message) {
  if (!loginError) return;
  if (message) {
    loginError.textContent = message;
    loginError.hidden = false;
  } else {
    loginError.textContent = '';
    loginError.hidden = true;
  }
}

function openModal() {
  modal.hidden = false;
  document.body.classList.add('modal-open');
  closeBtn?.focus();
}

function closeModal() {
  if (loginModalForced) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
}

function showLoginModal() {
  setLoginError('');
  loginModalForced = true;
  openModal();
  appRoot?.setAttribute('aria-hidden', 'true');
}

function renderAdminUI(user) {
  if (userEmailEl) {
    userEmailEl.textContent = user.email ?? user.uid;
    userEmailEl.hidden = false;
  }
  if (import.meta.env.DEV) {
    console.log('Logged in as:', user.email);
  }
}

function clearAdminUI() {
  if (userEmailEl) {
    userEmailEl.textContent = '';
    userEmailEl.hidden = true;
  }
  if (import.meta.env.DEV) {
    console.log('No user logged in.');
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginModalForced = false;
    clearLoginSubmitting();
    setLoginError('');
    closeModal();
    appRoot?.removeAttribute('aria-hidden');
    renderAdminUI(user);
    await applyStoreFieldFromClaims(user);
  } else {
    clearAdminUI();
    resetStoreItemForm();
    showLoginModal();
  }
});

/** @param {import('firebase/auth').User} user */
async function applyStoreFieldFromClaims(user) {
  const el = document.getElementById('field-store-id');
  if (!el) return;
  try {
    const { claims } = await user.getIdTokenResult(true);
    if (claims.storeId) {
      el.value = String(claims.storeId);
    } else {
      el.value = '';
    }
    el.readOnly = claims.role === 'store_staff';
  } catch (e) {
    if (import.meta.env.DEV) console.error('[claims]', e);
  }
}

function resetStoreItemForm() {
  const status = document.getElementById('save-item-status');
  if (status) {
    status.textContent = '';
    status.classList.remove('is-ok', 'is-err');
  }
}

openBtns.forEach((btn) =>
  btn.addEventListener('click', () => {
    loginModalForced = false;
    setLoginError('');
    openModal();
  }),
);

closeBtn?.addEventListener('click', closeModal);

modal?.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) {
    closeModal();
  }
});

function clearLoginSubmitting() {
  if (loginSubmit) {
    loginSubmit.disabled = false;
    loginSubmit.textContent = 'ログイン';
  }
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setLoginError('');

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const email = emailInput?.value?.trim() ?? '';
  const password = passwordInput?.value ?? '';

  if (!email || !password) {
    setLoginError('メールアドレスとパスワードを入力してください。');
    return;
  }

  if (loginSubmit) {
    loginSubmit.disabled = true;
    loginSubmit.textContent = 'ログイン中…';
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    const code = err?.code ?? '';
    setLoginError(getAuthErrorMessage(code));
    clearLoginSubmitting();
    if (import.meta.env.DEV) console.error('[auth]', code, err);
  }
});

logoutBtn?.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (err) {
    if (import.meta.env.DEV) console.error(err);
  }
});

const mapPlotApi = initMapPlot();

function setSaveItemStatus(message, kind) {
  const el = document.getElementById('save-item-status');
  if (!el) return;
  el.textContent = message ?? '';
  el.classList.remove('is-ok', 'is-err');
  if (kind === 'ok') el.classList.add('is-ok');
  if (kind === 'err') el.classList.add('is-err');
}

document.getElementById('btn-gen-item-id')?.addEventListener('click', () => {
  const input = document.getElementById('field-item-id');
  if (input && typeof crypto !== 'undefined' && crypto.randomUUID) {
    input.value = crypto.randomUUID();
  }
});

document.getElementById('btn-save-item')?.addEventListener('click', async () => {
  setSaveItemStatus('', null);

  const user = auth.currentUser;
  if (!user) {
    setSaveItemStatus('ログインしてください。', 'err');
    return;
  }

  let tokenResult;
  try {
    tokenResult = await user.getIdTokenResult(true);
  } catch (e) {
    setSaveItemStatus('トークンを取得できませんでした。再度ログインしてください。', 'err');
    return;
  }

  const claims = tokenResult.claims;
  const authInfo = {
    chainId: claims.chainId,
    storeId: claims.storeId,
    role: claims.role,
  };

  const storeIdRaw = document.getElementById('field-store-id')?.value?.trim() ?? '';
  let itemIdRaw = document.getElementById('field-item-id')?.value?.trim() ?? '';
  if (!itemIdRaw) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      itemIdRaw = crypto.randomUUID();
      const itemIdInput = document.getElementById('field-item-id');
      if (itemIdInput) itemIdInput.value = itemIdRaw;
    } else {
      setSaveItemStatus('商品IDを入力するか、「自動生成」を押してください。', 'err');
      return;
    }
  }

  const name = document.getElementById('field-item-name')?.value?.trim() ?? '';
  if (!name) {
    setSaveItemStatus('商品名は必須です。', 'err');
    return;
  }

  const coords = mapPlotApi?.getLastCoords?.() ?? { x: null, y: null };
  if (coords.x == null || coords.y == null || Number.isNaN(coords.x) || Number.isNaN(coords.y)) {
    setSaveItemStatus('マップ上をクリックしてピン（座標）を指定してください。', 'err');
    return;
  }

  const category = document.getElementById('field-item-category')?.value?.trim() ?? '';
  if (!isAllowedCategory(category)) {
    setSaveItemStatus('カテゴリを一覧から選択してください。', 'err');
    return;
  }

  const sectionName = document.getElementById('field-section-name')?.value?.trim() ?? '';
  const guideText = document.getElementById('field-item-guide')?.value?.trim() ?? '';
  if (!guideText) {
    setSaveItemStatus('案内テキストを入力してください。', 'err');
    return;
  }

  const internalCode = document.getElementById('field-internal-code')?.value?.trim() ?? '';
  const displayLabel = document.getElementById('field-display-label')?.value?.trim() ?? '';
  const categoryIcon = document.getElementById('field-category-icon')?.value?.trim() ?? '';
  const themeColor = document.getElementById('field-theme-color')?.value?.trim() ?? '';

  const itemData = {
    name,
    category,
    location: {
      x: coords.x,
      y: coords.y,
      ...(sectionName ? { sectionName } : {}),
    },
    guideText,
    ...(internalCode ? { internalCode } : {}),
    ...(displayLabel ? { displayLabel } : {}),
    ...(categoryIcon ? { categoryIcon } : {}),
    ...(themeColor ? { themeColor } : {}),
  };

  const btn = document.getElementById('btn-save-item');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '保存中…';
  }

  try {
    await saveStoreItem(storeIdRaw, itemIdRaw, itemData, authInfo);
    setSaveItemStatus(`保存しました（stores / ${storeIdRaw} / items）`, 'ok');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setSaveItemStatus(msg || '保存に失敗しました。', 'err');
    if (import.meta.env.DEV) console.error('[save]', err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Firestore に保存';
    }
  }
});
