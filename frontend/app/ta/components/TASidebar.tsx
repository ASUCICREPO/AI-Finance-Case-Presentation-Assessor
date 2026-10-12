'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCog,
  BookOpen,
  Calendar,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/ta/dashboard', icon: LayoutDashboard },
  { label: 'Sessions', href: '/ta/sessions', icon: Calendar },
  { label: 'Students', href: '/ta/students', icon: Users },
  { label: 'Case Assessment', href: '/ta/assessments', icon: FileText },
  { label: 'Avatar Configuration', href: '/ta/personas', icon: UserCog },
  { label: 'Grade Book', href: '/ta/gradebook', icon: BookOpen },
];

export default function TASidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] border-r border-gray-200 bg-white flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'
        }`}
    >
      {/* Sidebar toggle */}
      <div className={`p-3 border-b border-gray-100 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-maroon-600 hover:bg-maroon-700 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight size={20} className="text-white" />
          ) : (
            <ChevronLeft size={20} className="text-white" />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                ? 'bg-maroon-50 text-maroon-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed ? 'justify-center' : ''}`}
              title={item.label}
            >
              <item.icon size={20} />
              {!collapsed && <span className="font-sans">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout at bottom */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={logout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''
            }`}
          title="Logout"
        >
          <LogOut size={20} />
          {!collapsed && <span className="font-sans">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
