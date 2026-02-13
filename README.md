# PIVOTMCP — X API データ資産化OS (BYOK)

X API (Pay-Per-Use) のデータを資産化するSaaS。
ユーザー自身のAPIキー（BYOK: Bring Your Own Key）で投稿データを収集・蓄積し、分析・監査を行います。

## 特徴

- **BYOK**: サービス側の共通APIキーは使わず、ユーザー自身のX API Bearer Tokenを使用
- **差分取得**: 取得済み投稿は再取得せず、コスト最小化
- **コスト透明性**: 取得前に推定リクエスト数を表示、全API呼び出しを記録
- **テナント分離**: Supabase RLS による厳密なデータ分離
- **分析**: ER・当たり判定・テーマ分類・投稿頻度・メディア比率

## 技術スタック

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres + RLS)
- AES-256-GCM トークン暗号化

## セットアップ

### 1. 前提条件

- Node.js 18+
- Supabase プロジェクト（[supabase.com](https://supabase.com) で作成）
- X API Bearer Token（[developer.x.com](https://developer.x.com) で取得）

### 2. Supabase セットアップ

1. Supabase でプロジェクトを作成
2. SQL Editor で `supabase/migrations/001_initial_schema.sql` を実行
3. Authentication > Providers で Email を有効化

### 3. 環境変数設定

```bash
cd apps/web
cp .env.example .env.local
```

`.env.local` を編集:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TOKEN_ENC_KEY=<64文字のhex文字列>
CRON_SECRET=your-random-secret
```

TOKEN_ENC_KEY の生成:
```bash
openssl rand -hex 32
```

### 4. アプリ起動

```bash
cd apps/web
npm install
npm run dev
```

http://localhost:3000 にアクセス

### 5. 初期設定

1. `/login` でアカウント作成（テナントは自動作成）
2. `/app/connections/x` でX API Bearer Tokenを登録 → 接続テスト
3. `/app/accounts` で追跡対象アカウントを登録
4. `/app/jobs` で収集ジョブを作成・実行

### 6. ジョブ実行（開発時）

開発時はCronの代わりに手動でジョブを実行:

```bash
curl -X POST http://localhost:3000/api/cron/run-jobs \
  -H "x-cron-secret: dev-secret"
```

## ディレクトリ構成

```
/pivotmcp
  /apps/web               # Next.js 管理画面
    /src
      /app
        /login             # ログイン
        /app               # 認証済みエリア
          /connections/x   # X接続管理
          /accounts        # 追跡アカウント
          /jobs            # 収集ジョブ
          /data/posts      # 投稿データ
          /analytics       # 分析
          /audit           # 監査ログ
        /api               # APIルート
      /lib                 # ユーティリティ
      /components          # UIコンポーネント
  /packages/shared         # 共通型・ロジック
  /supabase
    /migrations            # DBスキーマ
    /edge-functions        # Edge Functions
    /seed                  # シードデータ
```

## 画面一覧

| パス | 機能 |
|------|------|
| `/login` | ログイン・アカウント作成 |
| `/app` | ダッシュボード |
| `/app/connections/x` | X API接続管理 (BYOK) |
| `/app/accounts` | 追跡アカウント管理 |
| `/app/jobs` | 収集ジョブ管理 |
| `/app/data/posts` | 投稿データ一覧・検索・フィルタ・CSV |
| `/app/analytics` | 分析（頻度・ER・HIT・テーマ） |
| `/app/audit` | 監査ログ・API呼び出し履歴 |

## セキュリティ

- X API トークンはサーバー側で AES-256-GCM 暗号化して保存
- クライアントにトークンを絶対に返さない
- 全テーブルに RLS (Row Level Security) 適用
- テナント間のデータアクセスを厳密に分離

## ライセンス

Private
