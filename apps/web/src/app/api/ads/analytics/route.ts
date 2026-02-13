import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';
import { DEMO_MODE, DEMO_AD_STATS_DAILY, DEMO_AD_CREATIVES, DEMO_POSTS } from '@/lib/demo';
import { calculateER } from '@/lib/classify';

export async function GET(request: NextRequest) {
  if (DEMO_MODE) {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';

    let stats = DEMO_AD_STATS_DAILY;
    if (dateFrom) stats = stats.filter(s => s.stat_date >= dateFrom);
    if (dateTo) stats = stats.filter(s => s.stat_date <= dateTo);

    const totalSpend = stats.reduce((s, r) => s + r.spend, 0);
    const totalImpressions = stats.reduce((s, r) => s + r.impressions, 0);
    const totalClicks = stats.reduce((s, r) => s + r.clicks, 0);
    const totalEngagements = stats.reduce((s, r) => s + r.engagements, 0);
    const totalConversions = stats.reduce((s, r) => s + r.conversions, 0);

    // Daily aggregation
    const dailyMap = new Map<string, { spend: number; impressions: number; clicks: number; engagements: number }>();
    for (const s of stats) {
      const prev = dailyMap.get(s.stat_date) || { spend: 0, impressions: 0, clicks: 0, engagements: 0 };
      dailyMap.set(s.stat_date, {
        spend: prev.spend + s.spend,
        impressions: prev.impressions + s.impressions,
        clicks: prev.clicks + s.clicks,
        engagements: prev.engagements + s.engagements,
      });
    }
    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Organic vs Paid comparison
    const organicVsPaid = DEMO_AD_CREATIVES.map(c => {
      const creativeStats = stats.filter(s => s.creative_id === c.id);
      const cSpend = creativeStats.reduce((s, r) => s + r.spend, 0);
      const cImpressions = creativeStats.reduce((s, r) => s + r.impressions, 0);
      const cClicks = creativeStats.reduce((s, r) => s + r.clicks, 0);
      const cEngagements = creativeStats.reduce((s, r) => s + r.engagements, 0);
      const paidER = cImpressions > 0 ? cEngagements / cImpressions : 0;

      // Find linked organic post
      const organicPost = DEMO_POSTS.find(p => p.id === c.post_id);
      const organicER = organicPost
        ? calculateER(organicPost.likes_count, organicPost.replies_count, organicPost.reposts_count, organicPost.quotes_count, 1250000)
        : 0;

      return {
        creative_id: c.id,
        creative_name: c.name,
        paid_er: Math.round(paidER * 10000) / 10000,
        organic_er: Math.round(organicER * 10000) / 10000,
        spend: cSpend,
        impressions: cImpressions,
        clicks: cClicks,
        engagements: cEngagements,
      };
    });

    return jsonResponse({
      total_creatives: DEMO_AD_CREATIVES.length,
      summary: {
        total_spend: totalSpend,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_engagements: totalEngagements,
        total_conversions: totalConversions,
        cpc: totalClicks > 0 ? Math.round(totalSpend / totalClicks) : 0,
        cpe: totalEngagements > 0 ? Math.round(totalSpend / totalEngagements) : 0,
        ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 10000 : 0,
      },
      daily_stats: dailyStats,
      organic_vs_paid: organicVsPaid,
    });
  }

  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  let query = supabase
    .from('ad_stats_daily')
    .select('*, ad_creatives!inner(id, name, post_id)')
    .eq('tenant_id', tenantId);

  if (dateFrom) query = query.gte('stat_date', dateFrom);
  if (dateTo) query = query.lte('stat_date', dateTo);

  const { data: stats, error } = await query;
  if (error) return errorResponse(error.message, 500);
  if (!stats || stats.length === 0) {
    return jsonResponse({
      total_creatives: 0,
      summary: { total_spend: 0, total_impressions: 0, total_clicks: 0, total_engagements: 0, total_conversions: 0, cpc: 0, cpe: 0, ctr: 0 },
      daily_stats: [],
      organic_vs_paid: [],
    });
  }

  const totalSpend = stats.reduce((s: number, r: any) => s + r.spend, 0);
  const totalImpressions = stats.reduce((s: number, r: any) => s + r.impressions, 0);
  const totalClicks = stats.reduce((s: number, r: any) => s + r.clicks, 0);
  const totalEngagements = stats.reduce((s: number, r: any) => s + r.engagements, 0);
  const totalConversions = stats.reduce((s: number, r: any) => s + r.conversions, 0);

  return jsonResponse({
    total_creatives: new Set(stats.map((s: any) => s.creative_id)).size,
    summary: {
      total_spend: totalSpend,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_engagements: totalEngagements,
      total_conversions: totalConversions,
      cpc: totalClicks > 0 ? Math.round(totalSpend / totalClicks) : 0,
      cpe: totalEngagements > 0 ? Math.round(totalSpend / totalEngagements) : 0,
      ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 10000 : 0,
    },
    daily_stats: [],
    organic_vs_paid: [],
  });
}
