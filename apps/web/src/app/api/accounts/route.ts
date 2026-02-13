import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';
import { decrypt } from '@/lib/crypto';
import { getUserByUsername } from '@/lib/x-api';

// GET: 追跡アカウント一覧
export async function GET() {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { data, error } = await supabase
    .from('tracked_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ accounts: data });
}

// POST: 追跡アカウント登録 (handle → X user ID 解決)
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const body = await request.json();
  const { username, is_competitor = false, tags = [], memo = '' } = body;

  if (!username || typeof username !== 'string') {
    return errorResponse('ユーザー名（handle）は必須です');
  }

  // Get connection for API call
  const { data: conn } = await supabase
    .from('connections_x')
    .select('id, encrypted_bearer_token, status')
    .eq('tenant_id', tenantId)
    .limit(1)
    .single();

  if (!conn || conn.status !== 'ok') {
    return errorResponse('X接続が有効ではありません。先にX接続を設定してください。', 400);
  }

  const bearerToken = decrypt(conn.encrypted_bearer_token);

  // Resolve handle → user ID
  const startTime = Date.now();
  const result = await getUserByUsername(bearerToken, username);
  const responseTime = Date.now() - startTime;

  // Log API call
  await supabase.from('api_call_logs').insert({
    tenant_id: tenantId,
    endpoint: `/2/users/by/username/${username.replace(/^@/, '')}`,
    method: 'GET',
    status_code: result.status,
    estimated_units: 1,
    response_time_ms: responseTime,
    error_message: result.errors?.[0]?.message || null,
  });

  if (result.status === 429) {
    return errorResponse('レート制限中です。しばらく待ってから再試行してください。', 429);
  }

  if (!result.data) {
    return errorResponse(
      result.errors?.[0]?.message || 'ユーザーが見つかりません',
      404
    );
  }

  const xUser = result.data;

  // Check if already tracked
  const { data: existing } = await supabase
    .from('tracked_accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('x_user_id', xUser.id)
    .single();

  if (existing) {
    return errorResponse('このアカウントは既に追跡中です', 409);
  }

  // Insert tracked account
  const { data: account, error } = await supabase
    .from('tracked_accounts')
    .insert({
      tenant_id: tenantId,
      x_user_id: xUser.id,
      username: xUser.username,
      display_name: xUser.name,
      is_competitor,
      tags: Array.isArray(tags) ? tags : [],
      memo: memo || null,
      followers_count: xUser.public_metrics?.followers_count || null,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  // Also create an initial snapshot
  if (xUser.public_metrics) {
    await supabase.from('account_snapshots').insert({
      tenant_id: tenantId,
      tracked_account_id: account.id,
      followers_count: xUser.public_metrics.followers_count,
      following_count: xUser.public_metrics.following_count,
      tweet_count: xUser.public_metrics.tweet_count,
      listed_count: xUser.public_metrics.listed_count,
    });
  }

  return jsonResponse({ account }, 201);
}
