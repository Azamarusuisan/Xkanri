'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlugZap, Users, ListTodo, Database, TrendingUp, ArrowUpRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { PeriodSelector, getPeriodDates, type PeriodKey } from '@/components/period-selector';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  '4weeks': '過去4週間',
  '3months': '過去3ヶ月',
  '1year': '過去1年間',
};

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('4weeks');
  const [counts, setCounts] = useState({ posts: 0, hits: 0, accounts: 3, jobs: 4 });

  const fetchCounts = useCallback(async () => {
    const { dateFrom, dateTo } = getPeriodDates(period);
    try {
      const [postsRes, analyticsRes] = await Promise.all([
        fetch(`/api/posts?limit=1&date_from=${dateFrom}&date_to=${dateTo}`),
        fetch(`/api/analytics?date_from=${dateFrom}&date_to=${dateTo}`),
      ]);
      const postsData = await postsRes.json();
      const analyticsData = await analyticsRes.json();
      setCounts({
        posts: postsData.total || 0,
        hits: analyticsData.hits?.length || 0,
        accounts: 3,
        jobs: 4,
      });
    } catch {}
  }, [period]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const stats = [
    { label: 'API接続', value: 1, icon: PlugZap, href: '/app/connections/x', color: '#1a73e8', delta: '有効' },
    { label: '追跡アカウント', value: counts.accounts, icon: Users, href: '/app/accounts', color: '#34a853', delta: `${counts.accounts} 件登録中` },
    { label: '期間内投稿', value: counts.posts, icon: Database, href: '/app/data/posts', color: '#ea4335', delta: PERIOD_LABELS[period] },
    { label: 'HIT投稿', value: counts.hits, icon: TrendingUp, href: '/app/analytics', color: '#fbbc04', delta: 'ER上位25%' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] font-normal text-[#202124]">概要</h1>
          <p className="text-[12px] text-[#5f6368] mt-0.5">
            全アカウント &middot; {PERIOD_LABELS[period]}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
