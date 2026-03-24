# Firebase Hosting マルチサイト（admin / customer）

管理画面と一般検索を **別 Hosting サイト**に分離し、**Search-Only Key が一般アプリに載る範囲**と **Firebase Auth が必要な管理アプリ**を運用上も分けます。

## サイト ID（初期案・後から変更可）

| 用途 | 想定カスタムドメイン | **Hosting サイト ID**（CLI で作成する名前） |
|------|----------------------|---------------------------------------------|
| admin-app | admin.aisa.app（仮） | `aisa-v2-admin` |
| customer-app | search.aisa.app（仮） | `aisa-v2-search` |

サイト ID は **プロジェクト内で一意**ならよく、`aisa-v2-admin` / `aisa-v2-search` で問題ありません。変更する場合はコンソールまたは CLI でサイトを追加し、`firebase target:apply` を差し替えます。

## リポジトリ側の設定

- `firebase.json` の `hosting` に **`target`: `admin-site` / `customer-site`** を定義済み。
- 各 `public` は **`apps/admin-app/dist`** / **`apps/customer-app/dist`**。

## 初回セットアップ（CLI）

```bash
# プロジェクトを選択
firebase use <your-project-id>

# サイト作成（未作成の場合）
firebase hosting:sites:create aisa-v2-admin
firebase hosting:sites:create aisa-v2-search

# ローカル target 名 → サイト ID の紐付け
firebase target:apply hosting admin-site aisa-v2-admin
firebase target:apply hosting customer-site aisa-v2-search
```

`.firebaserc` に `targets` が追記されます（**コミット可**）。

## ビルドとデプロイ

```bash
# モノレポルートで
npm run build:all
firebase deploy
```

Hosting のみ先に出す場合:

```bash
firebase deploy --only hosting
```

Functions / Firestore / Storage も同時に出す場合は `firebase deploy` のまま。

## カスタムドメイン

各サイト（`aisa-v2-admin` / `aisa-v2-search`）に対し、Firebase コンソール **Hosting → カスタムドメイン**で **admin.aisa.app** / **search.aisa.app** を追加し、DNS（TXT / A）を設定します。

## GitHub Actions：本番デプロイ

`main` マージ時に **Hosting 自動デプロイ**する場合は **`docs/github-actions-deploy.md`** を参照し、リポジトリ Secret **`FIREBASE_TOKEN`** を設定する。

## [Final Check]（リリース前の確認事項）

1. **サイト ID** … 上記 `aisa-v2-admin` / `aisa-v2-search` で進めてよいか（変更は後から可能）。
2. **CI** … PR / feature ブランチ向けは `.github/workflows/ci.yml`。**本番 Hosting デプロイ**は `.github/workflows/deploy-production.yml`（要 `FIREBASE_TOKEN`）。
3. **E2E / Algolia** … `docs/e2e-verification.md` と **`docs/production-readiness.md`**（Secrets・SSL・レイテンシ）を参照。
