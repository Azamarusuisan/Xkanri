import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';
import { DEMO_MODE, DEMO_AUDIT_LOGS } from '@/lib/demo';

// GET: 監査ログ集計
export async function GET(request: NextRequest) {
  if (DEMO_MODE) {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    let logs = DEMO_AUDIT_LOGS;
    if (dateFrom) logs = logs.filter((l) => l.created_at >= dateFrom);
    if (dateTo) logs = logs.filter((l) => l.created_at <= dateTo + 'T23:59:59');
    const endpointBreakdown: Record<string, { count: number; units: number }> = {};
    let totalUnits = 0;
    let rateLimitCount = 0;
    const dailyBreakdown: Record<string, { calls: number; units: number }> = {};
    for (const log of logs) {
      const ep = log.endpoint;
      if (!endpointBreakdown[ep]) endpointBreakdown[ep] = { count: 0, units: 0 };
      endpointBreakdown[ep].count++;
      endpointBreakdown[ep].units += log.estimated_units;
      totalUnits += log.estimated_units;
      if (log.status_code === 429) rateLimitCount++;
      const day = new Date(log.created_at).toISOString().slice(0, 10);
      if (!dailyBreakdown[day]) dailyBreakdown[day] = { calls: 0, units: 0 };
      dailyBreakdown[day].calls++;
      dailyBreakdown[day].units += log.estimated_units;
    }
    return jsonResponse({
      logs: logs.slice(0, limit), total_logs: logs.length, page, limit,
      total_pages: Math.ceil(logs.length / limit),
      summary: {
        total_calls: logs.length, total_units: totalUnits, rate_limit_count: rateLimitCount,
        endpoint_breakdown: Object.entries(endpointBreakdown).map(([endpoint, d]) => ({ endpoint, ...d })),
        daily: Object.entries(dailyBreakdown).map(([date, d]) => ({ date, ...d })).sort((a, b) => a.date.localeCompare(b.date)),
      },
    });
  }

  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  // 1. Recent logs with pagination
  let logsQuery = supabase
    .from('api_call_logs')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (dateFrom) logsQuery = logsQuery.gte('created_at', dateFrom);
  if (dateTo) logsQuery = logsQuery.lte('created_at', dateTo);

  const offset = (page - 1) * limit;
  logsQuery = logsQuery.range(offset, offset + limit - 1);

  const { data: logs, count: totalLogs, error } = await logsQuery;
  if (error) return errorResponse(error.message, 500);

  // 2. All logs for aggregation (use a separate query)
  let allLogsQuery = supabase
    .from('api_call_logs')
    .select('endpoint, status_code, estimated_units, created_at')
    .eq('tenant_id', tenantId);

  if (dateFrom) allLogsQuery = allLogsQuery.gte('created_at', dateFrom);
  if (dateTo) allLogsQuery = allLogsQuery.lte('created_at', dateTo);

  const { data: allLogs } = await allLogsQuery;

  // 3. Aggregate: endpoint breakdown
  const endpointBreakdown: Record<string, { count: number; units: number }> = {};
  let totalUnits = 0;
  let rateLimitCount = 0;

  for (const log of allLogs || []) {
    const ep = log.endpoint;
    if (!endpointBreakdown[ep]) {
      endpointBreakdown[ep] = { count: 0, units: 0 };
    }
    endpointBreakdown[ep].count++;
    endpointBreakdown[ep].units += log.estimated_units || 1;
    totalUnits += log.estimated_units || 1;

    if (log.status_code === 429) {
      rateLimitCount++;
    }
  }

  // 4. Daily breakdown
  const dailyBreakdown: Record<string, { calls: number; units: number }> = {};
  for (const log of allLogs || []) {
    const day = new Date(log.created_at).toISOString().slice(0, 10);
    if (!dailyBreakdown[day]) {
      dailyBreakdown[day] = { calls: 0, units: 0 };
    }
    dailyBreakdown[day].calls++;
    dailyBreakdown[day].units += log.estimated_units || 1;
  }

  const dailyData = Object.entries(dailyBreakdown)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return jsonResponse({
    logs: logs || [],
    total_logs: totalLogs || 0,
    page,
    limit,
    total_pages: Math.ceil((totalLogs || 0) / limit),
    summary: {
      total_calls: allLogs?.length || 0,
      total_units: totalUnits,
      rate_limit_count: rateLimitCount,
      endpoint_breakdown: Object.entries(endpointBreakdown).map(([endpoint, data]) => ({
        endpoint,
        ...data,
      })),
      daily: dailyData,
    },
  });
}
