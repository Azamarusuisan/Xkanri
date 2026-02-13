'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  queued: { variant: 'outline', label: '待機中' },
  running: { variant: 'default', label: '実行中' },
  completed: { variant: 'secondary', label: '完了' },
  failed: { variant: 'destructive', label: '失敗' },
  rate_limited: { variant: 'outline', label: 'レート制限' },
  cancelled: { variant: 'outline', label: 'キャンセル' },
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

  useEffect(() => {
    Promise.all([fetchJobs(), fetchAccounts()]);
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      toast.error('ジョブ一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracked_account_ids: [selectedAccount],
          period: selectedPeriod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEstimates(data.estimates);
      setTotalRequests(data.total_requests);
      setStep('confirm');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setEstimating(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracked_account_id: selectedAccount,
          period: selectedPeriod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('収集ジョブを作成しました');
      setDialogOpen(false);
      resetDialog();
      fetchJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setCreating(false);
    }
  }

  function resetDialog() {
    setStep('select');
    setSelectedAccount('');
    setSelectedPeriod('4weeks');
    setEstimates(null);
    setTotalRequests(0);
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
          <h2 className="text-2xl font-bold">収集ジョブ</h2>
          <p className="text-sm text-muted-foreground">
            投稿データの収集ジョブを管理
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
          <DialogTrigger asChild>
            <Button disabled={accounts.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              ジョブ作成
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {step === 'select' ? '収集ジョブを作成' : '推定コストの確認'}
              </DialogTitle>
              <DialogDescription>
                {step === 'select'
                  ? '対象アカウントと期間を選択してください'
                  : '推定リクエスト数を確認してジョブを作成してください'}
              </DialogDescription>
            </DialogHeader>

            {step === 'select' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">対象アカウント</label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="アカウントを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          @{a.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">期間</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleEstimate}
                  disabled={!selectedAccount || estimating}
                  className="w-full"
                >
                  {estimating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 推定中...</>
                  ) : (
                    '推定コストを確認'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                      <div className="space-y-2 text-sm">
                        {estimates?.map((e) => (
                          <div key={e.account_id}>
                            <p className="font-medium">@{e.username}</p>
                            <p className="text-muted-foreground">
                              推定 {e.estimated_tweets} 件の投稿 / {e.estimated_requests} リクエスト
                              {e.is_differential && ' (差分取得)'}
                            </p>
                          </div>
                        ))}
                        <div className="pt-2 border-t">
                          <p className="font-bold">
                            合計推定リクエスト数: {totalRequests}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            ※ 実際のリクエスト数は投稿件数により変動します
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('select')}>
                    戻る
                  </Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 作成中...</>
                    ) : (
                      'ジョブを作成'
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">ジョブがありません</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
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
                const badge = STATUS_BADGES[job.status] || STATUS_BADGES.queued;
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      @{job.tracked_accounts.username}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.period_start
                        ? `${new Date(job.period_start).toLocaleDateString('ja-JP')} 〜 ${new Date(job.period_end!).toLocaleDateString('ja-JP')}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {job.estimated_requests ?? '-'} / {job.actual_requests}
                    </TableCell>
                    <TableCell>{job.posts_fetched}</TableCell>
                    <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                      {job.error_message || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(job.created_at).toLocaleString('ja-JP')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
