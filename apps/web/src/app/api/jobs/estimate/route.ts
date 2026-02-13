import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';

// POST: 推定リクエスト数を計算（ジョブ作成前のプレビュー）
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const body = await request.json();
  const { tracked_account_ids, period } = body;

  if (!Array.isArray(tracked_account_ids) || tracked_account_ids.length === 0) {
    return errorResponse('追跡アカウントIDは必須です');
  }

  // Get accounts
  const { data: accounts } = await supabase
    .from('tracked_accounts')
    .select('id, username, followers_count, cursor_since_id')
    .eq('tenant_id', tenantId)
    .in('id', tracked_account_ids);

  if (!accounts || accounts.length === 0) {
    return errorResponse('アカウントが見つかりません', 404);
  }

  const now = new Date();
  let periodStart: Date;
  switch (period) {
    case '4weeks':
      periodStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1year':
      periodStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      periodStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  }

  const daysInPeriod = Math.ceil((now.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));

  const estimates = accounts.map((account) => {
    // If has cursor_since_id, likely fewer tweets to fetch (differential)
    const hasCursor = !!account.cursor_since_id;
    const estimatedTweetsPerDay = hasCursor ? 1.5 : 3;
    const estimatedTweets = Math.ceil(daysInPeriod * estimatedTweetsPerDay);
    const tweetRequests = Math.ceil(estimatedTweets / 100);
    const requests = 1 + tweetRequests + 1; // user lookup + tweets + snapshot

    return {
      account_id: account.id,
      username: account.username,
      estimated_tweets: estimatedTweets,
      estimated_requests: requests,
      is_differential: hasCursor,
    };
  });

  const totalRequests = estimates.reduce((sum, e) => sum + e.estimated_requests, 0);

  return jsonResponse({
    estimates,
    total_requests: totalRequests,
    period: {
      start: periodStart.toISOString(),
      end: now.toISOString(),
      days: daysInPeriod,
    },
  });
}
