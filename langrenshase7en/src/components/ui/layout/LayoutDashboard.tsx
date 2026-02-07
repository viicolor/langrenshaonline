import { ReactNode } from 'react';

interface LayoutDashboardProps {
  children: ReactNode;
}

export const LayoutDashboard = ({ children }: LayoutDashboardProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="p-4">
            <h2 className="font-display text-lg font-bold mb-6">后台管理</h2>
            <nav className="space-y-2">
              <a href="#overview" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors">
                <span className="text-sm">📊</span>
                <span className="text-sm font-medium">概览</span>
              </a>
              <a href="#boards" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors">
                <span className="text-sm">🎲</span>
                <span className="text-sm font-medium">板子</span>
              </a>
              <a href="#cards" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors">
                <span className="text-sm">🃏</span>
                <span className="text-sm font-medium">牌库</span>
              </a>
              <a href="#rules" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors">
                <span className="text-sm">⚙️</span>
                <span className="text-sm font-medium">规则</span>
              </a>
              <a href="#ai" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors">
                <span className="text-sm">🤖</span>
                <span className="text-sm font-medium">AI</span>
              </a>
            </nav>
          </div>
        </aside>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
