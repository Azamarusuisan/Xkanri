import { NextRequest } from 'next/server';
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api-helpers';
import {
  calculateER, calculateViralityRatio, calculateConversationRatio,
  calculateQuoteRatio, classifyAppealFrame, extractBuzzPatterns,
  type PostWithMetrics,
} from '@/lib/classify';
import { DEMO_MODE, DEMO_POSTS, DEMO_ACCOUNTS } from '@/lib/demo';

export async function GET(request: NextRequest) {
  if (DEMO_MODE) {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';

    let posts = DEMO_POSTS;
    if (accountId) posts = posts.filter(p => p.tracked_account_id === accountId);
    if (dateFrom) posts = posts.filter(p => p.posted_at >= dateFrom);
    if (dateTo) posts = posts.filter(p => p.posted_at <= dateTo + 'T23:59:59');

    const followers = accountId
      ? (DEMO_ACCOUNTS.find(a => a.id === accountId)?.followers_count || 1250000)
      : 1250000;

    const enriched: PostWithMetrics[] = posts.map(p => ({
      id: p.id,
      text: p.text,
      posted_at: p.posted_at,
      likes_count: p.likes_count,
      replies_count: p.replies_count,
      reposts_count: p.reposts_count,
      quotes_count: p.quotes_count,
      media_type: p.media_type,
      theme: p.theme,
      appeal_frame: p.appeal_frame || classifyAppealFrame(p.text, p.hashtags),
      er: calculateER(p.likes_count, p.replies_count, p.reposts_count, p.quotes_count, followers),
      virality_ratio: calculateViralityRatio(p.reposts_count, p.likes_count),
      conversation_ratio: calculateConversationRatio(p.replies_count, p.likes_count),
      quote_ratio: calculateQuoteRatio(p.quotes_count, p.likes_count),
    }));

    if (enriched.length === 0) {
      return jsonResponse({
        total_posts: 0,
        summary: { avg_er: 0, avg_virality_ratio: 0, avg_conversation_ratio: 0, avg_quote_ratio: 0 },
        appeal_frame_distribution: {},
        winning_patterns: [],
      });
    }

    const avgER = enriched.reduce((s, p) => s + p.er, 0) / enriched.length;
    const avgVirality = enriched.reduce((s, p) => s + p.virality_ratio, 0) / enriched.length;
    const avgConversation = enriched.reduce((s, p) => s + p.conversation_ratio, 0) / enriched.length;
    const avgQuote = enriched.reduce((s, p) => s + p.quote_ratio, 0) / enriched.length;

    const appealFrameDist: Record<string, number> = {};
    for (const p of enriched) {
      appealFrameDist[p.appeal_frame] = (appealFrameDist[p.appeal_frame] || 0) + 1;
    }

    const winningPatterns = extractBuzzPatterns(enriched, 10);

    return jsonResponse({
      total_posts: enriched.length,
      summary: {
        avg_er: Math.round(avgER * 10000) / 10000,
        avg_virality_ratio: Math.round(avgVirality * 10000) / 10000,
        avg_conversation_ratio: Math.round(avgConversation * 10000) / 10000,
        avg_quote_ratio: Math.round(avgQuote * 10000) / 10000,
      },
      appeal_frame_distribution: appealFrameDist,
      winning_patterns: winningPatterns,
    });
  }

  const auth = await getAuthenticatedClient();
  if ('error' in auth && auth.error) return auth.error;
  const { supabase, tenantId } = auth as Exclude<typeof auth, { error: any }>;

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  let query = supabase
    .from('posts')
    .select('*, tracked_accounts!inner(followers_count)')
    .eq('tenant_id', tenantId)
    .order('posted_at', { ascending: false });

  if (accountId) query = query.eq('tracked_account_id', accountId);
  if (dateFrom) query = query.gte('posted_at', dateFrom);
  if (dateTo) query = query.lte('posted_at', dateTo);

  const { data: posts, error } = await query;
  if (error) return errorResponse(error.message, 500);
  if (!posts || posts.length === 0) {
    return jsonResponse({
      total_posts: 0,
      summary: { avg_er: 0, avg_virality_ratio: 0, avg_conversation_ratio: 0, avg_quote_ratio: 0 },
      appeal_frame_distribution: {},
      winning_patterns: [],
    });
  }

  const enriched: PostWithMetrics[] = posts.map((p: any) => {
    const followers = p.tracked_accounts?.followers_count || 1;
    return {
      id: p.id,
      text: p.text || '',
      posted_at: p.posted_at,
      likes_count: p.likes_count,
      replies_count: p.replies_count,
      reposts_count: p.reposts_count,
      quotes_count: p.quotes_count,
      media_type: p.media_type,
      theme: p.theme || 'other',
      appeal_frame: p.appeal_frame || classifyAppealFrame(p.text || '', p.hashtags || []),
      er: calculateER(p.likes_count, p.replies_count, p.reposts_count, p.quotes_count, followers),
      virality_ratio: calculateViralityRatio(p.reposts_count, p.likes_count),
      conversation_ratio: calculateConversationRatio(p.replies_count, p.likes_count),
      quote_ratio: calculateQuoteRatio(p.quotes_count, p.likes_count),
    };
  });

  const avgER = enriched.reduce((s, p) => s + p.er, 0) / enriched.length;
  const avgVirality = enriched.reduce((s, p) => s + p.virality_ratio, 0) / enriched.length;
  const avgConversation = enriched.reduce((s, p) => s + p.conversation_ratio, 0) / enriched.length;
  const avgQuote = enriched.reduce((s, p) => s + p.quote_ratio, 0) / enriched.length;

  const appealFrameDist: Record<string, number> = {};
  for (const p of enriched) {
    appealFrameDist[p.appeal_frame] = (appealFrameDist[p.appeal_frame] || 0) + 1;
  }

  const winningPatterns = extractBuzzPatterns(enriched, 10);

  return jsonResponse({
    total_posts: enriched.length,
    summary: {
      avg_er: Math.round(avgER * 10000) / 10000,
      avg_virality_ratio: Math.round(avgVirality * 10000) / 10000,
      avg_conversation_ratio: Math.round(avgConversation * 10000) / 10000,
      avg_quote_ratio: Math.round(avgQuote * 10000) / 10000,
    },
    appeal_frame_distribution: appealFrameDist,
    winning_patterns: winningPatterns,
  });
}
