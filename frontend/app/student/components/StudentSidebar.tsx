'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Assessments', href: '/student/session', icon: FileText },
];

export default function StudentSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on session page for more spreadsheet space
  const isSessionPage = pathname.startsWith('/student/session');

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] border-r border-gray-200 bg-white flex flex-col transition-all duration-200 ${collapsed || isSessionPage ? 'w-16' : 'w-56'
        }`}
    >
      {/* Hamburger menu toggle */}
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full rounded-lg p-2 hover:bg-gray-50 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                  ? 'bg-maroon-50 text-maroon-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed || isSessionPage ? 'justify-center' : ''}`}
              title={item.label}
            >
              <item.icon size={20} />
              {!(collapsed || isSessionPage) && (
                <span className="font-sans">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout at bottom */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={logout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${collapsed || isSessionPage ? 'justify-center' : ''
            }`}
          title="Logout"
        >
          <LogOut size={20} />
          {!(collapsed || isSessionPage) && (
            <span className="font-sans">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
}
