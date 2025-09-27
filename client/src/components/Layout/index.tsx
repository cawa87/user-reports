import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSidebar } from '@/hooks/useSidebar';

const Layout: React.FC = () => {
  const { isOpen, toggle } = useSidebar();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} onToggle={toggle} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header onToggleSidebar={toggle} />
        
        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="p-6 max-w-7xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900 bg-opacity-50 lg:hidden"
          onClick={toggle}
        />
      )}
    </div>
  );
};

export default Layout;
