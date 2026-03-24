# Cloud Functions（Algolia 同期）

## 前提

- Firebase プロジェクトに CLI でログイン済み（`firebase login`）
- ルートの `.firebaserc` の `your-firebase-project-id` を実プロジェクト ID に置き換える

## Secrets（Admin API Key は Functions のみ）

```bash
# プロジェクトルートで実行
firebase functions:secrets:set ALGOLIA_APP_ID
firebase functions:secrets:set ALGOLIA_ADMIN_API_KEY
```

Algolia Application ID は機密性は低いが、Secret として渡す前提でコードを統一しています。

## インデックス名（任意）

デフォルトは `prod_items`。変更する場合はデプロイ時に:

```bash
firebase deploy --only functions --params 'ALGOLIA_INDEX_NAME=your_index_name'
```

または Firebase コンソールの Functions パラメータで `ALGOLIA_INDEX_NAME` を設定。

## ビルド・デプロイ

```bash
cd functions && npm run build
cd .. && firebase deploy --only functions
```

初回は Secret のバインドを確認してください（コンソールまたは CLI の指示に従う）。
