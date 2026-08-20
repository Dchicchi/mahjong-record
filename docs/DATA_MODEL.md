# データ設計

## players

| field | type | description |
|---|---|---|
| id | string | プレイヤーID |
| name | string | 表示名 |
| active | boolean | 現在使用中か |
| createdAt | datetime | 作成日時 |

## records

1回の「+1」を1レコードとして保存する。

| field | type | description |
|---|---|---|
| id | string | 記録ID |
| playerId | string | players.id |
| type | string | yakuman / ippatsu / chombo |
| occurredAt | datetime | 発生日時 |
| source | string | app / import |
| note | string? | 任意メモ |
| createdAt | datetime | 登録日時 |
| updatedAt | datetime | 更新日時 |

## imported_summaries

過去データで「個別発生日」が分からない集計値を保持する。

| field | type | description |
|---|---|---|
| id | string | ID |
| playerId | string | プレイヤーID |
| type | string | yakuman / ippatsu / chombo |
| year | number | 年 |
| month | number? | 月 |
| week | number? | 週 |
| count | number | 件数 |
| sourceFile | string | 元ファイル名 |

## 設計方針

新規データは records に1件ずつ保存する。
過去集計データは imported_summaries に保持し、画面上では records と合算して表示する。
