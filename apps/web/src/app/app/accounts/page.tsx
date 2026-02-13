'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
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
  const [form, setForm] = useState({ username: '', is_competitor: false, tags: '', memo: '' });

  useEffect(() => { fetchAccounts(); }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch { toast.error('アカウント一覧の取得に失敗しました'); }
    finally { setLoading(false); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    } finally { setAdding(false); }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`@${username} を削除しますか？関連する投稿データも削除されます。`)) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      toast.success(`@${username} を削除しました`);
      fetchAccounts();
    } catch { toast.error('削除に失敗しました'); }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-[#1a73e8]" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] font-normal text-[#202124]">追跡アカウント</h1>
          <p className="text-[12px] text-[#5f6368] mt-0.5">データ収集対象のXアカウントを管理</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-[12px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              アカウント追加
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="text-[16px] font-medium text-[#202124]">追跡アカウントを追加</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#5f6368]">ユーザー名（handle）</Label>
                <Input placeholder="@username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className="h-9 border-[#dadce0] placeholder:text-[#9aa0a6]" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_competitor" checked={form.is_competitor} onChange={(e) => setForm({ ...form, is_competitor: e.target.checked })} className="rounded border-[#dadce0]" />
                <Label htmlFor="is_competitor" className="text-[12px] text-[#3c4043]">競合アカウント</Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#5f6368]">タグ（カンマ区切り）</Label>
                <Input placeholder="業界, ジャンルなど" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="h-9 border-[#dadce0] placeholder:text-[#9aa0a6]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#5f6368]">メモ</Label>
                <Textarea placeholder="備考..." value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} className="border-[#dadce0] placeholder:text-[#9aa0a6] min-h-[72px]" />
              </div>
              <Button type="submit" disabled={adding} className="w-full h-9 bg-[#1a73e8] hover:bg-[#1557b0] text-[12px]">
                {adding ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> 追加中...</> : '追加'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#dadce0] flex flex-col items-center justify-center py-16">
          <Users className="h-10 w-10 text-[#dadce0] mb-3" />
          <p className="text-[13px] text-[#5f6368]">追跡アカウントがありません</p>
          <p className="text-[12px] text-[#9aa0a6] mt-1">「アカウント追加」からXアカウントを登録してください</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#dadce0] overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>アカウント</TableHead>
                <TableHead>フォロワー</TableHead>
                <TableHead>タグ</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>メモ</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id} className="hover:bg-[#f8f9fa]">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#e8f0fe] flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-medium text-[#1a73e8]">{a.username[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-[#202124]">@{a.username}</span>
                        {a.display_name && <span className="text-[12px] text-[#5f6368] ml-2">{a.display_name}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-[#3c4043]">
                    {a.followers_count?.toLocaleString() ?? '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {a.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-[#f1f3f4] text-[#3c4043]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.is_competitor && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fce8e6] text-[#c5221f]">
                        競合
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] text-[#5f6368] max-w-[200px] truncate">
                    {a.memo || '-'}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => handleDelete(a.id, a.username)} className="p-1.5 rounded hover:bg-[#fce8e6] transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-[#5f6368] hover:text-[#c5221f]" />
                    </button>
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
