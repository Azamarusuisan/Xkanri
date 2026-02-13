import { NextRequest } from 'next/server';
import { getAuthenticatedClient, errorResponse } from '@/lib/api-helpers';

// GET: CSV エクスポート
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  let query = supabase
    .from('posts')
    .select(`
      post_x_id,
      text,
      posted_at,
      likes_count,
      replies_count,
      reposts_count,
      quotes_count,
      impressions_count,
      media_type,
      hashtags,
      theme,
      is_hit,
      tracked_accounts!inner (
        username
      )
    `)
    .eq('tenant_id', tenantId)
    .order('posted_at', { ascending: false });

  if (accountId) query = query.eq('tracked_account_id', accountId);
  if (dateFrom) query = query.gte('posted_at', dateFrom);
  if (dateTo) query = query.lte('posted_at', dateTo);

  const { data, error } = await query;
  if (error) return errorResponse(error.message, 500);

  // Build CSV
  const headers = [
    'post_id', 'username', 'text', 'posted_at',
    'likes', 'replies', 'reposts', 'quotes', 'impressions',
    'media_type', 'hashtags', 'theme', 'is_hit',
  ];

  const rows = (data || []).map((p: any) => [
    p.post_x_id,
    `@${p.tracked_accounts.username}`,
    `"${(p.text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    p.posted_at,
    p.likes_count,
    p.replies_count,
    p.reposts_count,
    p.quotes_count,
    p.impressions_count,
    p.media_type,
    `"${(p.hashtags || []).join(',')}"`,
    p.theme,
    p.is_hit,
  ]);

  const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
  const bom = '\uFEFF'; // BOM for Excel

  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="posts_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
