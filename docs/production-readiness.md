# 本番運用：初回デプロイ前のチェック

## ① Firebase Secrets（Functions）

- **Algolia Admin API Key** 等は **`firebase functions:secrets:set`** で登録し、**リポジトリや `functions/.env` にコミットしない**。
- `functions/.env` をローカルだけで使う場合も **`.gitignore` に含める**（本リポジトリではルート `.gitignore` で `.env` を除外済み）。

## ② Algolia の体感レイテンシ（コールドスタート）

- 初回デプロイ直後、**最初の検索がやや遅く感じる**ことがある。
- **対策**: `docs/e2e-verification.md` に沿ってテストデータを数件投入し、検索結果が安定するか確認する。

## ③ カスタムドメインと SSL

- Firebase Hosting にカスタムドメインを追加した直後、**SSL 証明書の有効化に数分〜数時間**かかることがある。
- **公開告知**は「DNS 反映 + 証明書が有効になった後」を前提にスケジュールする。

## Ready for Launch の目安

1. `firebase deploy`（または CI の Hosting デプロイ）後、**`*.web.app` / カスタムドメイン**で admin / search の両方を確認。
2. 実機で customer（search）の **ピン視認性・カード可読性**を確認。
3. 問題なければ **V2.0 リリース準備完了**を宣言。
