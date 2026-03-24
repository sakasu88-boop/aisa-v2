# エンドツー・エンド検証（最初の商品がお客様に届くまで）

全セグメント（Admin / Functions / Customer）接続後の推奨フローです。

## 手順

1. **Admin**  
   テストユーザーでログインし、対象店舗に「完熟バナナ」等の商品を保存（マップにピン・案内テキストまで入力）。

2. **Functions**  
   Cloud Logging で `syncStoreItemToAlgolia` が **正常終了**したか確認。失敗時は ERROR ログとアラート設定を確認。

3. **Algolia**  
   コンソールのインデックスに `storeId__itemId` 形式の objectID が出現したか確認。

4. **Customer**  
   ブラウザで「バナナ」等を検索し、POP カードが表示されること。「地図で見る」で 📍 がマップ上の想定位置に付くこと。

## 体感チェック

- **ピンの重なり**: 同一座標に複数ヒットした場合の見え方（将来はクラスタリングや一覧優先も検討）。
- **検索の反応速度**: 入力デバウンス（約 280ms）と Algolia レイテンシのバランス。遅い場合はネットワーク・インデックスサイズ・hitsPerPage を確認。

## 自動チェック（キー漏洩）

ルートで `npm run verify:customer`（ビルド込み）または `npm run build:all && npm run verify:customer:bundle` を実行し、customer-app のビルド成果物に **Admin API Key 用の識別子が含まれない**ことを確認する。

## デプロイ（マルチサイト）

`docs/hosting-multisite.md` を参照（`admin-site` / `customer-site` のターゲットと `firebase deploy`）。
