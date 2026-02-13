const THEME_RULES: Record<string, string[]> = {
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

// --- Appeal Frame Classification ---

const APPEAL_FRAME_RULES: Record<string, string[]> = {
  benefit: ['お得', '割引', 'OFF', '無料', 'セール', '特典', 'ポイント', '節約', 'コスパ'],
  emotional: ['感動', '嬉しい', '楽しい', '素敵', '最高', '大好き', '幸せ', 'ありがとう', '夢'],
  scarcity: ['限定', '数量限定', '期間限定', '残りわずか', '早い者勝ち', '先着', 'ラスト', '今だけ'],
  social_proof: ['大人気', '話題', '注目', '累計', '万人', 'ランキング', '受賞', '実績', '選ばれ'],
  question: ['？', '知ってますか', 'ご存知', 'どう思', 'なぜ', 'みなさんは', 'どっち派'],
  news: ['速報', 'ニュース', '発表', 'リリース', 'プレスリリース', '最新', '情報解禁'],
  humor: ['笑', 'www', '草', '面白', 'ネタ', 'まさか', 'ツッコミ', 'じわる'],
};

export function classifyAppealFrame(text: string, hashtags: string[]): string {
  const combined = (text + ' ' + hashtags.join(' ')).toLowerCase();
  for (const [frame, keywords] of Object.entries(APPEAL_FRAME_RULES)) {
    for (const keyword of keywords) {
      if (combined.includes(keyword.toLowerCase())) {
        return frame;
      }
    }
  }
  return 'other';
}

// --- Ratio Metrics ---

export function calculateViralityRatio(reposts: number, likes: number): number {
  if (likes <= 0) return 0;
  return reposts / likes;
}

export function calculateConversationRatio(replies: number, likes: number): number {
  if (likes <= 0) return 0;
  return replies / likes;
}

export function calculateQuoteRatio(quotes: number, likes: number): number {
  if (likes <= 0) return 0;
  return quotes / likes;
}

// --- Day / Hour Helpers ---

export function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

export function getHourBucket(dateStr: string): string {
  const h = new Date(dateStr).getHours();
  if (h < 6) return 'deep_night';
  if (h < 9) return 'early_morning';
  if (h < 12) return 'morning';
  if (h < 14) return 'noon';
  if (h < 18) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

// --- Buzz Pattern Types and Extractor ---

export interface PostWithMetrics {
  id: string;
  text: string;
  posted_at: string;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  quotes_count: number;
  media_type: string;
  theme: string;
  appeal_frame: string;
  er: number;
  virality_ratio: number;
  conversation_ratio: number;
  quote_ratio: number;
}

export interface BuzzPattern {
  key: string;
  theme: string;
  appeal_frame: string;
  media_type: string;
  day_of_week: string;
  hour_bucket: string;
  count: number;
  avg_er: number;
  avg_virality_ratio: number;
  avg_conversation_ratio: number;
  avg_quote_ratio: number;
  example_texts: string[];
}

export function extractBuzzPatterns(posts: PostWithMetrics[], topN = 10): BuzzPattern[] {
  const map = new Map<string, {
    theme: string; appeal_frame: string; media_type: string;
    day_of_week: string; hour_bucket: string;
    ers: number[]; vrs: number[]; crs: number[]; qrs: number[];
    texts: string[];
  }>();

  for (const p of posts) {
    const dow = getDayOfWeek(p.posted_at);
    const hb = getHourBucket(p.posted_at);
    const key = `${p.theme}|${p.appeal_frame}|${p.media_type}|${dow}|${hb}`;

    if (!map.has(key)) {
      map.set(key, {
        theme: p.theme, appeal_frame: p.appeal_frame, media_type: p.media_type,
        day_of_week: dow, hour_bucket: hb,
        ers: [], vrs: [], crs: [], qrs: [], texts: [],
      });
    }
    const entry = map.get(key)!;
    entry.ers.push(p.er);
    entry.vrs.push(p.virality_ratio);
    entry.crs.push(p.conversation_ratio);
    entry.qrs.push(p.quote_ratio);
    entry.texts.push(p.text);
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const patterns: BuzzPattern[] = Array.from(map.entries()).map(([key, v]) => ({
    key,
    theme: v.theme,
    appeal_frame: v.appeal_frame,
    media_type: v.media_type,
    day_of_week: v.day_of_week,
    hour_bucket: v.hour_bucket,
    count: v.ers.length,
    avg_er: avg(v.ers),
    avg_virality_ratio: avg(v.vrs),
    avg_conversation_ratio: avg(v.crs),
    avg_quote_ratio: avg(v.qrs),
    example_texts: v.texts.slice(0, 3),
  }));

  patterns.sort((a, b) => b.avg_er - a.avg_er);
  return patterns.slice(0, topN);
}
