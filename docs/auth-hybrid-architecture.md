# 認証・認可（Custom Claims × Firestore プロフィール）

AISA v2 のハイブリッド構成の監査メモと実装契約です。

## 1. 実務上の落とし穴と対策

### トークン更新の遅延

- Custom Claims を変更しても、**既存の ID トークンは即座に変わらない**。
- 権限変更（解任・店舗移動など）後は、クライアントで `user.getIdToken(true)` を実行して再取得するか、再ログインで反映を保証する。
- **管理画面**では、Claims 更新後に「反映しました」表示とともに **トークン強制リフレッシュ**を必須フローに含める。

### 1,000 バイト制限

- JWT に埋め込む Claims の合計は **約 1,000 バイト以内**（Firebase の制約）。
- **店舗 ID の大量配列**を Claims に詰め込むと失敗する。多店舗は **`users/{uid}.accessibleStores`（Firestore）** に逃がし、Claims には **主所属 `storeId` のみ**を載せる方針とする。

## 2. Custom Claims（トークン内）

ルールでは `request.auth.token.*` として参照する。

| フィールド   | 型     | 説明 |
|-------------|--------|------|
| `role`      | string | `chain_admin` \| `store_staff` |
| `chainId`   | string | 所属チェーン ID |
| `storeId`   | string | **主所属**店舗 ID（`store_staff` で必須推奨） |

## 3. Firestore `users/{uid}`

Claims と重複するが、**表示用・監査用・複数店舗リスト**を保持する。

| フィールド           | 説明 |
|---------------------|------|
| `displayName`       | 表示名 |
| `email`             | メール（Auth と同期してもよい） |
| `photoURL`          | 任意 |
| `role` / `chainId` / `primaryStoreId` | Claims と**運用上同期**（正は Auth Claims + バックエンド） |
| `accessibleStores`  | 複数店舗アクセス許可（**リスト**）。ルールで `get(users/uid)` により参照 |
| `updatedAt`         | `serverTimestamp()` |

**クライアントからの直接 `users` 書き込みは禁止**（`firestore.rules` 参照）。作成・更新は Cloud Functions / Admin SDK に限定する。

## 4. セキュリティルールとの対応

- `chain_admin`: `chainId` が一致するデータのみ。
- `store_staff`: ドキュメントの `storeId` が **Claims の `storeId`** または **`accessibleStores` に含まれる**場合、かつ `chainId` が一致。

## 5. 運用フロー（推奨）

1. ユーザー作成・ロール変更は **バックエンドのみ**（Admin SDK）。
2. Claims 更新と `users/{uid}` 更新を **同一トランザクションまたは同一関数内**で実行し、ドリフトを防ぐ。
3. 管理アプリ起動時: `getIdTokenResult()` で Claims を読み、必要なら `getIdToken(true)` で再取得。
