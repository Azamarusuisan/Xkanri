import { NextRequest } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/crypto';
import { getUserById, getUserTweets, type XTweet, type XMedia } from '@/lib/x-api';
import { classifyTheme } from '@/lib/classify';

// This endpoint is meant to be called by a cron job.
// In production, you'd use Supabase Edge Functions + pg_cron.
// For local dev, call this via a script or manual trigger.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  return createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  // Simple auth: check for a secret header
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret !== (process.env.CRON_SECRET || 'dev-secret')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Pick up to 5 queued or rate_limited jobs (rate_limited ones whose rate limit might have reset)
  const { data: jobs } = await supabase
    .from('fetch_jobs')
    .select('*, tracked_accounts!inner(*)')
    .in('status', ['queued', 'rate_limited'])
    .is('locked_at', null)
    .order('created_at', { ascending: true })
    .limit(5);

  if (!jobs || jobs.length === 0) {
    return Response.json({ message: 'No jobs to process', processed: 0 });
  }

  // Ensure one job per tenant at a time
  const seenTenants = new Set<string>();
  const jobsToRun = jobs.filter((j) => {
    if (seenTenants.has(j.tenant_id)) return false;
    seenTenants.add(j.tenant_id);
    return true;
  });

  const results = [];

  for (const job of jobsToRun) {
    try {
      // Lock the job
      await supabase
        .from('fetch_jobs')
        .update({ status: 'running', locked_at: new Date().toISOString(), started_at: new Date().toISOString() })
        .eq('id', job.id);

      // Get bearer token
      const { data: conn } = await supabase
        .from('connections_x')
        .select('encrypted_bearer_token, status')
        .eq('tenant_id', job.tenant_id)
        .limit(1)
        .single();

      if (!conn || conn.status === 'invalid') {
        await failJob(supabase, job.id, 'X接続が無効です');
        results.push({ job_id: job.id, status: 'failed', reason: 'invalid connection' });
        continue;
      }

      const bearerToken = decrypt(conn.encrypted_bearer_token);
      const account = job.tracked_accounts;

      let actualRequests = 0;
      let postsFetched = 0;

      // 1. Get user info / snapshot
      const userStart = Date.now();
      const userResult = await getUserById(bearerToken, account.x_user_id);
      const userTime = Date.now() - userStart;
      actualRequests++;

      await logApiCall(supabase, job.tenant_id, job.id, '/2/users/:id', 'GET', userResult.status, 1, userTime, userResult.errors?.[0]?.message);

      if (userResult.status === 429) {
        await rateLimitJob(supabase, job.id);
        results.push({ job_id: job.id, status: 'rate_limited' });
        continue;
      }

      // Save snapshot
      if (userResult.data?.public_metrics) {
        const pm = userResult.data.public_metrics;
        await supabase.from('account_snapshots').insert({
          tenant_id: job.tenant_id,
          tracked_account_id: account.id,
          followers_count: pm.followers_count,
          following_count: pm.following_count,
          tweet_count: pm.tweet_count,
          listed_count: pm.listed_count,
        });

        // Update tracked account followers
        await supabase
          .from('tracked_accounts')
          .update({ followers_count: pm.followers_count })
          .eq('id', account.id);
      }

      // 2. Fetch tweets with pagination
      let paginationToken: string | undefined;
      let hasMore = true;
      let rateLimited = false;
      let newestId: string | null = null;

      while (hasMore) {
        const tweetsStart = Date.now();
        const tweetsResult = await getUserTweets(bearerToken, account.x_user_id, {
          sinceId: account.cursor_since_id || undefined,
          paginationToken,
          maxResults: 100,
          startTime: job.period_start || undefined,
          endTime: job.period_end || undefined,
        });
        const tweetsTime = Date.now() - tweetsStart;
        actualRequests++;

        await logApiCall(
          supabase, job.tenant_id, job.id,
          '/2/users/:id/tweets', 'GET',
          tweetsResult.status, 1, tweetsTime,
          tweetsResult.errors?.[0]?.message
        );

        if (tweetsResult.status === 429) {
          rateLimited = true;
          break;
        }

        if (tweetsResult.status !== 200) {
          await failJob(supabase, job.id, `API error: ${tweetsResult.status} ${tweetsResult.errors?.[0]?.message || ''}`);
          break;
        }

        const tweets = tweetsResult.data || [];
        const mediaMap = new Map<string, string>();
        if (tweetsResult.includes?.media) {
          for (const m of tweetsResult.includes.media) {
            mediaMap.set(m.media_key, m.type);
          }
        }

        // Track newest ID for cursor
        if (tweetsResult.meta?.newest_id && !newestId) {
          newestId = tweetsResult.meta.newest_id;
        }

        // Insert posts
        for (const tweet of tweets) {
          const hashtags = tweet.entities?.hashtags?.map((h) => h.tag) || [];
          const mediaType = resolveMediaType(tweet, mediaMap);
          const theme = classifyTheme(tweet.text || '', hashtags);

          const { error: insertError } = await supabase.from('posts').upsert(
            {
              tenant_id: job.tenant_id,
              tracked_account_id: account.id,
              post_x_id: tweet.id,
              text: tweet.text,
              posted_at: tweet.created_at,
              likes_count: tweet.public_metrics?.like_count || 0,
              replies_count: tweet.public_metrics?.reply_count || 0,
              reposts_count: tweet.public_metrics?.retweet_count || 0,
              quotes_count: tweet.public_metrics?.quote_count || 0,
              impressions_count: tweet.public_metrics?.impression_count || 0,
              media_type: mediaType,
              hashtags,
              theme,
              raw_json: tweet as unknown as Record<string, unknown>,
            },
            { onConflict: 'tenant_id,post_x_id' }
          );

          if (!insertError) {
            postsFetched++;
          }
        }

        // Check for more pages
        paginationToken = tweetsResult.meta?.next_token;
        hasMore = !!paginationToken;
      }

      if (rateLimited) {
        await supabase
          .from('fetch_jobs')
          .update({
            status: 'rate_limited',
            actual_requests: actualRequests,
            posts_fetched: postsFetched,
            locked_at: null,
          })
          .eq('id', job.id);
        results.push({ job_id: job.id, status: 'rate_limited', posts_fetched: postsFetched });
      } else {
        // Update cursor
        if (newestId) {
          await supabase
            .from('tracked_accounts')
            .update({ cursor_since_id: newestId })
            .eq('id', account.id);
        }

        // Mark completed
        await supabase
          .from('fetch_jobs')
          .update({
            status: 'completed',
            actual_requests: actualRequests,
            posts_fetched: postsFetched,
            completed_at: new Date().toISOString(),
            locked_at: null,
          })
          .eq('id', job.id);
        results.push({ job_id: job.id, status: 'completed', posts_fetched: postsFetched });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await failJob(supabase, job.id, message);
      results.push({ job_id: job.id, status: 'failed', error: message });
    }
  }

  return Response.json({ processed: results.length, results });
}

function resolveMediaType(
  tweet: XTweet,
  mediaMap: Map<string, string>
): string {
  const keys = tweet.attachments?.media_keys || [];
  if (keys.length === 0) return 'none';

  const types = keys.map((k) => mediaMap.get(k)).filter(Boolean);
  if (types.length === 0) return 'none';

  const unique = new Set(types);
  if (unique.size > 1) return 'mixed';
  return types[0] || 'none';
}

async function failJob(supabase: any, jobId: string, message: string) {
  await supabase
    .from('fetch_jobs')
    .update({
      status: 'failed',
      error_message: message,
      locked_at: null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

async function rateLimitJob(supabase: any, jobId: string) {
  await supabase
    .from('fetch_jobs')
    .update({
      status: 'rate_limited',
      locked_at: null,
    })
    .eq('id', jobId);
}

async function logApiCall(
  supabase: any,
  tenantId: string,
  jobId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  estimatedUnits: number,
  responseTimeMs: number,
  errorMessage?: string | null,
) {
  await supabase.from('api_call_logs').insert({
    tenant_id: tenantId,
    fetch_job_id: jobId,
    endpoint,
    method,
    status_code: statusCode,
    estimated_units: estimatedUnits,
    response_time_ms: responseTimeMs,
    error_message: errorMessage || null,
  });
}
