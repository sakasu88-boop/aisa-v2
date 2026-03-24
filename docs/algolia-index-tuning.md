# Algolia インデックス設定（検索品質）

デプロイ後、Algolia ダッシュボードでインデックス設定を行わないと「データはあるのに使いにくい検索」になります。**稼働前にテストデータで必ず検証**してください。

## 設定チェックリスト（期待挙動つき）

| 項目 | 設定内容 | 期待される挙動 |
|------|----------|------------------|
| **Searchable attributes**（優先順） | `name` → `displayLabel` → `category` → `guideText` | 商品名だけでなく「くだもの」等の自然語でもヒットする |
| **Attributes for faceting** | `storeId`（**Filter only** 推奨）、`category` | 他店舗の商品が混ざらない。カテゴリ絞り込みが可能 |
| **Ranking** | Custom ranking に **`updatedAtMs`（desc）** を追加するか、用途に応じて既定の近接度優先 | 更新順、または基本の近接度順で表示 |
| **Typo tolerance** | `minCharactersFor1Typo: 4` など（プロジェクトに合わせ調整） | 「バナナ」を「バナな」と打っても許容される |

## 補足

- `internalCode` は Functions 側でインデックスに含めていません（誤露出防止）。
- `displayLabel` を searchable に含めると、ランドマーク名での発見性が上がります。
