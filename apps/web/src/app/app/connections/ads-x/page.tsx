'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Megaphone, CheckCircle, XCircle, AlertTriangle, Loader2, Shield } from 'lucide-react';

interface AdsConnection {
  id: string;
  status: 'ok' | 'invalid' | 'rate_limited' | 'untested';
  ad_account_id: string | null;
  ad_account_name: string | null;
  last_tested_at: string | null;
}

const STATUS_CONFIG = {
  ok: { label: '有効', icon: CheckCircle, bg: '#e6f4ea', color: '#137333', border: '#34a853' },
  invalid: { label: '無効', icon: XCircle, bg: '#fce8e6', color: '#c5221f', border: '#ea4335' },
  rate_limited: { label: 'レート制限中', icon: AlertTriangle, bg: '#fef7e0', color: '#b05a00', border: '#fbbc04' },
  untested: { label: '未テスト', icon: AlertTriangle, bg: '#f1f3f4', color: '#5f6368', border: '#dadce0' },
};

export default function ConnectionAdsXPage() {
  const [connection, setConnection] = useState<AdsConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => { fetchConnection(); }, []);

  async function fetchConnection() {
    try {
      const res = await fetch('/api/connections/ads-x');
      const data = await res.json();
      setConnection(data.connection);
    } catch { toast.error('接続情報の取得に失敗しました'); }
    finally { setLoading(false); }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch('/api/connections/ads-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oauth_token: 'oauth_placeholder' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnection(data.connection);
      toast.success('X Ads アカウントを接続しました');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally { setConnecting(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-[#1a73e8]" /></div>;
  }

  const sc = connection ? STATUS_CONFIG[connection.status] : null;

  return (
    <div className="max-w-[640px]">
      <h1 className="text-[20px] font-normal text-[#202124] mb-1">X Ads API 接続</h1>
      <p className="text-[12px] text-[#5f6368] mb-6">OAuth 認証 — X Ads アカウントとの接続</p>

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
            {connection.ad_account_name && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#5f6368]">広告アカウント</span>
                <span className="font-medium text-[#202124]">{connection.ad_account_name}</span>
              </div>
            )}
            {connection.ad_account_id && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#5f6368]">Account ID</span>
                <span className="font-mono text-[#202124]">{connection.ad_account_id}</span>
              </div>
            )}
            {connection.last_tested_at && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#5f6368]">最終テスト</span>
                <span className="text-[#202124]">{new Date(connection.last_tested_at).toLocaleString('ja-JP')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connect card */}
      <div className="bg-white rounded-lg border border-[#dadce0]">
        <div className="px-5 py-4 border-b border-[#f1f3f4]">
          <span className="text-[13px] font-medium text-[#202124]">{connection ? 'Ads アカウントを再接続' : 'X Ads アカウントを接続'}</span>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start gap-3 mb-4 p-3 rounded bg-[#e8f0fe] text-[12px] text-[#1a73e8]">
            <Shield className="h-4 w-4 shrink-0 mt-0.5" />
            <span>OAuth トークンはサーバー側で AES-256-GCM 暗号化されて保存されます。</span>
          </div>
          <p className="text-[12px] text-[#5f6368] mb-4">
            X Ads API にアクセスするための OAuth 認証を行います。「接続」をクリックすると X の認証画面に遷移します。
          </p>
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="h-9 px-5 bg-[#1a73e8] hover:bg-[#1557b0] text-[12px]"
          >
            {connecting ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />接続中</>
            ) : (
              <><Megaphone className="h-3.5 w-3.5 mr-1.5" />X Ads アカウントを接続</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
