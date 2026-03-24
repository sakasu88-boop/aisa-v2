# GitHub Actions：本番デプロイ（Hosting）

`.github/workflows/deploy-production.yml` は **`main` への push**（通常は PR マージ）で **Firebase Hosting のみ**をデプロイします。

## 必要な Secret

| 名前 | 説明 |
|------|------|
| `FIREBASE_TOKEN` | `firebase login:ci` で発行したトークン（**リポジトリシークレットにのみ保存**） |

### トークンの取得

ローカル（ブラウザでログイン済みのマシン）で:

```bash
firebase login:ci
```

表示されたトークンをコピーし、GitHub リポジトリの  
**Settings → Secrets and variables → Actions → New repository secret**  
で `FIREBASE_TOKEN` として登録します。

### プロジェクト ID

ルートの `.firebaserc` の `default` が実プロジェクト ID になっていることを確認してください。プレースホルダのままではデプロイに失敗します。

## デプロイ範囲

- **現状**: `firebase deploy --only hosting`  
  → `firebase.json` の **`admin-site` と `customer-site` の両方**が対象です。
- **Functions / Firestore / Storage** は **含みません**（初回・本番は手動または別ワークフロー推奨）。

Functions を CI から出す場合は、ビルド済み `functions/lib` と Secret（`ALGOLIA_*`）の扱いを別途設計してください。**Algolia Admin Key は Git に含めず**、Firebase Secret Manager にのみ存在させます。

## サービスアカウント JSON を使う方式（上級）

`FIREBASE_TOKEN` の代わりに GCP サービスアカウントキーと Workload Identity Federation を使う方法もあります。組織ポリシーに合わせて選択してください。

## トラブルシュート

- **Permission denied**: トークンが期限切れ → `firebase login:ci` で再発行。
- **Hosting target 未設定**: `firebase target:apply hosting admin-site ...` が未実行の可能性。`docs/hosting-multisite.md` を参照。
