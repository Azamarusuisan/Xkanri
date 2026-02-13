import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';
import { DEMO_MODE, DEMO_ADS_CONNECTION } from '@/lib/demo';

// GET: Ads接続情報
export async function GET() {
  if (DEMO_MODE) {
    return jsonResponse({ connection: DEMO_ADS_CONNECTION });
  }

  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { data, error } = await supabase
    .from('connections_ads_x')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ connection: data });
}

// POST: Ads接続作成/更新
export async function POST(request: NextRequest) {
  if (DEMO_MODE) {
    return jsonResponse({ connection: DEMO_ADS_CONNECTION }, 201);
  }

  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const body = await request.json();
  const { oauth_token, oauth_secret } = body;

  if (!oauth_token) return errorResponse('oauth_token is required', 400);

  const { data, error } = await supabase
    .from('connections_ads_x')
    .upsert({
      tenant_id: tenantId,
      oauth_token_enc: oauth_token,
      oauth_secret_enc: oauth_secret || null,
      status: 'untested',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ connection: data }, 201);
}
