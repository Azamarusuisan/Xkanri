'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, BarChart3, TrendingUp, Image, Zap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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

const PIE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];

const THEME_LABELS: Record<string, string> = {
  campaign: 'キャンペーン',
  event: 'イベント',
  new_product: '新製品',
  brand: 'ブランド',
  collab: 'コラボ',
  product: '製品',
  other: 'その他',
};

const MEDIA_LABELS: Record<string, string> = {
  none: 'テキストのみ',
  photo: '画像',
  video: '動画',
  animated_gif: 'GIF',
  mixed: '複合',
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
    } catch {
      toast.error('分析データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [accountId, dateFrom, dateTo]);

  useEffect(() => {
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.total_posts === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">分析</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">分析するデータがありません</p>
            <p className="text-sm text-muted-foreground">先に投稿データを収集してください</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mediaData = Object.entries(data.media_ratio).map(([key, value]) => ({
    name: MEDIA_LABELS[key] || key,
    value,
  }));

  const themeData = Object.entries(data.theme_distribution).map(([key, value]) => ({
    name: THEME_LABELS[key] || key,
    value,
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">分析</h2>
      <p className="text-sm text-muted-foreground mb-6">
        投稿頻度・メディア比率・ER・当たり判定・テーマ分類
      </p>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="w-40">
          <Select value={accountId} onValueChange={(v) => setAccountId(v === 'all' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="全アカウント" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全アカウント</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="date"
          className="w-36"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          type="date"
          className="w-36"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> 投稿数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.total_posts.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> 平均ER
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(data.er_stats.avg * 100).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">p75: {(data.er_stats.p75 * 100).toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" /> HIT投稿
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.hits.length}</div>
            <p className="text-xs text-muted-foreground">ER上位25%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Image className="h-4 w-4" /> フォロワー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.followers_count.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Weekly Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">投稿頻度（週次）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.frequency.weekly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" fontSize={10} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="投稿数" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Media Ratio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">メディア比率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mediaData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(props: any) => `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {mediaData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Theme Distribution */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">テーマ分類</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={themeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" name="投稿数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hit Posts Table */}
      {data.hits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">HIT投稿 TOP20</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>本文</TableHead>
                  <TableHead className="w-20">日時</TableHead>
                  <TableHead className="w-20 text-right">ER</TableHead>
                  <TableHead className="w-16 text-right">♡</TableHead>
                  <TableHead className="w-16 text-right">RT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.hits.map((hit) => (
                  <TableRow key={hit.id}>
                    <TableCell className="text-sm max-w-[400px]">
                      <p className="line-clamp-2">{hit.text || '-'}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(hit.posted_at).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {(hit.er * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {hit.likes_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {hit.reposts_count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
