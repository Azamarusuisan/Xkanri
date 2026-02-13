import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';

// GET: 投稿一覧（フィルタ/検索/ページネーション）
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const search = searchParams.get('search') || '';
  const mediaType = searchParams.get('media_type') || '';
  const isHit = searchParams.get('is_hit');
  const accountId = searchParams.get('account_id') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const theme = searchParams.get('theme') || '';

  let query = supabase
    .from('posts')
    .select(`
      *,
      tracked_accounts!inner (
        username,
        display_name
      )
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('posted_at', { ascending: false });

  if (search) {
    query = query.textSearch('text', search, { type: 'plain' });
  }
  if (mediaType) {
    query = query.eq('media_type', mediaType);
  }
  if (isHit === 'true') {
    query = query.eq('is_hit', true);
  } else if (isHit === 'false') {
    query = query.eq('is_hit', false);
  }
  if (accountId) {
    query = query.eq('tracked_account_id', accountId);
  }
  if (dateFrom) {
    query = query.gte('posted_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('posted_at', dateTo);
  }
  if (theme) {
    query = query.eq('theme', theme);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({
    posts: data,
    total: count || 0,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
  });
}
