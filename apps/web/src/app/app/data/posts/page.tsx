'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, Download, Loader2, Database, ChevronLeft, ChevronRight } from 'lucide-react';

interface Post {
  id: string;
  post_x_id: string;
  text: string | null;
  posted_at: string;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  quotes_count: number;
  impressions_count: number;
  media_type: string;
  hashtags: string[];
  theme: string | null;
  is_hit: boolean;
  tracked_accounts: { username: string; display_name: string | null };
}

interface TrackedAccount {
  id: string;
  username: string;
}

const MEDIA_TYPES = [
  { value: '', label: 'すべて' },
  { value: 'none', label: 'テキストのみ' },
  { value: 'photo', label: '画像' },
  { value: 'video', label: '動画' },
  { value: 'animated_gif', label: 'GIF' },
  { value: 'mixed', label: '複合' },
];

const THEMES = [
  { value: '', label: 'すべて' },
  { value: 'campaign', label: 'キャンペーン' },
  { value: 'event', label: 'イベント' },
  { value: 'new_product', label: '新製品' },
  { value: 'brand', label: 'ブランド' },
  { value: 'collab', label: 'コラボ' },
  { value: 'product', label: '製品' },
  { value: 'other', label: 'その他' },
];

const THEME_LABELS: Record<string, string> = {
  campaign: 'キャンペーン', event: 'イベント', new_product: '新製品',
  brand: 'ブランド', collab: 'コラボ', product: '製品', other: 'その他',
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [isHit, setIsHit] = useState('');
  const [accountId, setAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [theme, setTheme] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (search) params.set('search', search);
      if (mediaType) params.set('media_type', mediaType);
      if (isHit) params.set('is_hit', isHit);
      if (accountId) params.set('account_id', accountId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (theme) params.set('theme', theme);
      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch { toast.error('投稿データの取得に失敗しました'); }
    finally { setLoading(false); }
  }, [page, search, mediaType, isHit, accountId, dateFrom, dateTo, theme]);

  useEffect(() => {
    fetch('/api/accounts').then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (accountId) params.set('account_id', accountId);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    window.open(`/api/posts/export?${params}`, '_blank');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-normal text-[#202124]">投稿データ</h1>
          <p className="text-[12px] text-[#5f6368] mt-0.5">
            収集した投稿データの検索・フィルタ・エクスポート（{total.toLocaleString()} 件）
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className="h-8 text-[12px] px-4 border-[#dadce0] text-[#3c4043] hover:bg-[#f1f3f4]">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#dadce0] p-4 mb-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] text-[#5f6368] mb-1 block">本文検索</label>
            <div className="flex gap-2">
              <Input placeholder="キーワード..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 border-[#dadce0] placeholder:text-[#9aa0a6]" />
              <Button type="submit" size="icon" variant="outline" className="h-8 w-8 border-[#dadce0] shrink-0">
                <Search className="h-3.5 w-3.5 text-[#5f6368]" />
              </Button>
            </div>
          </div>
          <div className="w-36">
            <label className="text-[11px] text-[#5f6368] mb-1 block">アカウント</label>
            <Select value={accountId} onValueChange={(v) => { setAccountId(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 border-[#dadce0] text-[12px]"><SelectValue placeholder="すべて" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {accounts.map((a) => (<SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <label className="text-[11px] text-[#5f6368] mb-1 block">メディア</label>
            <Select value={mediaType} onValueChange={(v) => { setMediaType(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 border-[#dadce0] text-[12px]"><SelectValue placeholder="すべて" /></SelectTrigger>
              <SelectContent>
                {MEDIA_TYPES.map((m) => (<SelectItem key={m.value || 'all'} value={m.value || 'all'}>{m.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <label className="text-[11px] text-[#5f6368] mb-1 block">テーマ</label>
            <Select value={theme} onValueChange={(v) => { setTheme(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 border-[#dadce0] text-[12px]"><SelectValue placeholder="すべて" /></SelectTrigger>
              <SelectContent>
                {THEMES.map((t) => (<SelectItem key={t.value || 'all'} value={t.value || 'all'}>{t.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <label className="text-[11px] text-[#5f6368] mb-1 block">HIT</label>
            <Select value={isHit} onValueChange={(v) => { setIsHit(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 border-[#dadce0] text-[12px]"><SelectValue placeholder="すべて" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="true">HIT</SelectItem>
                <SelectItem value="false">通常</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <label className="text-[11px] text-[#5f6368] mb-1 block">開始日</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-8 border-[#dadce0]" />
          </div>
          <div className="w-32">
            <label className="text-[11px] text-[#5f6368] mb-1 block">終了日</label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-8 border-[#dadce0]" />
          </div>
        </form>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-[#1a73e8]" /></div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#dadce0] flex flex-col items-center justify-center py-16">
          <Database className="h-10 w-10 text-[#dadce0] mb-3" />
          <p className="text-[13px] text-[#5f6368]">投稿データがありません</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-[#dadce0] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-24">アカウント</TableHead>
                  <TableHead>本文</TableHead>
                  <TableHead className="w-20">日時</TableHead>
                  <TableHead className="w-14 text-right">いいね</TableHead>
                  <TableHead className="w-14 text-right">RT</TableHead>
                  <TableHead className="w-14 text-right">返信</TableHead>
                  <TableHead className="w-16">メディア</TableHead>
                  <TableHead className="w-20">テーマ</TableHead>
                  <TableHead className="w-12">HIT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id} className="hover:bg-[#f8f9fa]">
                    <TableCell className="text-[12px] font-medium text-[#1a73e8]">
                      @{post.tracked_accounts.username}
                    </TableCell>
                    <TableCell className="text-[12px] text-[#3c4043] max-w-[300px]">
                      <p className="line-clamp-2">{post.text || '-'}</p>
                      {post.hashtags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {post.hashtags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] text-[#1a73e8]">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] text-[#5f6368]">
                      {new Date(post.posted_at).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell className="text-right text-[12px] text-[#3c4043] font-mono">
                      {post.likes_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-[12px] text-[#3c4043] font-mono">
                      {post.reposts_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-[12px] text-[#3c4043] font-mono">
                      {post.replies_count.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {post.media_type !== 'none' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#f1f3f4] text-[#5f6368]">
                          {post.media_type}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#e8f0fe] text-[#1a73e8]">
                        {THEME_LABELS[post.theme || 'other'] || 'その他'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {post.is_hit && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#fef7e0] text-[#b05a00] border border-[#fbbc04]">
                          HIT
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-[12px] text-[#5f6368]">
              {total.toLocaleString()} 件中 {((page - 1) * 50 + 1).toLocaleString()} - {Math.min(page * 50, total).toLocaleString()} 件
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#f1f3f4] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-[#5f6368]" />
              </button>
              <span className="text-[12px] text-[#3c4043] px-3">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#f1f3f4] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-[#5f6368]" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
