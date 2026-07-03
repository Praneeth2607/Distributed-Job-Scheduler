import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Layers, LogOut } from 'lucide-react';

export const DashboardLayout = () => {
  const { isAuthenticated, logout, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border h-16 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2 text-gold-500">
          <Layers className="h-6 w-6" />
          <span className="font-sans font-bold text-lg text-charcoal tracking-tight">Antigravity Scheduler</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 font-medium">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Placeholder for now) */}
        <aside className="w-64 bg-white border-r border-border p-4 hidden md:block">
          <nav className="space-y-1">
            {/* Sidebar items will go here in 4.3 */}
            <div className="px-3 py-2 text-sm font-medium text-gray-500 bg-surface rounded-md">
              Dashboard Home
            </div>
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-surface">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
