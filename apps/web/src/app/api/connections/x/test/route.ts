import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';
import { decrypt } from '@/lib/crypto';
import { verifyCredentials } from '@/lib/x-api';

// POST: 接続テスト
export async function POST() {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  // Get connection
  const { data: conn } = await supabase
    .from('connections_x')
    .select('id, encrypted_bearer_token')
    .eq('tenant_id', tenantId)
    .limit(1)
    .single();

  if (!conn) {
    return errorResponse('接続が見つかりません', 404);
  }

  // Decrypt token
  let bearerToken: string;
  try {
    bearerToken = decrypt(conn.encrypted_bearer_token);
  } catch {
    await supabase
      .from('connections_x')
      .update({ status: 'invalid', last_tested_at: new Date().toISOString() })
      .eq('id', conn.id);
    return errorResponse('トークンの復号に失敗しました', 500);
  }

  // Log the API call
  const startTime = Date.now();
  const result = await verifyCredentials(bearerToken);
  const responseTime = Date.now() - startTime;

  // Record API call log
  await supabase.from('api_call_logs').insert({
    tenant_id: tenantId,
    endpoint: '/2/users/me',
    method: 'GET',
    status_code: result.status,
    estimated_units: 1,
    response_time_ms: responseTime,
    error_message: result.errors?.[0]?.message || null,
  });

  if (result.status === 429) {
    await supabase
      .from('connections_x')
      .update({ status: 'rate_limited', last_tested_at: new Date().toISOString() })
      .eq('id', conn.id);
    return jsonResponse({ status: 'rate_limited', message: 'レート制限中です。しばらく待ってから再試行してください。' });
  }

  if (result.status !== 200 || !result.data) {
    await supabase
      .from('connections_x')
      .update({ status: 'invalid', last_tested_at: new Date().toISOString() })
      .eq('id', conn.id);
    return jsonResponse({
      status: 'invalid',
      message: result.errors?.[0]?.message || 'トークンが無効です',
    });
  }

  // Success
  await supabase
    .from('connections_x')
    .update({
      status: 'ok',
      x_user_id: result.data.id,
      x_username: result.data.username,
      last_tested_at: new Date().toISOString(),
    })
    .eq('id', conn.id);

  return jsonResponse({
    status: 'ok',
    user: {
      id: result.data.id,
      username: result.data.username,
      name: result.data.name,
    },
  });
}
