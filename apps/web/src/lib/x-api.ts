/**
 * X API v2 Client — Server-only
 * トークンをクライアントに絶対に出さない
 */

const X_API_BASE = 'https://api.x.com/2';

export interface XApiResponse<T> {
  data?: T;
  meta?: {
    next_token?: string;
    result_count?: number;
    newest_id?: string;
    oldest_id?: string;
  };
  errors?: Array<{ message: string; title: string; type: string }>;
  status: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export interface XTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
  attachments?: {
    media_keys?: string[];
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
  };
}

export interface XMedia {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
}

async function xFetch<T>(
  endpoint: string,
  bearerToken: string,
  params?: Record<string, string>
): Promise<XApiResponse<T>> {
  const url = new URL(`${X_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  });

  const rateLimitRemaining = res.headers.get('x-rate-limit-remaining')
    ? parseInt(res.headers.get('x-rate-limit-remaining')!)
    : undefined;
  const rateLimitReset = res.headers.get('x-rate-limit-reset')
    ? parseInt(res.headers.get('x-rate-limit-reset')!)
    : undefined;

  if (res.status === 429) {
    return {
      status: 429,
      rateLimitRemaining: 0,
      rateLimitReset,
      errors: [{ message: 'Rate limited', title: 'Too Many Requests', type: 'rate_limit' }],
    };
  }

  const body = await res.json();
  return {
    ...body,
    status: res.status,
    rateLimitRemaining,
    rateLimitReset,
  };
}

/** 接続テスト: GET /2/users/me */
export async function verifyCredentials(bearerToken: string): Promise<XApiResponse<XUser>> {
  return xFetch<XUser>('/users/me', bearerToken, {
    'user.fields': 'public_metrics',
  });
}

/** handle → user ID 解決 */
export async function getUserByUsername(
  bearerToken: string,
  username: string
): Promise<XApiResponse<XUser>> {
  const cleanUsername = username.replace(/^@/, '');
  return xFetch<XUser>(`/users/by/username/${cleanUsername}`, bearerToken, {
    'user.fields': 'public_metrics',
  });
}

/** ユーザー情報取得 */
export async function getUserById(
  bearerToken: string,
  userId: string
): Promise<XApiResponse<XUser>> {
  return xFetch<XUser>(`/users/${userId}`, bearerToken, {
    'user.fields': 'public_metrics',
  });
}

/** ユーザー投稿取得（ページネーション対応） */
export async function getUserTweets(
  bearerToken: string,
  userId: string,
  options?: {
    sinceId?: string;
    untilId?: string;
    maxResults?: number;
    paginationToken?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<XApiResponse<XTweet[]> & { includes?: { media?: XMedia[] } }> {
  const params: Record<string, string> = {
    'tweet.fields': 'created_at,public_metrics,entities,attachments',
    'expansions': 'attachments.media_keys',
    'media.fields': 'type',
    'max_results': String(options?.maxResults || 100),
  };
  if (options?.sinceId) params['since_id'] = options.sinceId;
  if (options?.untilId) params['until_id'] = options.untilId;
  if (options?.paginationToken) params['pagination_token'] = options.paginationToken;
  if (options?.startTime) params['start_time'] = options.startTime;
  if (options?.endTime) params['end_time'] = options.endTime;

  return xFetch<XTweet[]>(`/users/${userId}/tweets`, bearerToken, params) as Promise<
    XApiResponse<XTweet[]> & { includes?: { media?: XMedia[] } }
  >;
}
