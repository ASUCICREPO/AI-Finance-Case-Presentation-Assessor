'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCog,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/ta/dashboard', icon: LayoutDashboard },
  { label: 'Students', href: '/ta/students', icon: Users },
  { label: 'Case assessment', href: '/ta/assessments', icon: FileText },
  { label: 'Persona configuration', href: '/ta/personas', icon: UserCog },
  { label: 'Grade book', href: '/ta/gradebook', icon: BookOpen },
];

export default function TASidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] border-r border-gray-200 bg-gray-900 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'
        }`}
    >
      <nav className="flex flex-col gap-1 p-2 pt-4">
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

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-gray-700 p-1.5 text-gray-300 hover:bg-gray-600 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
