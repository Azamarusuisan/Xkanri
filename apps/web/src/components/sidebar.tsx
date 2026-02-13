'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PlugZap,
  Users,
  ListTodo,
  Database,
  BarChart3,
  FileText,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/app', label: 'ダッシュボード', icon: LayoutDashboard, exact: true },
  { href: '/app/connections/x', label: 'X接続', icon: PlugZap },
  { href: '/app/accounts', label: '追跡アカウント', icon: Users },
  { href: '/app/jobs', label: '収集ジョブ', icon: ListTodo },
  { href: '/app/data/posts', label: '投稿データ', icon: Database },
  { href: '/app/analytics', label: '分析', icon: BarChart3 },
  { href: '/app/audit', label: '監査ログ', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <aside className="w-60 bg-card border-r flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold tracking-tight">PIVOTMCP</h1>
        <p className="text-xs text-muted-foreground">X API データ資産化OS</p>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
