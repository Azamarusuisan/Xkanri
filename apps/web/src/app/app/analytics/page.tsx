'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, BarChart3, TrendingUp, Image, Zap } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface AnalyticsData {
  total_posts: number;
  followers_count: number;
  frequency: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
  };
  media_ratio: Record<string, number>;
  er_stats: { avg: number; p75: number; max: number };
  hits: Array<{
    id: string;
    post_x_id: string;
    text: string;
    posted_at: string;
    er: number;
    likes_count: number;
    reposts_count: number;
  }>;
  theme_distribution: Record<string, number>;
}

interface TrackedAccount {
  id: string;
  username: string;
}

const PIE_COLORS = ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#9334e6', '#e8710a', '#5f6368'];

const THEME_LABELS: Record<string, string> = {
  campaign: 'キャンペーン', event: 'イベント', new_product: '新製品',
  brand: 'ブランド', collab: 'コラボ', product: '製品', other: 'その他',
};

const MEDIA_LABELS: Record<string, string> = {
  none: 'テキストのみ', photo: '画像', video: '動画', animated_gif: 'GIF', mixed: '複合',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (accountId) params.set('account_id', accountId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const res = await fetch(`/api/analytics?${params}`);
      const d = await res.json();
      setData(d);
    } catch { toast.error('分析データの取得に失敗しました'); }
    finally { setLoading(false); }
  }, [accountId, dateFrom, dateTo]);

  useEffect(() => {
    fetch('/api/accounts').then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-[#1a73e8]" /></div>;
  }

  if (!data || data.total_posts === 0) {
    return (
      <div>
        <h1 className="text-[20px] font-normal text-[#202124] mb-6">パフォーマンス</h1>
        <div className="bg-white rounded-lg border border-[#dadce0] flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-10 w-10 text-[#dadce0] mb-3" />
          <p className="text-[13px] text-[#5f6368]">分析するデータがありません</p>
          <p className="text-[12px] text-[#9aa0a6] mt-1">先に投稿データを収集してください</p>
        </div>
      </div>
    );
  }

  const mediaData = Object.entries(data.media_ratio).map(([key, value]) => ({
    name: MEDIA_LABELS[key] || key, value,
  }));
  const themeData = Object.entries(data.theme_distribution).map(([key, value]) => ({
    name: THEME_LABELS[key] || key, value,
  }));

  return (
    <div>
      <h1 className="text-[20px] font-normal text-[#202124] mb-1">パフォーマンス</h1>
      <p className="text-[12px] text-[#5f6368] mb-6">投稿頻度・メディア比率・ER・当たり判定・テーマ分類</p>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="w-40">
          <Select value={accountId} onValueChange={(v) => setAccountId(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 border-[#dadce0] text-[12px]"><SelectValue placeholder="全アカウント" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全アカウント</SelectItem>
              {accounts.map((a) => (<SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Input type="date" className="w-32 h-8 border-[#dadce0]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" className="w-32 h-8 border-[#dadce0]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '投稿数', value: data.total_posts.toLocaleString(), icon: BarChart3, color: '#1a73e8', sub: null },
          { label: '平均ER', value: `${(data.er_stats.avg * 100).toFixed(2)}%`, icon: TrendingUp, color: '#34a853', sub: `p75: ${(data.er_stats.p75 * 100).toFixed(2)}%` },
          { label: 'HIT投稿', value: String(data.hits.length), icon: Zap, color: '#fbbc04', sub: 'ER上位25%' },
          { label: 'フォロワー', value: data.followers_count.toLocaleString(), icon: Image, color: '#ea4335', sub: null },
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

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Weekly Frequency */}
        <div className="bg-white rounded-lg border border-[#dadce0]">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">投稿頻度（週次）</span>
          </div>
          <div className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.frequency.weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                  <XAxis dataKey="week" fontSize={10} tick={{ fill: '#5f6368' }} />
                  <YAxis fontSize={10} tick={{ fill: '#5f6368' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }} />
                  <Bar dataKey="count" fill="#1a73e8" name="投稿数" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Media Ratio */}
        <div className="bg-white rounded-lg border border-[#dadce0]">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">メディア比率</span>
          </div>
          <div className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mediaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={(props: any) => `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#dadce0' }}
                  >
                    {mediaData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Distribution */}
      <div className="bg-white rounded-lg border border-[#dadce0] mb-6">
        <div className="px-5 py-4 border-b border-[#f1f3f4]">
          <span className="text-[13px] font-medium text-[#202124]">テーマ分類</span>
        </div>
        <div className="p-5">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={themeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                <XAxis type="number" fontSize={10} tick={{ fill: '#5f6368' }} />
                <YAxis type="category" dataKey="name" width={100} fontSize={12} tick={{ fill: '#3c4043' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }} />
                <Bar dataKey="value" fill="#9334e6" name="投稿数" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hit Posts Table */}
      {data.hits.length > 0 && (
        <div className="bg-white rounded-lg border border-[#dadce0] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">HIT投稿 TOP20</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>本文</TableHead>
                <TableHead className="w-20">日時</TableHead>
                <TableHead className="w-20 text-right">ER</TableHead>
                <TableHead className="w-16 text-right">いいね</TableHead>
                <TableHead className="w-16 text-right">RT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.hits.map((hit) => (
                <TableRow key={hit.id} className="hover:bg-[#f8f9fa]">
                  <TableCell className="text-[12px] text-[#3c4043] max-w-[400px]">
                    <p className="line-clamp-2">{hit.text || '-'}</p>
                  </TableCell>
                  <TableCell className="text-[11px] text-[#5f6368]">
                    {new Date(hit.posted_at).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[12px] text-[#202124]">
                    {(hit.er * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right text-[12px] text-[#3c4043] font-mono">
                    {hit.likes_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[12px] text-[#3c4043] font-mono">
                    {hit.reposts_count.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
