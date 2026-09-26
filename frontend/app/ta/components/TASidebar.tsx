'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCog,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
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
      className={`sticky top-16 h-[calc(100vh-4rem)] border-r border-gray-200 bg-gray-900 transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-56'
        }`}
    >
      <nav className="flex flex-col gap-1 p-2 pt-4 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                ? 'bg-maroon-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={20} />
              {!collapsed && <span className="font-sans">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section with Logout */}
      <div className="p-2 border-t border-gray-700">
        <button
          onClick={logout}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span className="font-sans">Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-maroon-600 p-1.5 text-white hover:bg-maroon-700 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
