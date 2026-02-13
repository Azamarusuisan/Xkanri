import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  // Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('owner_user_id', user.id)
    .single();

  if (!tenant) {
    return { error: NextResponse.json({ error: 'No tenant found' }, { status: 404 }) };
  }

  return { supabase, user, tenantId: tenant.id };
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
