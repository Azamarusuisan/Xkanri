import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';

// GET: ジョブ一覧
export async function GET() {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { data, error } = await supabase
    .from('fetch_jobs')
    .select(`
      *,
      tracked_accounts!inner (
        username,
        display_name
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ jobs: data });
}

// POST: ジョブ作成
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const body = await request.json();
  const { tracked_account_id, period } = body;

  if (!tracked_account_id) {
    return errorResponse('追跡アカウントIDは必須です');
  }

  // Verify account belongs to tenant
  const { data: account } = await supabase
    .from('tracked_accounts')
    .select('id, x_user_id, username, followers_count')
    .eq('id', tracked_account_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!account) {
    return errorResponse('アカウントが見つかりません', 404);
  }

  // Calculate period
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

  // Estimate requests
  const daysInPeriod = Math.ceil((now.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));
  // Rough estimate: 2-5 tweets per day for typical accounts
  const estimatedTweets = Math.ceil(daysInPeriod * 3);
  const tweetsPerRequest = 100;
  const estimatedRequests = 1 + Math.ceil(estimatedTweets / tweetsPerRequest) + 1; // user info + tweets + snapshot

  // Check for existing queued/running job for same account
  const { data: existingJob } = await supabase
    .from('fetch_jobs')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('tracked_account_id', tracked_account_id)
    .in('status', ['queued', 'running'])
    .limit(1)
    .single();

  if (existingJob) {
    return errorResponse('このアカウントには既に実行中/待機中のジョブがあります', 409);
  }

  const { data: job, error } = await supabase
    .from('fetch_jobs')
    .insert({
      tenant_id: tenantId,
      tracked_account_id,
      status: 'queued',
      mode: 'light',
      period_start: periodStart.toISOString(),
      period_end: now.toISOString(),
      estimated_requests: estimatedRequests,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ job, estimated_requests: estimatedRequests }, 201);
}
