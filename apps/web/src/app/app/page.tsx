import { PlugZap, Users, ListTodo, Database, TrendingUp, ArrowUpRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project');

export default async function DashboardPage() {
  let counts = { connections: 1, accounts: 3, jobs: 5, posts: 247 };

  if (!DEMO_MODE) {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const [connections, accounts, jobs, posts] = await Promise.all([
      supabase.from('connections_x').select('id', { count: 'exact', head: true }),
      supabase.from('tracked_accounts').select('id', { count: 'exact', head: true }),
      supabase.from('fetch_jobs').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
    ]);
    counts = {
      connections: connections.count ?? 0,
      accounts: accounts.count ?? 0,
      jobs: jobs.count ?? 0,
      posts: posts.count ?? 0,
    };
  }

  const stats = [
    { label: 'API接続', value: counts.connections, icon: PlugZap, href: '/app/connections/x', color: '#1a73e8', delta: '有効' },
    { label: '追跡アカウント', value: counts.accounts, icon: Users, href: '/app/accounts', color: '#34a853', delta: '+2 今月' },
    { label: '収集ジョブ', value: counts.jobs, icon: ListTodo, href: '/app/jobs', color: '#fbbc04', delta: '3 完了' },
    { label: '取得済み投稿', value: counts.posts, icon: Database, href: '/app/data/posts', color: '#ea4335', delta: '+90 今週' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-normal text-[#202124]">概要</h1>
        <p className="text-[12px] text-[#5f6368] mt-0.5">
          全アカウント &middot; 過去28日間
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <div className="bg-white rounded-lg border border-[#dadce0] p-4 hover:shadow-md hover:border-[#1a73e8]/30 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: s.color + '14' }}>
                    <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  </div>
                  <span className="text-[12px] font-medium text-[#5f6368]">{s.label}</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#dadce0] group-hover:text-[#1a73e8] transition-colors" />
              </div>
              <div className="text-[28px] font-normal text-[#202124] leading-none mb-1">
                {s.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#34a853] flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {s.delta}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg border border-[#dadce0] p-5">
        <h2 className="text-[14px] font-medium text-[#202124] mb-4">クイックアクション</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/app/accounts" className="flex items-center gap-3 p-3 rounded-lg border border-[#dadce0] hover:bg-[#f8f9fa] hover:border-[#1a73e8]/30 transition-all text-[13px] text-[#3c4043]">
            <Users className="h-5 w-5 text-[#1a73e8]" />
            <div>
              <div className="font-medium">アカウントを追加</div>
              <div className="text-[11px] text-[#5f6368]">新しいXアカウントを追跡</div>
            </div>
          </Link>
          <Link href="/app/jobs" className="flex items-center gap-3 p-3 rounded-lg border border-[#dadce0] hover:bg-[#f8f9fa] hover:border-[#1a73e8]/30 transition-all text-[13px] text-[#3c4043]">
            <ListTodo className="h-5 w-5 text-[#34a853]" />
            <div>
              <div className="font-medium">データを収集</div>
              <div className="text-[11px] text-[#5f6368]">収集ジョブを作成・実行</div>
            </div>
          </Link>
          <Link href="/app/analytics" className="flex items-center gap-3 p-3 rounded-lg border border-[#dadce0] hover:bg-[#f8f9fa] hover:border-[#1a73e8]/30 transition-all text-[13px] text-[#3c4043]">
            <BarChart3 className="h-5 w-5 text-[#9334e6]" />
            <div>
              <div className="font-medium">レポートを見る</div>
              <div className="text-[11px] text-[#5f6368]">ER・HIT分析・テーマ分類</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
