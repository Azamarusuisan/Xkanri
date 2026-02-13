'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PeriodSelector, getPeriodDates, type PeriodKey } from '@/components/period-selector';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Sparkles, TrendingUp, MessageCircle, Repeat2, Quote } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

interface WinningPattern {
  key: string;
  theme: string;
  appeal_frame: string;
  media_type: string;
  day_of_week: string;
  hour_bucket: string;
  count: number;
  avg_er: number;
  avg_virality_ratio: number;
  avg_conversation_ratio: number;
  avg_quote_ratio: number;
  example_texts: string[];
}

interface CreativeData {
  total_posts: number;
  summary: {
    avg_er: number;
    avg_virality_ratio: number;
    avg_conversation_ratio: number;
    avg_quote_ratio: number;
  };
  appeal_frame_distribution: Record<string, number>;
  winning_patterns: WinningPattern[];
}

interface TrackedAccount {
  id: string;
  username: string;
}

const APPEAL_FRAME_LABELS: Record<string, string> = {
  benefit: 'ベネフィット', emotional: 'エモーショナル', scarcity: '希少性',
  social_proof: '社会的証明', question: '問いかけ', news: 'ニュース',
  humor: 'ユーモア', other: 'その他',
};

const DAY_LABELS: Record<string, string> = {
  Sun: '日', Mon: '月', Tue: '火', Wed: '水', Thu: '木', Fri: '金', Sat: '土',
};

const HOUR_LABELS: Record<string, string> = {
  deep_night: '深夜', early_morning: '早朝', morning: '午前',
  noon: '昼', afternoon: '午後', evening: '夕方', night: '夜',
};

const MEDIA_LABELS: Record<string, string> = {
  none: 'テキスト', photo: '画像', video: '動画', animated_gif: 'GIF', mixed: '複合',
};

const THEME_LABELS: Record<string, string> = {
  campaign: 'キャンペーン', event: 'イベント', new_product: '新製品',
  brand: 'ブランド', collab: 'コラボ', product: '製品', other: 'その他',
};

const APPEAL_COLORS: Record<string, string> = {
  benefit: '#34a853', emotional: '#ea4335', scarcity: '#fbbc04',
  social_proof: '#9334e6', question: '#1a73e8', news: '#e8710a',
  humor: '#5f6368', other: '#dadce0',
};

export default function CreativeAnalyticsPage() {
  const [data, setData] = useState<CreativeData | null>(null);
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('4weeks');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { dateFrom, dateTo } = getPeriodDates(period);
    try {
      const params = new URLSearchParams();
      params.set('date_from', dateFrom);
      params.set('date_to', dateTo);
      if (accountId) params.set('account_id', accountId);
      const res = await fetch(`/api/analytics/creative?${params}`);
      const d = await res.json();
      setData(d);
    } catch { toast.error('クリエイティブ分析データの取得に失敗しました'); }
    finally { setLoading(false); }
  }, [accountId, period]);

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
        <h1 className="text-[20px] font-normal text-[#202124] mb-6">クリエイティブ分析</h1>
        <div className="bg-white rounded-lg border border-[#dadce0] flex flex-col items-center justify-center py-16">
          <Sparkles className="h-10 w-10 text-[#dadce0] mb-3" />
          <p className="text-[13px] text-[#5f6368]">分析するデータがありません</p>
          <p className="text-[12px] text-[#9aa0a6] mt-1">先に投稿データを収集してください</p>
        </div>
      </div>
    );
  }

  const appealData = Object.entries(data.appeal_frame_distribution)
    .map(([key, value]) => ({ name: APPEAL_FRAME_LABELS[key] || key, value, fill: APPEAL_COLORS[key] || '#5f6368' }))
    .sort((a, b) => b.value - a.value);

  const radarData = data.winning_patterns.length > 0
    ? [
        { metric: '拡散率', value: Math.round(data.winning_patterns[0].avg_virality_ratio * 1000) / 1000, all: Math.round(data.summary.avg_virality_ratio * 1000) / 1000 },
        { metric: '会話率', value: Math.round(data.winning_patterns[0].avg_conversation_ratio * 1000) / 1000, all: Math.round(data.summary.avg_conversation_ratio * 1000) / 1000 },
        { metric: '引用率', value: Math.round(data.winning_patterns[0].avg_quote_ratio * 1000) / 1000, all: Math.round(data.summary.avg_quote_ratio * 1000) / 1000 },
      ]
    : [];

  return (
    <div>
      <h1 className="text-[20px] font-normal text-[#202124] mb-1">クリエイティブ分析</h1>
      <p className="text-[12px] text-[#5f6368] mb-6">バズパターン抽出・訴求フレーム分類・勝ちパターンTOP10</p>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <PeriodSelector value={period} onChange={setPeriod} />
        <div className="w-40">
          <Select value={accountId} onValueChange={(v) => setAccountId(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 border-[#dadce0] text-[12px]"><SelectValue placeholder="全アカウント" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全アカウント</SelectItem>
              {accounts.map((a) => (<SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '平均ER', value: `${(data.summary.avg_er * 100).toFixed(2)}%`, icon: TrendingUp, color: '#1a73e8', sub: null },
          { label: '拡散率', value: data.summary.avg_virality_ratio.toFixed(3), icon: Repeat2, color: '#34a853', sub: 'RT / いいね' },
          { label: '会話率', value: data.summary.avg_conversation_ratio.toFixed(3), icon: MessageCircle, color: '#fbbc04', sub: '返信 / いいね' },
          { label: '引用率', value: data.summary.avg_quote_ratio.toFixed(3), icon: Quote, color: '#9334e6', sub: '引用 / いいね' },
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
        {/* Appeal Frame Distribution */}
        <div className="bg-white rounded-lg border border-[#dadce0]">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">訴求フレーム分布</span>
          </div>
          <div className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appealData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                  <XAxis type="number" fontSize={10} tick={{ fill: '#5f6368' }} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={12} tick={{ fill: '#3c4043' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }} />
                  <Bar dataKey="value" name="投稿数" radius={[0, 2, 2, 0]}>
                    {appealData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Reaction Breakdown Radar */}
        <div className="bg-white rounded-lg border border-[#dadce0]">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">リアクション内訳（TOP1 vs 全体）</span>
          </div>
          <div className="p-5">
            <div className="h-56">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#f1f3f4" />
                    <PolarAngleAxis dataKey="metric" fontSize={12} tick={{ fill: '#3c4043' }} />
                    <PolarRadiusAxis fontSize={10} tick={{ fill: '#5f6368' }} />
                    <Radar name="TOP1パターン" dataKey="value" stroke="#1a73e8" fill="#1a73e8" fillOpacity={0.3} />
                    <Radar name="全体平均" dataKey="all" stroke="#dadce0" fill="#dadce0" fillOpacity={0.2} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[12px] text-[#5f6368]">データなし</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Winning Patterns TOP10 */}
      {data.winning_patterns.length > 0 && (
        <div className="bg-white rounded-lg border border-[#dadce0] mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">勝ちパターン TOP10</span>
            <span className="text-[11px] text-[#5f6368] ml-2">テーマ × 訴求 × メディア × 曜日 × 時間帯 の組合せ</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">#</TableHead>
                <TableHead>テーマ</TableHead>
                <TableHead>訴求</TableHead>
                <TableHead>メディア</TableHead>
                <TableHead>曜日</TableHead>
                <TableHead>時間帯</TableHead>
                <TableHead className="text-right">投稿数</TableHead>
                <TableHead className="text-right">平均ER</TableHead>
                <TableHead className="text-right">拡散率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.winning_patterns.map((pattern, i) => (
                <TableRow key={pattern.key} className="hover:bg-[#f8f9fa]">
                  <TableCell className="text-[12px] font-medium text-[#5f6368]">{i + 1}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#e8f0fe] text-[#1a73e8]">
                      {THEME_LABELS[pattern.theme] || pattern.theme}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]" style={{
                      backgroundColor: (APPEAL_COLORS[pattern.appeal_frame] || '#5f6368') + '14',
                      color: APPEAL_COLORS[pattern.appeal_frame] || '#5f6368',
                    }}>
                      {APPEAL_FRAME_LABELS[pattern.appeal_frame] || pattern.appeal_frame}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#f1f3f4] text-[#5f6368]">
                      {MEDIA_LABELS[pattern.media_type] || pattern.media_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] text-[#3c4043]">
                    {DAY_LABELS[pattern.day_of_week] || pattern.day_of_week}
                  </TableCell>
                  <TableCell className="text-[12px] text-[#3c4043]">
                    {HOUR_LABELS[pattern.hour_bucket] || pattern.hour_bucket}
                  </TableCell>
                  <TableCell className="text-right text-[12px] text-[#3c4043] font-mono">{pattern.count}</TableCell>
                  <TableCell className="text-right font-mono text-[12px] text-[#202124]">
                    {(pattern.avg_er * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-[12px] text-[#3c4043]">
                    {pattern.avg_virality_ratio.toFixed(3)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Template Suggestions */}
      {data.winning_patterns.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[14px] font-medium text-[#202124] mb-3">テンプレート提案</h2>
          <p className="text-[11px] text-[#5f6368] mb-4">上位パターンに該当する投稿テキストの例</p>
          {data.winning_patterns.slice(0, 3).map((pattern, i) => (
            <div key={pattern.key} className="bg-white rounded-lg border border-[#dadce0] p-5 mb-3">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[12px] font-medium text-[#1a73e8]">#{i + 1}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#e8f0fe] text-[#1a73e8]">
                  {THEME_LABELS[pattern.theme] || pattern.theme}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]" style={{
                  backgroundColor: (APPEAL_COLORS[pattern.appeal_frame] || '#5f6368') + '14',
                  color: APPEAL_COLORS[pattern.appeal_frame] || '#5f6368',
                }}>
                  {APPEAL_FRAME_LABELS[pattern.appeal_frame] || pattern.appeal_frame}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#f1f3f4] text-[#5f6368]">
                  {MEDIA_LABELS[pattern.media_type] || pattern.media_type}
                </span>
                <span className="text-[11px] text-[#5f6368]">
                  {DAY_LABELS[pattern.day_of_week]}曜 {HOUR_LABELS[pattern.hour_bucket]}
                </span>
                <span className="text-[11px] text-[#9aa0a6] ml-auto">
                  ER {(pattern.avg_er * 100).toFixed(2)}%
                </span>
              </div>
              {pattern.example_texts.map((text, j) => (
                <div key={j} className="border-l-2 border-[#1a73e8] pl-3 py-2 mb-2 text-[12px] text-[#3c4043] bg-[#f8f9fa] rounded-r">
                  {text}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
