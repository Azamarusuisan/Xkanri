'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PlugZap, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface Connection {
  id: string;
  status: 'ok' | 'invalid' | 'rate_limited' | 'untested';
  x_user_id: string | null;
  x_username: string | null;
  last_tested_at: string | null;
}

const STATUS_CONFIG = {
  ok: { label: '接続済み', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
  invalid: { label: '無効', variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
  rate_limited: { label: 'レート制限', variant: 'secondary' as const, icon: AlertTriangle, color: 'text-yellow-600' },
  untested: { label: '未テスト', variant: 'outline' as const, icon: AlertTriangle, color: 'text-gray-500' },
};

export default function ConnectionXPage() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [bearerToken, setBearerToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnection();
  }, []);

  async function fetchConnection() {
    try {
      const res = await fetch('/api/connections/x');
      const data = await res.json();
      setConnection(data.connection);
    } catch {
      toast.error('接続情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/connections/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bearerToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnection(data.connection);
      setBearerToken('');
      toast.success('Bearer Token を保存しました');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch('/api/connections/x/test', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'ok') {
        toast.success(`接続成功: @${data.user.username}`);
      } else if (data.status === 'rate_limited') {
        toast.warning(data.message);
      } else {
        toast.error(data.message || 'トークンが無効です');
      }
      await fetchConnection();
    } catch {
      toast.error('接続テストに失敗しました');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusConfig = connection ? STATUS_CONFIG[connection.status] : null;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1">X API 接続</h2>
      <p className="text-sm text-muted-foreground mb-6">
        あなたのX API Bearer Token を登録してください（BYOK）
      </p>

      {/* Current Status */}
      {connection && statusConfig && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">接続ステータス</CardTitle>
              <Badge variant={statusConfig.variant}>
                <statusConfig.icon className={`h-3 w-3 mr-1 ${statusConfig.color}`} />
                {statusConfig.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {connection.x_username && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Xアカウント</span>
                <span className="font-medium">@{connection.x_username}</span>
              </div>
            )}
            {connection.last_tested_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">最終テスト</span>
                <span>{new Date(connection.last_tested_at).toLocaleString('ja-JP')}</span>
              </div>
            )}
            <div className="pt-2">
              <Button
                onClick={handleTest}
                disabled={testing}
                variant="outline"
                size="sm"
              >
                {testing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> テスト中...</>
                ) : (
                  <><PlugZap className="h-4 w-4 mr-2" /> 接続テスト</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {connection ? 'Bearer Token を更新' : 'Bearer Token を登録'}
          </CardTitle>
          <CardDescription>
            X Developer Portal で取得した Bearer Token を入力してください。
            トークンはサーバー側で暗号化されて保存されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Bearer Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="AAAA..."
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={saving || !bearerToken.trim()}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 保存中...</>
              ) : (
                '保存'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
