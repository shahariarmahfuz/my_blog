import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync body.drawer-open class with mobileOpen for the CSS drawer behavior
  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add('drawer-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('drawer-open');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.classList.remove('drawer-open');
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const hasLocalToken = !!localStorage.getItem('foundation_token');

  if (isLoading && hasLocalToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-600">Loading Foundation System...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !hasLocalToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f5f9] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100">
      {/* Mobile Backdrop */}
      <div
        id="backdrop"
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar: static on desktop, fixed drawer on mobile */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#f1f5f9] dark:bg-[#0b0f19]">
        <Navbar
          onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f1f5f9] dark:bg-[#0b0f19]">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
