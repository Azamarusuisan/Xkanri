'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PlugZap, CheckCircle, XCircle, AlertTriangle, Loader2, Shield } from 'lucide-react';

interface Connection {
  id: string;
  status: 'ok' | 'invalid' | 'rate_limited' | 'untested';
  x_user_id: string | null;
  x_username: string | null;
  last_tested_at: string | null;
}

const STATUS_CONFIG = {
  ok: { label: '有効', icon: CheckCircle, bg: '#e6f4ea', color: '#137333', border: '#34a853' },
  invalid: { label: '無効', icon: XCircle, bg: '#fce8e6', color: '#c5221f', border: '#ea4335' },
  rate_limited: { label: 'レート制限中', icon: AlertTriangle, bg: '#fef7e0', color: '#b05a00', border: '#fbbc04' },
  untested: { label: '未テスト', icon: AlertTriangle, bg: '#f1f3f4', color: '#5f6368', border: '#dadce0' },
};

export default function ConnectionXPage() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [bearerToken, setBearerToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchConnection(); }, []);

  async function fetchConnection() {
    try {
      const res = await fetch('/api/connections/x');
      const data = await res.json();
      setConnection(data.connection);
    } catch { toast.error('接続情報の取得に失敗しました'); }
    finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/connections/x', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bearerToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnection(data.connection);
      setBearerToken('');
      toast.success('Bearer Token を保存しました');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally { setSaving(false); }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch('/api/connections/x/test', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'ok') toast.success(`接続成功: @${data.user.username}`);
      else if (data.status === 'rate_limited') toast.warning(data.message);
      else toast.error(data.message || 'トークンが無効です');
      await fetchConnection();
    } catch { toast.error('接続テストに失敗しました'); }
    finally { setTesting(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-[#1a73e8]" /></div>;
  }

  const sc = connection ? STATUS_CONFIG[connection.status] : null;

  return (
    <div className="max-w-[640px]">
      <h1 className="text-[20px] font-normal text-[#202124] mb-1">X API 接続</h1>
      <p className="text-[12px] text-[#5f6368] mb-6">Bring Your Own Key — あなたのX API Bearer Tokenで接続</p>

      {/* Status card */}
      {connection && sc && (
        <div className="bg-white rounded-lg border border-[#dadce0] mb-5">
          <div className="px-5 py-4 border-b border-[#f1f3f4] flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#202124]">接続ステータス</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              <sc.icon className="h-3 w-3" />
              {sc.label}
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {connection.x_username && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#5f6368]">Xアカウント</span>
                <span className="font-medium text-[#202124]">@{connection.x_username}</span>
              </div>
            )}
            {connection.x_user_id && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#5f6368]">User ID</span>
                <span className="font-mono text-[#202124]">{connection.x_user_id}</span>
              </div>
            )}
            {connection.last_tested_at && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#5f6368]">最終テスト</span>
                <span className="text-[#202124]">{new Date(connection.last_tested_at).toLocaleString('ja-JP')}</span>
              </div>
            )}
            <div className="pt-2">
              <Button onClick={handleTest} disabled={testing} variant="outline" className="h-8 text-[12px] px-4 border-[#dadce0] text-[#1a73e8] hover:bg-[#e8f0fe]">
                {testing ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />テスト中</> : <><PlugZap className="h-3.5 w-3.5 mr-1.5" />接続テスト</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Token input */}
      <div className="bg-white rounded-lg border border-[#dadce0]">
        <div className="px-5 py-4 border-b border-[#f1f3f4]">
          <span className="text-[13px] font-medium text-[#202124]">{connection ? 'Bearer Token を更新' : 'Bearer Token を登録'}</span>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start gap-3 mb-4 p-3 rounded bg-[#e8f0fe] text-[12px] text-[#1a73e8]">
            <Shield className="h-4 w-4 shrink-0 mt-0.5" />
            <span>トークンはサーバー側で AES-256-GCM 暗号化されて保存されます。クライアントに返されることはありません。</span>
          </div>
          <form onSubmit={handleSave} className="flex gap-3">
            <Input
              type="password"
              placeholder="Bearer Token を入力..."
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              required
              className="h-9 flex-1 border-[#dadce0] placeholder:text-[#9aa0a6]"
            />
            <Button type="submit" disabled={saving || !bearerToken.trim()} className="h-9 px-5 bg-[#1a73e8] hover:bg-[#1557b0] text-[12px]">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '保存'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
