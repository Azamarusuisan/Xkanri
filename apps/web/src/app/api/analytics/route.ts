import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';
import { calculateER } from '@/lib/classify';
import { DEMO_MODE, DEMO_POSTS, DEMO_ACCOUNTS } from '@/lib/demo';

// GET: 分析データ
export async function GET(request: NextRequest) {
  if (DEMO_MODE) {
    const posts = DEMO_POSTS;
    const followers = 1250000;
    const dailyMap = new Map<string, number>();
    const weeklyMap = new Map<string, number>();
    for (const p of posts) {
      const d = new Date(p.posted_at);
      const day = d.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
      const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
      const wk = ws.toISOString().slice(0, 10);
      weeklyMap.set(wk, (weeklyMap.get(wk) || 0) + 1);
    }
    const daily = Array.from(dailyMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
    const weekly = Array.from(weeklyMap).map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week));
    const mediaRatio: Record<string, number> = {};
    const themeDistribution: Record<string, number> = {};
    for (const p of posts) {
      mediaRatio[p.media_type] = (mediaRatio[p.media_type] || 0) + 1;
      const t = p.theme || 'other';
      themeDistribution[t] = (themeDistribution[t] || 0) + 1;
    }
    const erValues = posts.map(p => ({
      id: p.id, er: calculateER(p.likes_count, p.replies_count, p.reposts_count, p.quotes_count, followers),
    }));
    const sorted = [...erValues.map(e => e.er)].sort((a, b) => a - b);
    const avgER = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p75 = sorted[Math.floor(sorted.length * 0.75)] || 0;
    const hits = posts.filter(p => {
      const er = erValues.find(e => e.id === p.id)?.er || 0;
      return er >= p75 && er > 0;
    }).map(p => ({
      id: p.id, post_x_id: p.post_x_id, text: p.text?.slice(0, 100),
      posted_at: p.posted_at, er: erValues.find(e => e.id === p.id)?.er || 0,
      likes_count: p.likes_count, reposts_count: p.reposts_count,
    })).sort((a, b) => b.er - a.er).slice(0, 20);
    return jsonResponse({
      total_posts: posts.length, followers_count: followers,
      frequency: { daily, weekly }, media_ratio: mediaRatio,
      er_stats: { avg: Math.round(avgER * 10000) / 10000, p75: Math.round(p75 * 10000) / 10000, max: Math.round(sorted[sorted.length - 1]! * 10000) / 10000 },
      hits, theme_distribution: themeDistribution,
    });
  }

  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  // Get all posts for analysis
  let query = supabase
    .from('posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('posted_at', { ascending: true });

  if (accountId) query = query.eq('tracked_account_id', accountId);
  if (dateFrom) query = query.gte('posted_at', dateFrom);
  if (dateTo) query = query.lte('posted_at', dateTo);

  const { data: posts, error } = await query;
  if (error) return errorResponse(error.message, 500);
  if (!posts || posts.length === 0) {
    return jsonResponse({
      total_posts: 0,
      frequency: { daily: [], weekly: [] },
      media_ratio: {},
      er_stats: { avg: 0, p75: 0, max: 0 },
      hits: [],
      theme_distribution: {},
    });
  }

  // Get latest snapshot for followers
  let followersCount = 0;
  if (accountId) {
    const { data: snapshot } = await supabase
      .from('account_snapshots')
      .select('followers_count')
      .eq('tracked_account_id', accountId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .single();
    followersCount = snapshot?.followers_count || 0;
  } else {
    // Use average followers across tracked accounts
    const { data: accounts } = await supabase
      .from('tracked_accounts')
      .select('followers_count')
      .eq('tenant_id', tenantId);
    if (accounts && accounts.length > 0) {
      followersCount = Math.round(
        accounts.reduce((sum, a) => sum + (a.followers_count || 0), 0) / accounts.length
      );
    }
  }

  // 1. Post frequency (daily/weekly)
  const dailyMap = new Map<string, number>();
  const weeklyMap = new Map<string, number>();
  for (const post of posts) {
    const date = new Date(post.posted_at);
    const dayKey = date.toISOString().slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);

    // ISO week
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weekly = Array.from(weeklyMap.entries())
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // 2. Media ratio
  const mediaRatio: Record<string, number> = {};
  for (const post of posts) {
    const mt = post.media_type || 'none';
    mediaRatio[mt] = (mediaRatio[mt] || 0) + 1;
  }

  // 3. ER calculation
  const erValues = posts.map((post) => ({
    id: post.id,
    er: calculateER(
      post.likes_count,
      post.replies_count,
      post.reposts_count,
      post.quotes_count,
      followersCount
    ),
  }));

  const sortedER = [...erValues.map((e) => e.er)].sort((a, b) => a - b);
  const avgER = sortedER.reduce((a, b) => a + b, 0) / sortedER.length;
  const p75Index = Math.floor(sortedER.length * 0.75);
  const p75ER = sortedER[p75Index] || 0;
  const maxER = sortedER[sortedER.length - 1] || 0;

  // 4. Hit posts (ER >= p75 and ER > 0)
  const hitPostIds = new Set(
    erValues.filter((e) => e.er >= p75ER && e.er > 0).map((e) => e.id)
  );
  const hits = posts
    .filter((p) => hitPostIds.has(p.id))
    .map((p) => ({
      id: p.id,
      post_x_id: p.post_x_id,
      text: p.text?.slice(0, 100),
      posted_at: p.posted_at,
      er: erValues.find((e) => e.id === p.id)?.er || 0,
      likes_count: p.likes_count,
      reposts_count: p.reposts_count,
    }))
    .sort((a, b) => b.er - a.er)
    .slice(0, 20);

  // 5. Theme distribution
  const themeDistribution: Record<string, number> = {};
  for (const post of posts) {
    const t = post.theme || 'other';
    themeDistribution[t] = (themeDistribution[t] || 0) + 1;
  }

  // Update is_hit in DB (batch)
  if (hitPostIds.size > 0) {
    // Mark hits
    await supabase
      .from('posts')
      .update({ is_hit: true })
      .eq('tenant_id', tenantId)
      .in('id', Array.from(hitPostIds));

    // Unmark non-hits
    const nonHitIds = posts.filter((p) => !hitPostIds.has(p.id)).map((p) => p.id);
    if (nonHitIds.length > 0) {
      await supabase
        .from('posts')
        .update({ is_hit: false })
        .eq('tenant_id', tenantId)
        .in('id', nonHitIds);
    }
  }

  return jsonResponse({
    total_posts: posts.length,
    followers_count: followersCount,
    frequency: { daily, weekly },
    media_ratio: mediaRatio,
    er_stats: {
      avg: Math.round(avgER * 10000) / 10000,
      p75: Math.round(p75ER * 10000) / 10000,
      max: Math.round(maxER * 10000) / 10000,
    },
    hits,
    theme_distribution: themeDistribution,
  });
}
