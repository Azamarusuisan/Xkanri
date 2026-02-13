'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Loader2,
  FileText,
  AlertTriangle,
  Activity,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AuditData {
  logs: Array<{
    id: string;
    endpoint: string;
    method: string;
    status_code: number | null;
    estimated_units: number;
    response_time_ms: number | null;
    error_message: string | null;
    created_at: string;
  }>;
  total_logs: number;
  page: number;
  limit: number;
  total_pages: number;
  summary: {
    total_calls: number;
    total_units: number;
    rate_limit_count: number;
    endpoint_breakdown: Array<{
      endpoint: string;
      count: number;
      units: number;
    }>;
    daily: Array<{
      date: string;
      calls: number;
      units: number;
    }>;
  };
}

export default function AuditPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const res = await fetch(`/api/audit?${params}`);
      const d = await res.json();
      setData(d);
    } catch {
      toast.error('監査データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">監査ログ</h2>
      <p className="text-sm text-muted-foreground mb-6">
        X API 呼び出し履歴とコスト推定
      </p>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Input
          type="date"
          className="w-36"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
        />
        <Input
          type="date"
          className="w-36"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> API呼び出し総数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.summary.total_calls.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> 推定ユニット合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.summary.total_units.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> 429エラー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {data.summary.rate_limit_count}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      {data.summary.daily.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">日別API呼び出し数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.summary.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#3b82f6" name="呼び出し数" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endpoint Breakdown */}
      {data.summary.endpoint_breakdown.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">エンドポイント別</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>エンドポイント</TableHead>
                  <TableHead className="text-right">呼び出し数</TableHead>
                  <TableHead className="text-right">推定ユニット</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.summary.endpoint_breakdown.map((ep) => (
                  <TableRow key={ep.endpoint}>
                    <TableCell className="font-mono text-sm">{ep.endpoint}</TableCell>
                    <TableCell className="text-right">{ep.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{ep.units.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            API呼び出しログ（{data.total_logs.toLocaleString()} 件）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">ログがありません</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>エンドポイント</TableHead>
                    <TableHead>メソッド</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">応答時間</TableHead>
                    <TableHead>エラー</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ja-JP')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.endpoint}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{log.method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status_code === 200
                              ? 'secondary'
                              : log.status_code === 429
                              ? 'outline'
                              : 'destructive'
                          }
                          className="text-xs"
                        >
                          {log.status_code || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {data.total_logs} 件中 {(page - 1) * 50 + 1} - {Math.min(page * 50, data.total_logs)} 件
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
                    {page} / {data.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.total_pages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
