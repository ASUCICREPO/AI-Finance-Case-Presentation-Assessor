'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  LogOut,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Assessments', href: '/student/session', icon: FileText },
];

export default function StudentSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] w-56 border-r border-gray-200 bg-white flex flex-col">
      <nav className="flex flex-col gap-1 p-3 pt-4 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                  ? 'bg-maroon-50 text-maroon-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <item.icon size={20} />
              <span className="font-sans">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout at bottom */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-sans">Logout</span>
        </button>
      </div>
    </aside>
  );
}
