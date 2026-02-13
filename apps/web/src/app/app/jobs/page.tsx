'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, ListTodo, AlertTriangle } from 'lucide-react';

interface TrackedAccount {
  id: string;
  username: string;
  display_name: string | null;
}

interface Job {
  id: string;
  tracked_account_id: string;
  status: string;
  mode: string;
  period_start: string | null;
  period_end: string | null;
  estimated_requests: number | null;
  actual_requests: number;
  posts_fetched: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  tracked_accounts: { username: string; display_name: string | null };
}

interface Estimate {
  account_id: string;
  username: string;
  estimated_tweets: number;
  estimated_requests: number;
  is_differential: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  queued: { label: '待機中', bg: '#f1f3f4', color: '#5f6368', border: '#dadce0' },
  running: { label: '実行中', bg: '#e8f0fe', color: '#1a73e8', border: '#4285f4' },
  completed: { label: '完了', bg: '#e6f4ea', color: '#137333', border: '#34a853' },
  failed: { label: '失敗', bg: '#fce8e6', color: '#c5221f', border: '#ea4335' },
  rate_limited: { label: 'レート制限', bg: '#fef7e0', color: '#b05a00', border: '#fbbc04' },
  cancelled: { label: 'キャンセル', bg: '#f1f3f4', color: '#5f6368', border: '#dadce0' },
};

const PERIODS = [
  { value: '4weeks', label: '直近4週間' },
  { value: '3months', label: '直近3ヶ月' },
  { value: '1year', label: '直近1年' },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('4weeks');
  const [estimates, setEstimates] = useState<Estimate[] | null>(null);
  const [totalRequests, setTotalRequests] = useState(0);
  const [estimating, setEstimating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  useEffect(() => { Promise.all([fetchJobs(), fetchAccounts()]); }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch { toast.error('ジョブ一覧の取得に失敗しました'); }
    finally { setLoading(false); }
  }

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {}
  }

  async function handleEstimate() {
    if (!selectedAccount) return;
    setEstimating(true);
    try {
      const res = await fetch('/api/jobs/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracked_account_ids: [selectedAccount], period: selectedPeriod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEstimates(data.estimates);
      setTotalRequests(data.total_requests);
      setStep('confirm');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally { setEstimating(false); }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracked_account_id: selectedAccount, period: selectedPeriod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('収集ジョブを作成しました');
      setDialogOpen(false);
      resetDialog();
      fetchJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally { setCreating(false); }
  }

  function resetDialog() {
    setStep('select');
    setSelectedAccount('');
    setSelectedPeriod('4weeks');
    setEstimates(null);
    setTotalRequests(0);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-[#1a73e8]" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-normal text-[#202124]">収集ジョブ</h1>
          <p className="text-[12px] text-[#5f6368] mt-0.5">投稿データの収集ジョブを管理</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
          <DialogTrigger asChild>
            <Button disabled={accounts.length === 0} className="h-9 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-[12px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              ジョブ作成
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="text-[16px] font-medium text-[#202124]">
                {step === 'select' ? '収集ジョブを作成' : '推定コストの確認'}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-[#5f6368]">
                {step === 'select' ? '対象アカウントと期間を選択してください' : '推定リクエスト数を確認してジョブを作成してください'}
              </DialogDescription>
            </DialogHeader>

            {step === 'select' ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[12px] text-[#5f6368]">対象アカウント</label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="h-9 border-[#dadce0]"><SelectValue placeholder="アカウントを選択" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] text-[#5f6368]">期間</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="h-9 border-[#dadce0]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleEstimate} disabled={!selectedAccount || estimating} className="w-full h-9 bg-[#1a73e8] hover:bg-[#1557b0] text-[12px]">
                  {estimating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> 推定中...</> : '推定コストを確認'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="rounded-lg bg-[#fef7e0] border border-[#fbbc04] p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-[#b05a00] mt-0.5 shrink-0" />
                    <div className="space-y-2 text-[12px]">
                      {estimates?.map((e) => (
                        <div key={e.account_id}>
                          <p className="font-medium text-[#202124]">@{e.username}</p>
                          <p className="text-[#5f6368]">
                            推定 {e.estimated_tweets} 件の投稿 / {e.estimated_requests} リクエスト
                            {e.is_differential && ' (差分取得)'}
                          </p>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-[#fbbc04]/30">
                        <p className="font-medium text-[#202124]">合計推定リクエスト数: {totalRequests}</p>
                        <p className="text-[#5f6368] text-[11px] mt-0.5">※ 実際のリクエスト数は投稿件数により変動します</p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('select')} className="h-9 text-[12px] border-[#dadce0] text-[#3c4043]">
                    戻る
                  </Button>
                  <Button onClick={handleCreate} disabled={creating} className="h-9 px-5 bg-[#1a73e8] hover:bg-[#1557b0] text-[12px]">
                    {creating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> 作成中...</> : 'ジョブを作成'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#dadce0] flex flex-col items-center justify-center py-16">
          <ListTodo className="h-10 w-10 text-[#dadce0] mb-3" />
          <p className="text-[13px] text-[#5f6368]">ジョブがありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#dadce0] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>アカウント</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>期間</TableHead>
                <TableHead>推定/実リクエスト</TableHead>
                <TableHead>取得件数</TableHead>
                <TableHead>エラー</TableHead>
                <TableHead>作成日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
                return (
                  <TableRow key={job.id} className="hover:bg-[#f8f9fa]">
                    <TableCell className="text-[13px] font-medium text-[#202124]">
                      @{job.tracked_accounts.username}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {sc.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px] text-[#5f6368]">
                      {job.period_start
                        ? `${new Date(job.period_start).toLocaleDateString('ja-JP')} 〜 ${new Date(job.period_end!).toLocaleDateString('ja-JP')}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-[13px] text-[#3c4043] font-mono">
                      {job.estimated_requests ?? '-'} / {job.actual_requests}
                    </TableCell>
                    <TableCell className="text-[13px] text-[#3c4043]">{job.posts_fetched}</TableCell>
                    <TableCell className="text-[12px] text-[#c5221f] max-w-[200px] truncate">
                      {job.error_message || '-'}
                    </TableCell>
                    <TableCell className="text-[12px] text-[#5f6368]">
                      {new Date(job.created_at).toLocaleString('ja-JP')}
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
