'use client';

import { useState, useEffect, useCallback } from 'react';
import { PeriodSelector, getPeriodDates, type PeriodKey } from '@/components/period-selector';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, DollarSign, MousePointerClick, Target, TrendingUp, Megaphone } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface AdsAnalyticsData {
  total_creatives: number;
  summary: {
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_engagements: number;
    total_conversions: number;
    cpc: number;
    cpe: number;
    ctr: number;
  };
  daily_stats: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    engagements: number;
  }>;
  organic_vs_paid: Array<{
    creative_id: string;
    creative_name: string;
    paid_er: number;
    organic_er: number;
    spend: number;
    impressions: number;
    clicks: number;
    engagements: number;
  }>;
}

export default function AdsAnalyticsPage() {
  const [data, setData] = useState<AdsAnalyticsData | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('4weeks');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { dateFrom, dateTo } = getPeriodDates(period);
    try {
      const params = new URLSearchParams();
      params.set('date_from', dateFrom);
      params.set('date_to', dateTo);
      const res = await fetch(`/api/ads/analytics?${params}`);
      const d = await res.json();
      setData(d);
    } catch { toast.error('広告データの取得に失敗しました'); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-[#1a73e8]" /></div>;
  }

  if (!data || data.total_creatives === 0) {
    return (
      <div>
        <h1 className="text-[20px] font-normal text-[#202124] mb-6">広告パフォーマンス</h1>
        <div className="bg-white rounded-lg border border-[#dadce0] flex flex-col items-center justify-center py-16">
          <Megaphone className="h-10 w-10 text-[#dadce0] mb-3" />
          <p className="text-[13px] text-[#5f6368]">広告データがありません</p>
          <p className="text-[12px] text-[#9aa0a6] mt-1">先に X Ads を接続してください</p>
        </div>
      </div>
    );
  }

  const dailyChartData = data.daily_stats.map(d => ({
    ...d,
    spend_k: Math.round(d.spend / 1000),
  }));

  return (
    <div>
      <h1 className="text-[20px] font-normal text-[#202124] mb-1">広告パフォーマンス</h1>
      <p className="text-[12px] text-[#5f6368] mb-6">X Ads クリエイティブの KPI と有機 vs 広告比較</p>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: '総支出', value: `¥${data.summary.total_spend.toLocaleString()}`, icon: DollarSign, color: '#ea4335', sub: null },
          { label: 'CPC', value: `¥${data.summary.cpc.toLocaleString()}`, icon: MousePointerClick, color: '#1a73e8', sub: 'Cost Per Click' },
          { label: 'CPE', value: `¥${data.summary.cpe.toLocaleString()}`, icon: Target, color: '#34a853', sub: 'Cost Per Engagement' },
          { label: 'CTR', value: `${(data.summary.ctr * 100).toFixed(2)}%`, icon: TrendingUp, color: '#fbbc04', sub: 'Click Through Rate' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-[#dadce0] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: s.color + '14' }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <span className="text-[12px] font-medium text-[#5f6368]">{s.label}</span>
            </div>
            <div className="text-[28px] font-normal text-[#202124] leading-none">{s.value}</div>
            {s.sub && <p className="text-[11px] text-[#5f6368] mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Additional summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { label: 'インプレッション', value: data.summary.total_impressions.toLocaleString() },
          { label: 'クリック', value: data.summary.total_clicks.toLocaleString() },
          { label: 'コンバージョン', value: data.summary.total_conversions.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-[#dadce0] p-3">
            <span className="text-[11px] text-[#5f6368]">{s.label}</span>
            <div className="text-[18px] font-normal text-[#202124] mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Daily Spend Chart */}
      {data.daily_stats.length > 0 && (
        <div className="bg-white rounded-lg border border-[#dadce0] mb-6">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">日別広告支出（千円）</span>
          </div>
          <div className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                  <XAxis dataKey="date" fontSize={10} tick={{ fill: '#5f6368' }} />
                  <YAxis fontSize={10} tick={{ fill: '#5f6368' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }}
                    formatter={(value: number | undefined) => [`¥${((value ?? 0) * 1000).toLocaleString()}`, '支出']}
                  />
                  <Bar dataKey="spend_k" fill="#ea4335" name="支出" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Organic vs Paid Comparison */}
      {data.organic_vs_paid.length > 0 && (
        <div className="bg-white rounded-lg border border-[#dadce0] overflow-x-auto">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">クリエイティブ別 有機 vs 広告</span>
          </div>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>クリエイティブ</TableHead>
                <TableHead className="text-right">広告ER</TableHead>
                <TableHead className="text-right">有機ER</TableHead>
                <TableHead className="text-right">改善率</TableHead>
                <TableHead className="text-right">支出</TableHead>
                <TableHead className="text-right">IMP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.organic_vs_paid.map((row) => {
                const improvement = row.organic_er > 0
                  ? ((row.paid_er - row.organic_er) / row.organic_er * 100)
                  : 0;
                return (
                  <TableRow key={row.creative_id} className="hover:bg-[#f8f9fa]">
                    <TableCell className="text-[12px] font-medium text-[#3c4043]">{row.creative_name}</TableCell>
                    <TableCell className="text-right font-mono text-[12px] text-[#202124]">
                      {(row.paid_er * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-[12px] text-[#5f6368]">
                      {(row.organic_er * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-[12px]">
                      <span className={improvement >= 0 ? 'text-[#137333]' : 'text-[#c5221f]'}>
                        {improvement >= 0 ? '+' : ''}{improvement.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-[12px] text-[#3c4043] font-mono">
                      ¥{row.spend.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-[12px] text-[#5f6368] font-mono">
                      {row.impressions.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
