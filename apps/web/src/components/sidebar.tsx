'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  PlugZap,
  Users,
  ListTodo,
  Database,
  BarChart3,
  FileText,
  LogOut,
  LayoutDashboard,
  Sparkles,
  Megaphone,
  Menu,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const NAV_SECTIONS: Array<{ title?: string; items: NavItem[] }> = [
  {
    items: [
      { href: '/app', label: '概要', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'データソース',
    items: [
      { href: '/app/connections/x', label: 'X API 接続', icon: PlugZap },
      { href: '/app/connections/ads-x', label: 'X Ads 接続', icon: Megaphone },
      { href: '/app/accounts', label: '追跡アカウント', icon: Users },
      { href: '/app/jobs', label: '収集ジョブ', icon: ListTodo },
    ],
  },
  {
    title: 'レポート',
    items: [
      { href: '/app/data/posts', label: '投稿データ', icon: Database },
      { href: '/app/analytics', label: 'パフォーマンス', icon: BarChart3, exact: true },
      { href: '/app/analytics/creative', label: 'クリエイティブ分析', icon: Sparkles },
      { href: '/app/ads/analytics', label: '広告パフォーマンス', icon: Megaphone },
    ],
  },
  {
    title: '管理',
    items: [
      { href: '/app/audit', label: 'API 監査ログ', icon: FileText },
    ],
  },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    window.location.href = '/login';
  }

  return (
    <>
      {/* Header */}
      <div className="h-[56px] flex items-center px-4 border-b border-[#dadce0] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#1a73e8] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#202124] leading-tight">PIVOTMCP</div>
            <div className="text-[10px] text-[#5f6368] leading-tight">X Data Asset OS</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="px-4 pt-4 pb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#5f6368]">
                  {section.title}
                </span>
              </div>
            )}
            {section.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 mx-2 px-3 h-8 rounded text-[13px] transition-colors relative',
                    isActive
                      ? 'bg-[#e8f0fe] text-[#1a73e8] font-medium'
                      : 'text-[#3c4043] hover:bg-[#f1f3f4]'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#1a73e8]" />
                  )}
                  <item.icon className={cn('h-[16px] w-[16px] shrink-0', isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]')} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#dadce0] p-2 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 h-8 rounded text-[13px] text-[#5f6368] hover:bg-[#f1f3f4] w-full transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          ログアウト
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-[220px] bg-white border-r border-[#dadce0] flex-col h-screen sticky top-0 select-none">
      <NavContent />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-1.5 rounded hover:bg-[#f1f3f4] transition-colors"
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5 text-[#5f6368]" />
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <div className="absolute right-2 top-3 z-10">
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-[#f1f3f4] transition-colors"
                aria-label="メニューを閉じる"
              >
                <X className="h-5 w-5 text-[#5f6368]" />
              </button>
            </div>
            <NavContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
