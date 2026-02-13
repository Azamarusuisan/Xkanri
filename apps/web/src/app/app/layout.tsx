import { Sidebar, MobileNav } from '@/components/sidebar';
import { Toaster } from '@/components/ui/sonner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[56px] bg-white border-b border-[#dadce0] flex items-center px-4 md:px-6 shrink-0">
          <MobileNav />
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 text-[12px] text-[#5f6368]">
              <div className="w-7 h-7 rounded-full bg-[#1a73e8] flex items-center justify-center">
                <span className="text-white text-[11px] font-medium">U</span>
              </div>
              <span className="hidden sm:inline">デモユーザー</span>
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
