import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';
import { encrypt } from '@/lib/crypto';

// GET: 接続情報取得
export async function GET() {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { data, error } = await supabase
    .from('connections_x')
    .select('id, status, x_user_id, x_username, last_tested_at, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ connection: data || null });
}

// POST: 新規接続 or 更新
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const body = await request.json();
  const { bearerToken } = body;

  if (!bearerToken || typeof bearerToken !== 'string' || bearerToken.trim().length === 0) {
    return errorResponse('Bearer Token は必須です');
  }

  const encryptedToken = encrypt(bearerToken.trim());

  // Upsert: 1 tenant = 1 connection
  const { data: existing } = await supabase
    .from('connections_x')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('connections_x')
      .update({
        encrypted_bearer_token: encryptedToken,
        status: 'untested',
        x_user_id: null,
        x_username: null,
        last_tested_at: null,
      })
      .eq('id', existing.id)
      .select('id, status, x_user_id, x_username, last_tested_at')
      .single();

    if (error) return errorResponse(error.message, 500);
    return jsonResponse({ connection: data });
  } else {
    const { data, error } = await supabase
      .from('connections_x')
      .insert({
        tenant_id: tenantId,
        encrypted_bearer_token: encryptedToken,
        status: 'untested',
      })
      .select('id, status, x_user_id, x_username, last_tested_at')
      .single();

    if (error) return errorResponse(error.message, 500);
    return jsonResponse({ connection: data }, 201);
  }
}
