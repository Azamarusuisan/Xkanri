'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Users } from 'lucide-react';

interface TrackedAccount {
  id: string;
  x_user_id: string;
  username: string;
  display_name: string | null;
  is_competitor: boolean;
  tags: string[];
  memo: string | null;
  followers_count: number | null;
  created_at: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    is_competitor: false,
    tags: '',
    memo: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {
      toast.error('アカウント一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          is_competitor: form.is_competitor,
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          memo: form.memo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`@${data.account.username} を追加しました`);
      setDialogOpen(false);
      setForm({ username: '', is_competitor: false, tags: '', memo: '' });
      fetchAccounts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`@${username} を削除しますか？関連する投稿データも削除されます。`)) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      toast.success(`@${username} を削除しました`);
      fetchAccounts();
    } catch {
      toast.error('削除に失敗しました');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">追跡アカウント</h2>
          <p className="text-sm text-muted-foreground">
            データ収集対象のXアカウントを管理
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              アカウント追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>追跡アカウントを追加</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>ユーザー名（handle）</Label>
                <Input
                  placeholder="@username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_competitor"
                  checked={form.is_competitor}
                  onChange={(e) => setForm({ ...form, is_competitor: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_competitor">競合アカウント</Label>
              </div>
              <div className="space-y-2">
                <Label>タグ（カンマ区切り）</Label>
                <Input
                  placeholder="業界, ジャンルなど"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>メモ</Label>
                <Textarea
                  placeholder="備考..."
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={adding} className="w-full">
                {adding ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 追加中...</>
                ) : (
                  '追加'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">追跡アカウントがありません</p>
            <p className="text-sm text-muted-foreground">
              「アカウント追加」からXアカウントを登録してください
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>アカウント</TableHead>
                <TableHead>フォロワー</TableHead>
                <TableHead>タグ</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>メモ</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">@{a.username}</span>
                      {a.display_name && (
                        <span className="text-sm text-muted-foreground ml-2">
                          {a.display_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.followers_count?.toLocaleString() ?? '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {a.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.is_competitor && (
                      <Badge variant="destructive" className="text-xs">競合</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {a.memo || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(a.id, a.username)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
