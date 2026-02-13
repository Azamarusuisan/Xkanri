// ===== Database Types =====

export interface Tenant {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectionX {
  id: string;
  tenant_id: string;
  encrypted_bearer_token: string;
  status: 'ok' | 'invalid' | 'rate_limited' | 'untested';
  x_user_id: string | null;
  x_username: string | null;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackedAccount {
  id: string;
  tenant_id: string;
  x_user_id: string;
  username: string;
  display_name: string | null;
  is_competitor: boolean;
  tags: string[];
  memo: string | null;
  cursor_since_id: string | null;
  followers_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  tenant_id: string;
  tracked_account_id: string;
  post_x_id: string;
  text: string | null;
  posted_at: string;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  quotes_count: number;
  impressions_count: number;
  media_type: 'none' | 'photo' | 'video' | 'animated_gif' | 'mixed';
  hashtags: string[];
  theme: string | null;
  is_hit: boolean;
  raw_json: Record<string, unknown>;
  created_at: string;
}

export interface AccountSnapshot {
  id: string;
  tenant_id: string;
  tracked_account_id: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
  snapshot_at: string;
  created_at: string;
}

export type FetchJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'rate_limited' | 'cancelled';

export interface FetchJob {
  id: string;
  tenant_id: string;
  tracked_account_id: string;
  status: FetchJobStatus;
  mode: 'light';
  period_start: string | null;
  period_end: string | null;
  estimated_requests: number | null;
  actual_requests: number;
  posts_fetched: number;
  error_message: string | null;
  locked_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiCallLog {
  id: string;
  tenant_id: string;
  fetch_job_id: string | null;
  endpoint: string;
  method: string;
  status_code: number | null;
  estimated_units: number;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface AnalysisCache {
  id: string;
  tenant_id: string;
  tracked_account_id: string | null;
  cache_key: string;
  cache_data: Record<string, unknown>;
  period_start: string;
  period_end: string;
  created_at: string;
  expires_at: string;
}

// ===== Theme Classification =====

export const THEME_RULES: Record<string, string[]> = {
  campaign: ['キャンペーン', '抽選', 'プレゼント', '#campaign', 'giveaway', '応募'],
  event: ['イベント', '開催', 'セミナー', '#event', 'ウェビナー', '展示会'],
  new_product: ['新商品', '新発売', 'リリース', '発表', '新登場', 'ローンチ'],
  brand: ['ブランド', '企業理念', 'ビジョン', 'ミッション', '創業'],
  collab: ['コラボ', 'タイアップ', 'feat', 'コラボレーション', '共同'],
  product: ['商品', '製品', 'サービス', '#product', '機能', 'アップデート'],
};

export function classifyTheme(text: string, hashtags: string[]): string {
  const combined = (text + ' ' + hashtags.join(' ')).toLowerCase();
  for (const [theme, keywords] of Object.entries(THEME_RULES)) {
    for (const keyword of keywords) {
      if (combined.includes(keyword.toLowerCase())) {
        return theme;
      }
    }
  }
  return 'other';
}

// ===== Hit Detection =====

export function calculateER(
  likes: number,
  replies: number,
  reposts: number,
  quotes: number,
  followers: number
): number {
  if (followers <= 0) return 0;
  return (likes + replies + reposts + quotes) / followers;
}

export function detectHits(posts: { er: number }[]): Set<number> {
  if (posts.length === 0) return new Set();
  const sorted = [...posts.map(p => p.er)].sort((a, b) => a - b);
  const p75Index = Math.floor(sorted.length * 0.75);
  const p75 = sorted[p75Index] || 0;
  const hits = new Set<number>();
  posts.forEach((p, i) => {
    if (p.er >= p75 && p.er > 0) hits.add(i);
  });
  return hits;
}

// ===== Cost Estimation =====

export function estimateRequests(
  accountCount: number,
  estimatedTweetsPerAccount: number = 200,
  tweetsPerRequest: number = 100
): number {
  // user lookup per account + tweets pagination + user info
  const tweetRequests = Math.ceil(estimatedTweetsPerAccount / tweetsPerRequest);
  return accountCount * (1 + tweetRequests + 1);
}
