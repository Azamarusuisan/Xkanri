// Supabase Edge Function: cron_run_jobs
// This edge function is triggered by pg_cron every 1-5 minutes.
// It picks up queued/rate_limited fetch_jobs and executes them.
//
// For local development, use the Next.js API route /api/cron/run-jobs instead.
// This file is for production deployment on Supabase Edge Functions.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  // Forward to the Next.js API route for now
  // In production, this would contain the full job execution logic
  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
  const cronSecret = Deno.env.get('CRON_SECRET') || 'dev-secret';

  try {
    const res = await fetch(`${appUrl}/api/cron/run-jobs`, {
      method: 'POST',
      headers: {
        'x-cron-secret': cronSecret,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: res.status,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to run jobs', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
