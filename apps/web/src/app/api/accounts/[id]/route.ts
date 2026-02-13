import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';

// PUT: 更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;
  const { id } = await params;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.is_competitor === 'boolean') updates.is_competitor = body.is_competitor;
  if (Array.isArray(body.tags)) updates.tags = body.tags;
  if (typeof body.memo === 'string') updates.memo = body.memo || null;

  const { data, error } = await supabase
    .from('tracked_accounts')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse('Not found', 404);
  return jsonResponse({ account: data });
}

// DELETE: 削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;
  const { id } = await params;

  const { error } = await supabase
    .from('tracked_accounts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ ok: true });
}
