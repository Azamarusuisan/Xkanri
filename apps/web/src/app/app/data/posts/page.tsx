'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
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
    } catch {
      toast.error('投稿データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [page, search, mediaType, isHit, accountId, dateFrom, dateTo, theme]);

  useEffect(() => {
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []));
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
          <h2 className="text-2xl font-bold">投稿データ</h2>
          <p className="text-sm text-muted-foreground">
            収集した投稿データの検索・フィルタ・エクスポート（{total.toLocaleString()} 件）
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">本文検索</label>
              <div className="flex gap-2">
                <Input
                  placeholder="キーワード..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button type="submit" size="icon" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground mb-1 block">アカウント</label>
              <Select value={accountId} onValueChange={(v) => { setAccountId(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="すべて" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <label className="text-xs text-muted-foreground mb-1 block">メディア</label>
              <Select value={mediaType} onValueChange={(v) => { setMediaType(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="すべて" /></SelectTrigger>
                <SelectContent>
                  {MEDIA_TYPES.map((m) => (
                    <SelectItem key={m.value || 'all'} value={m.value || 'all'}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <label className="text-xs text-muted-foreground mb-1 block">テーマ</label>
              <Select value={theme} onValueChange={(v) => { setTheme(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="すべて" /></SelectTrigger>
                <SelectContent>
                  {THEMES.map((t) => (
                    <SelectItem key={t.value || 'all'} value={t.value || 'all'}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground mb-1 block">当たり判定</label>
              <Select value={isHit} onValueChange={(v) => { setIsHit(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="すべて" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="true">HIT</SelectItem>
                  <SelectItem value="false">通常</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground mb-1 block">開始日</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground mb-1 block">終了日</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">投稿データがありません</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">アカウント</TableHead>
                  <TableHead>本文</TableHead>
                  <TableHead className="w-20">日時</TableHead>
                  <TableHead className="w-16 text-right">♡</TableHead>
                  <TableHead className="w-16 text-right">RT</TableHead>
                  <TableHead className="w-16 text-right">返信</TableHead>
                  <TableHead className="w-16">メディア</TableHead>
                  <TableHead className="w-20">テーマ</TableHead>
                  <TableHead className="w-16">HIT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="text-sm font-medium">
                      @{post.tracked_accounts.username}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px]">
                      <p className="line-clamp-2">{post.text || '-'}</p>
                      {post.hashtags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {post.hashtags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(post.posted_at).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {post.likes_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {post.reposts_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {post.replies_count.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {post.media_type !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          {post.media_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {post.theme || 'other'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {post.is_hit && (
                        <Badge className="text-xs bg-yellow-500">HIT</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {total} 件中 {(page - 1) * 50 + 1} - {Math.min(page * 50, total)} 件
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm flex items-center px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
