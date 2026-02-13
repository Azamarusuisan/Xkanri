# PIVOTMCP — 実装計画

## 概要
X API データ資産化OS (BYOK) SaaS。ユーザー自身のX APIキーで投稿データを収集・蓄積し、分析・監査できる管理プラットフォーム。

## 技術スタック
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres + RLS + Edge Functions + Cron)
- AES-GCM 暗号化 (TOKEN_ENC_KEY)
- DBキュー + Cronポーリング

## リポジトリ構成
```
/pivotmcp
  /apps/web            # Next.js 管理画面
  /packages/shared     # 型・共通ロジック
  /supabase            # migrations, seed, edge-functions
  plan.md
  README.md
```

## DBテーブル一覧
1. `tenants` — テナント管理 (owner_user_id = auth.uid())
2. `connections_x` — X API接続情報 (暗号化トークン)
3. `tracked_accounts` — 追跡対象アカウント
4. `posts` — 取得した投稿データ
5. `account_snapshots` — アカウントのフォロワー数等スナップショット
6. `fetch_jobs` — 収集ジョブキュー
7. `api_call_logs` — API呼び出しログ（監査用）
8. `analysis_cache` — 集計結果キャッシュ

## 画面一覧
- `/login` — ログイン
- `/app` — ダッシュボード
- `/app/connections/x` — X接続管理
- `/app/accounts` — 追跡アカウント管理
- `/app/jobs` — 収集ジョブ一覧
- `/app/data/posts` — 投稿データ管理
- `/app/analytics` — 分析
- `/app/audit` — 監査ログ

---

## 実装タスクチェックリスト

### Phase 1: プロジェクト基盤
- [x] リポジトリ構造作成
- [x] Next.js プロジェクト初期化 (apps/web)
- [x] packages/shared セットアップ
- [x] Tailwind + shadcn/ui 導入
- [x] 環境変数テンプレート (.env.example)
- [x] Supabase クライアント設定

### Phase 2: DB スキーマ + RLS
- [x] tenants テーブル + RLS
- [x] connections_x テーブル + RLS
- [x] tracked_accounts テーブル + RLS
- [x] posts テーブル + RLS + unique制約 (post_x_id)
- [x] account_snapshots テーブル + RLS
- [x] fetch_jobs テーブル + RLS
- [x] api_call_logs テーブル + RLS
- [x] analysis_cache テーブル + RLS
- [x] テナント解決用 SQL 関数 (get_tenant_id_for_user / current_tenant_id)
- [x] 自動 tenant 作成トリガー (on_auth_user_created)
- [x] updated_at 自動更新トリガー

### Phase 3: Auth + テナント自動作成
- [x] Supabase Auth 設定 (email login)
- [x] ログインページ UI
- [x] 初回ログイン時 tenant 自動作成 (DB trigger)
- [x] 認証ミドルウェア (middleware.ts)
- [x] サイドバーレイアウト
- [x] ダッシュボード (統計カード)

### Phase 4: X接続 (BYOK)
- [x] トークン暗号化/復号ユーティリティ (AES-256-GCM)
- [x] X接続登録 API (/api/connections/x)
- [x] 接続テスト API (/api/connections/x/test)
- [x] X接続管理画面 UI
- [x] 接続ステータス表示 (ok/invalid/rate_limited/untested)
- [x] API呼び出しログ記録

### Phase 5: 追跡アカウント管理
- [x] handle → X user ID 解決 API (X API /2/users/by/username)
- [x] tracked_accounts 登録 API (POST /api/accounts)
- [x] tracked_accounts 更新/削除 API (PUT/DELETE /api/accounts/[id])
- [x] アカウント管理画面 UI (competitor/tag/memo)
- [x] 初回スナップショット保存

### Phase 6: 収集ジョブ
- [x] fetch_jobs 作成 API (POST /api/jobs)
- [x] 推定リクエスト数計算 API (POST /api/jobs/estimate)
- [x] 推定コスト表示 + 確認ダイアログ UI (2段階: 選択→確認)
- [x] ジョブ一覧画面 (ステータスバッジ/進捗/エラー)
- [x] 既存ジョブ重複防止チェック

### Phase 7: Cronジョブ実行
- [x] X API クライアント (投稿取得/ユーザー情報取得)
- [x] ページネーション処理 (pagination_token)
- [x] 差分取得ロジック (since_id / cursor)
- [x] 投稿保存 (posts upsert + unique制約)
- [x] api_call_logs 記録 (全API呼び出し)
- [x] rate limit 処理 (429 → rate_limited ステータス)
- [x] ジョブロック (同一tenant同時実行防止)
- [x] Cron API Route (/api/cron/run-jobs)
- [x] Supabase Edge Function (cron_run_jobs)

### Phase 8: 投稿データ管理
- [x] 投稿一覧 API (フィルタ/検索/ページネーション)
- [x] 投稿一覧画面 UI
- [x] 期間フィルタ (date_from/date_to)
- [x] メディア種別フィルタ
- [x] 当たり判定フィルタ (is_hit)
- [x] テーマフィルタ
- [x] 本文全文検索 (to_tsvector)
- [x] CSVエクスポート (BOM付きUTF-8)
- [x] ページネーション

### Phase 9: 分析
- [x] 投稿頻度集計 (日/週)
- [x] 画像/動画比率
- [x] ER_by_followers 計算
- [x] 当たり判定ロジック (p75 = hit) + DB更新
- [x] テーマ分類 (ルールベース: campaign/event/new_product/brand/collab/product/other)
- [x] 分析画面 UI (BarChart + PieChart + HIT投稿テーブル)
- [x] アカウント/期間フィルタ

### Phase 10: 監査
- [x] api_call_logs 集計 API
- [x] endpoint別呼び出し回数
- [x] 期間別推定コスト (units)
- [x] 429発生回数
- [x] 日別API呼び出しグラフ
- [x] 監査画面 UI (サマリーカード + チャート + ログテーブル)
- [x] ページネーション

---

## 既知の問題

1. **Turbopack + 日本語パス**: プロジェクトが日本語を含むパス (`X練習`) に配置されているため、Turbopack (Next.js 16 デフォルト) のビルドがクラッシュする。ASCIIパスに移動するか、webpack モードに切り替えが必要。`tsc --noEmit` は正常に通る。

---

## RLS ポリシー設計
```sql
-- 全テーブル共通パターン
CREATE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT id FROM tenants WHERE owner_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 各テーブルに適用
CREATE POLICY "Tenant isolation" ON table_name FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
```

## X API エンドポイント
- `GET /2/users/me` — 接続テスト
- `GET /2/users/by/username/:username` — handle → user ID 解決
- `GET /2/users/:id` — ユーザー情報取得 (フォロワー数等)
- `GET /2/users/:id/tweets` — ユーザー投稿取得 (ページネーション/since_id対応)

## 暗号化仕様
- AES-256-GCM
- 鍵: env `TOKEN_ENC_KEY` (32バイト hex = 64文字)
- IV: ランダム12バイト
- 保存形式: `iv_hex:ciphertext_hex:tag_hex`

## 推定コスト計算
- 推定投稿数 = 期間日数 × 3 (デフォルト) or 1.5 (差分取得時)
- 推定リクエスト数 = 1 (user lookup) + ceil(推定投稿数/100) + 1 (snapshot)

## 当たり判定
- ER = (likes + replies + reposts + quotes) / followers
- p75 (75パーセンタイル) 以上 & ER > 0 → "hit"

## テーマ分類ルールベース (MVP)
- campaign: キャンペーン, 抽選, プレゼント, giveaway, 応募
- event: イベント, 開催, セミナー, ウェビナー, 展示会
- new_product: 新商品, 新発売, リリース, 発表, 新登場, ローンチ
- brand: ブランド, 企業理念, ビジョン, ミッション, 創業
- collab: コラボ, タイアップ, feat, コラボレーション, 共同
- product: 商品, 製品, サービス, 機能, アップデート
- other: 上記に該当しないもの
