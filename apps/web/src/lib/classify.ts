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
