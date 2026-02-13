'use client';

import { useState, useEffect, useCallback } from 'react';
import { PeriodSelector, getPeriodDates, type PeriodKey } from '@/components/period-selector';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Loader2, FileText, AlertTriangle, Activity, DollarSign, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
    endpoint_breakdown: Array<{ endpoint: string; count: number; units: number }>;
    daily: Array<{ date: string; calls: number; units: number }>;
  };
}

export default function AuditPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<PeriodKey>('4weeks');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { dateFrom, dateTo } = getPeriodDates(period);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('date_from', dateFrom);
      params.set('date_to', dateTo);
      const res = await fetch(`/api/audit?${params}`);
      const d = await res.json();
      setData(d);
    } catch { toast.error('監査データの取得に失敗しました'); }
    finally { setLoading(false); }
  }, [page, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-[#1a73e8]" /></div>;
  }

  if (!data) return null;

  return (
    <div>
      <h1 className="text-[20px] font-normal text-[#202124] mb-1">API 監査ログ</h1>
      <p className="text-[12px] text-[#5f6368] mb-6">X API 呼び出し履歴とコスト推定</p>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <PeriodSelector value={period} onChange={(p) => { setPeriod(p); setPage(1); }} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { label: 'API呼び出し総数', value: data.summary.total_calls.toLocaleString(), icon: Activity, color: '#1a73e8' },
          { label: '推定ユニット合計', value: data.summary.total_units.toLocaleString(), icon: DollarSign, color: '#34a853' },
          { label: '429エラー', value: String(data.summary.rate_limit_count), icon: AlertTriangle, color: data.summary.rate_limit_count > 0 ? '#ea4335' : '#5f6368' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-[#dadce0] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: s.color + '14' }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <span className="text-[12px] font-medium text-[#5f6368]">{s.label}</span>
            </div>
            <div className="text-[28px] font-normal leading-none" style={{ color: s.label === '429エラー' && data.summary.rate_limit_count > 0 ? '#c5221f' : '#202124' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Daily Chart */}
      {data.summary.daily.length > 0 && (
        <div className="bg-white rounded-lg border border-[#dadce0] mb-6">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">日別API呼び出し数</span>
          </div>
          <div className="p-5">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.summary.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                  <XAxis dataKey="date" fontSize={10} tick={{ fill: '#5f6368' }} />
                  <YAxis fontSize={10} tick={{ fill: '#5f6368' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dadce0' }} />
                  <Bar dataKey="calls" fill="#1a73e8" name="呼び出し数" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Endpoint Breakdown */}
      {data.summary.endpoint_breakdown.length > 0 && (
        <div className="bg-white rounded-lg border border-[#dadce0] mb-6 overflow-x-auto">
          <div className="px-5 py-4 border-b border-[#f1f3f4]">
            <span className="text-[13px] font-medium text-[#202124]">エンドポイント別</span>
          </div>
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>エンドポイント</TableHead>
                <TableHead className="text-right">呼び出し数</TableHead>
                <TableHead className="text-right">推定ユニット</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.summary.endpoint_breakdown.map((ep) => (
                <TableRow key={ep.endpoint} className="hover:bg-[#f8f9fa]">
                  <TableCell className="font-mono text-[12px] text-[#3c4043]">{ep.endpoint}</TableCell>
                  <TableCell className="text-right text-[12px] text-[#3c4043]">{ep.count.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-[12px] text-[#3c4043]">{ep.units.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Log Table */}
      <div className="bg-white rounded-lg border border-[#dadce0] overflow-x-auto">
        <div className="px-5 py-4 border-b border-[#f1f3f4]">
          <span className="text-[13px] font-medium text-[#202124]">
            API呼び出しログ（{data.total_logs.toLocaleString()} 件）
          </span>
        </div>
        {data.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="h-10 w-10 text-[#dadce0] mb-3" />
            <p className="text-[13px] text-[#5f6368]">ログがありません</p>
          </div>
        ) : (
          <>
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
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
                  <TableRow key={log.id} className="hover:bg-[#f8f9fa]">
                    <TableCell className="text-[11px] text-[#5f6368] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-[#3c4043]">{log.endpoint}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#f1f3f4] text-[#5f6368]">
                        {log.method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        log.status_code === 200
                          ? 'bg-[#e6f4ea] text-[#137333]'
                          : log.status_code === 429
                          ? 'bg-[#fef7e0] text-[#b05a00]'
                          : 'bg-[#fce8e6] text-[#c5221f]'
                      }`}>
                        {log.status_code || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-[12px] text-[#5f6368] font-mono">
                      {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                    </TableCell>
                    <TableCell className="text-[12px] text-[#c5221f] max-w-[200px] truncate">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#f1f3f4]">
              <p className="text-[12px] text-[#5f6368]">
                {data.total_logs.toLocaleString()} 件中 {((page - 1) * 50 + 1).toLocaleString()} - {Math.min(page * 50, data.total_logs).toLocaleString()} 件
              </p>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#f1f3f4] disabled:opacity-30 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-[#5f6368]" />
                </button>
                <span className="text-[12px] text-[#3c4043] px-3">{page} / {data.total_pages}</span>
                <button disabled={page >= data.total_pages} onClick={() => setPage(page + 1)} className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#f1f3f4] disabled:opacity-30 transition-colors">
                  <ChevronRight className="h-4 w-4 text-[#5f6368]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
