'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Video,
  BarChart3,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Assessments', href: '/student/session', icon: FileText },
  { label: 'Sessions', href: '/student/session/history', icon: Video },
  { label: 'Results', href: '/student/results', icon: BarChart3 },
  { label: 'Help', href: '/student/help', icon: HelpCircle },
];

export default function StudentSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] border-r border-gray-200 bg-maroon-600 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <nav className="flex flex-col gap-1 p-2 pt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
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
        className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
