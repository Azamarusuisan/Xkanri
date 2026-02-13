export const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project');

const now = new Date();
const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

export const DEMO_CONNECTION = {
  id: 'demo-conn-1',
  status: 'ok',
  x_user_id: '123456789',
  x_username: 'demo_user',
  last_tested_at: ago(1),
  created_at: ago(30),
  updated_at: ago(1),
};

export const DEMO_ACCOUNTS = [
  {
    id: 'demo-acc-1', tenant_id: 'demo', x_user_id: '100001', username: 'toyota_jp',
    display_name: 'トヨタ自動車', is_competitor: false, tags: ['自動車', 'メーカー'],
    memo: '国内最大手', followers_count: 1250000, cursor_since_id: null,
    created_at: ago(20), updated_at: ago(1),
  },
  {
    id: 'demo-acc-2', tenant_id: 'demo', x_user_id: '100002', username: 'honda_jp',
    display_name: 'Honda', is_competitor: true, tags: ['自動車', '競合'],
    memo: '競合分析用', followers_count: 890000, cursor_since_id: null,
    created_at: ago(18), updated_at: ago(1),
  },
  {
    id: 'demo-acc-3', tenant_id: 'demo', x_user_id: '100003', username: 'nissan_jp',
    display_name: '日産自動車', is_competitor: true, tags: ['自動車', '競合'],
    memo: null, followers_count: 720000, cursor_since_id: null,
    created_at: ago(15), updated_at: ago(2),
  },
];

function makePost(i: number, accIdx: number) {
  const acc = DEMO_ACCOUNTS[accIdx];
  const texts = [
    '新型モデルの予約受付を開始しました！詳しくは公式サイトをご覧ください。#新商品 #発表',
    '今週末のイベントにぜひお越しください！試乗会も開催します。#イベント #開催',
    'フォロー＆RTで豪華賞品が当たるキャンペーン実施中！#キャンペーン #プレゼント',
    '安全技術の最新アップデートについてご紹介します。#製品 #アップデート',
    'コラボレーション企画が実現しました！限定モデルをお楽しみに。#コラボ',
    '企業ビジョン2030を発表しました。持続可能なモビリティの未来へ。#ブランド #ビジョン',
    '本日の一枚。工場見学ツアーの様子をお届けします。',
    '新CM公開！話題のあの俳優が出演しています。',
    'お客様の声をご紹介。素敵なカーライフをありがとうございます！',
    '技術者インタビュー：次世代エンジンの開発秘話',
  ];
  const themes = ['new_product', 'event', 'campaign', 'product', 'collab', 'brand', 'other', 'other', 'other', 'product'];
  const appealFrames = ['news', 'emotional', 'benefit', 'news', 'scarcity', 'news', 'other', 'social_proof', 'emotional', 'question'];
  const mediaTypes = ['photo', 'video', 'none', 'photo', 'photo', 'none', 'photo', 'video', 'photo', 'none'];
  const daysAgo = Math.floor(i * 1.5) + 1;
  const likes = Math.floor(Math.random() * 5000) + 100;
  const replies = Math.floor(Math.random() * 200) + 5;
  const reposts = Math.floor(Math.random() * 1500) + 20;
  const quotes = Math.floor(Math.random() * 100) + 1;
  const impressions = likes * 15 + Math.floor(Math.random() * 50000);
  const idx = i % texts.length;
  const er = (likes + replies + reposts + quotes) / (acc.followers_count || 1);

  return {
    id: `demo-post-${accIdx}-${i}`,
    tenant_id: 'demo',
    tracked_account_id: acc.id,
    post_x_id: `${1800000000000 - i * 1000 - accIdx}`,
    text: texts[idx],
    posted_at: ago(daysAgo),
    likes_count: likes,
    replies_count: replies,
    reposts_count: reposts,
    quotes_count: quotes,
    impressions_count: impressions,
    media_type: mediaTypes[idx],
    hashtags: (texts[idx].match(/#(\S+)/g) || []).map(t => t.replace('#', '')),
    theme: themes[idx],
    appeal_frame: appealFrames[idx],
    is_hit: er > 0.005,
    virality_ratio: likes > 0 ? reposts / likes : 0,
    conversation_ratio: likes > 0 ? replies / likes : 0,
    quote_ratio: likes > 0 ? quotes / likes : 0,
    raw_json: {},
    created_at: ago(daysAgo),
    tracked_accounts: { username: acc.username, display_name: acc.display_name },
  };
}

export const DEMO_POSTS = (() => {
  const posts = [];
  for (let acc = 0; acc < 3; acc++) {
    for (let i = 0; i < 30; i++) {
      posts.push(makePost(i, acc));
    }
  }
  return posts.sort((a, b) => b.posted_at.localeCompare(a.posted_at));
})();

export const DEMO_JOBS = [
  {
    id: 'demo-job-1', tenant_id: 'demo', tracked_account_id: 'demo-acc-1',
    status: 'completed', mode: 'light',
    period_start: ago(28), period_end: ago(0),
    estimated_requests: 5, actual_requests: 4, posts_fetched: 30,
    error_message: null, locked_at: null,
    started_at: ago(1), completed_at: ago(1), created_at: ago(1), updated_at: ago(1),
    tracked_accounts: { username: 'toyota_jp', display_name: 'トヨタ自動車' },
  },
  {
    id: 'demo-job-2', tenant_id: 'demo', tracked_account_id: 'demo-acc-2',
    status: 'completed', mode: 'light',
    period_start: ago(28), period_end: ago(0),
    estimated_requests: 4, actual_requests: 3, posts_fetched: 30,
    error_message: null, locked_at: null,
    started_at: ago(1), completed_at: ago(1), created_at: ago(1), updated_at: ago(1),
    tracked_accounts: { username: 'honda_jp', display_name: 'Honda' },
  },
  {
    id: 'demo-job-3', tenant_id: 'demo', tracked_account_id: 'demo-acc-3',
    status: 'rate_limited', mode: 'light',
    period_start: ago(28), period_end: ago(0),
    estimated_requests: 4, actual_requests: 2, posts_fetched: 15,
    error_message: 'Rate limited at page 3', locked_at: null,
    started_at: ago(0.5), completed_at: null, created_at: ago(0.5), updated_at: ago(0.5),
    tracked_accounts: { username: 'nissan_jp', display_name: '日産自動車' },
  },
  {
    id: 'demo-job-4', tenant_id: 'demo', tracked_account_id: 'demo-acc-1',
    status: 'queued', mode: 'light',
    period_start: ago(90), period_end: ago(0),
    estimated_requests: 12, actual_requests: 0, posts_fetched: 0,
    error_message: null, locked_at: null,
    started_at: null, completed_at: null, created_at: ago(0.1), updated_at: ago(0.1),
    tracked_accounts: { username: 'toyota_jp', display_name: 'トヨタ自動車' },
  },
];

export const DEMO_AUDIT_LOGS = (() => {
  const endpoints = ['/2/users/me', '/2/users/by/username/:username', '/2/users/:id', '/2/users/:id/tweets'];
  const logs = [];
  for (let i = 0; i < 35; i++) {
    const ep = endpoints[i % endpoints.length];
    const is429 = i === 12;
    logs.push({
      id: `demo-log-${i}`,
      tenant_id: 'demo',
      fetch_job_id: i < 10 ? 'demo-job-1' : i < 20 ? 'demo-job-2' : 'demo-job-3',
      endpoint: ep,
      method: 'GET',
      status_code: is429 ? 429 : 200,
      estimated_units: 1,
      response_time_ms: Math.floor(Math.random() * 400) + 80,
      error_message: is429 ? 'Too Many Requests' : null,
      created_at: ago(Math.floor(i / 5)),
    });
  }
  return logs;
})();

// --- Ads Demo Data ---

export const DEMO_ADS_CONNECTION = {
  id: 'demo-ads-conn-1',
  status: 'ok',
  ad_account_id: 'ads-123456',
  ad_account_name: 'Toyota JP Ads',
  last_tested_at: ago(1),
  created_at: ago(30),
  updated_at: ago(1),
};

export const DEMO_AD_ACCOUNTS = [
  {
    id: 'demo-ad-acc-1', tenant_id: 'demo', ad_account_x_id: 'ads-123456',
    name: 'Toyota JP Ads', currency: 'JPY', timezone: 'Asia/Tokyo', status: 'active',
    created_at: ago(30), updated_at: ago(1),
  },
];

export const DEMO_AD_CREATIVES = (() => {
  const names = [
    '新型モデル紹介', 'ブランドムービー', 'キャンペーン告知', '試乗体験',
    'テクノロジー訴求', 'ライフスタイル', '期間限定オファー', 'ユーザーボイス',
    'コラボ企画', 'イベント集客',
  ];
  const creatives = [];
  for (let i = 0; i < 10; i++) {
    creatives.push({
      id: `demo-creative-${i}`,
      tenant_id: 'demo',
      ad_account_id: 'demo-ad-acc-1',
      creative_x_id: `creative-x-${i}`,
      name: names[i],
      post_id: `demo-post-0-${i}`,
      status: 'active',
      created_at: ago(20 - i),
    });
  }
  return creatives;
})();

export const DEMO_AD_STATS_DAILY = (() => {
  const stats = [];
  for (const creative of DEMO_AD_CREATIVES) {
    for (let d = 0; d < 14; d++) {
      const spend = Math.floor(Math.random() * 50000) + 5000;
      const impressions = Math.floor(Math.random() * 100000) + 10000;
      const clicks = Math.floor(impressions * (Math.random() * 0.03 + 0.005));
      const engagements = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
      stats.push({
        id: `demo-adstat-${creative.id}-${d}`,
        tenant_id: 'demo',
        creative_id: creative.id,
        stat_date: ago(d + 1).slice(0, 10),
        spend,
        impressions,
        clicks,
        engagements,
        conversions: Math.floor(clicks * Math.random() * 0.1),
      });
    }
  }
  return stats;
})();
