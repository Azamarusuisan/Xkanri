import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlugZap, Users, ListTodo, Database } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get counts
  const [connections, accounts, jobs, posts] = await Promise.all([
    supabase.from('connections_x').select('id', { count: 'exact', head: true }),
    supabase.from('tracked_accounts').select('id', { count: 'exact', head: true }),
    supabase.from('fetch_jobs').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
  ]);

  const stats = [
    {
      label: 'X接続',
      value: connections.count ?? 0,
      icon: PlugZap,
      href: '/app/connections/x',
    },
    {
      label: '追跡アカウント',
      value: accounts.count ?? 0,
      icon: Users,
      href: '/app/accounts',
    },
    {
      label: '収集ジョブ',
      value: jobs.count ?? 0,
      icon: ListTodo,
      href: '/app/jobs',
    },
    {
      label: '投稿データ',
      value: posts.count ?? 0,
      icon: Database,
      href: '/app/data/posts',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">ダッシュボード</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {user?.email} でログイン中
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
