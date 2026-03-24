import './styles.css';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './lib/firebase-client';

const appRoot = document.getElementById('app');
const modal = document.getElementById('login-modal');
const openBtns = [document.getElementById('open-login'), document.getElementById('open-login-header')].filter(
  Boolean,
);
const closeBtn = document.getElementById('close-login');
const mapWorkspace = document.getElementById('map-workspace');
const coordXy = document.getElementById('coord-xy');
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

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginModalForced = false;
    clearLoginSubmitting();
    setLoginError('');
    closeModal();
    appRoot?.removeAttribute('aria-hidden');
    renderAdminUI(user);
  } else {
    clearAdminUI();
    showLoginModal();
  }
});

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

if (mapWorkspace && coordXy) {
  mapWorkspace.addEventListener('click', (e) => {
    const rect = mapWorkspace.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const clampedX = Math.min(1, Math.max(0, x));
    const clampedY = Math.min(1, Math.max(0, y));
    coordXy.textContent = `X: ${clampedX.toFixed(4)}　Y: ${clampedY.toFixed(4)}`;
  });
}
