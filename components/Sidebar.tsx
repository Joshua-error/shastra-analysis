'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/games', label: 'Games', icon: '🗓' },
  { href: '/history', label: 'History', icon: '📋' },
  { href: '/tournament', label: 'Tournament', icon: '🏆' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    document.cookie = 'guest_operator=; path=/; max-age=0';
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 border-r border-gray-800 min-h-screen sticky top-0 h-screen no-print">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏀</span>
            <span className="font-black text-white text-sm leading-tight">
              Tournament<br />Stats
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-100
                  ${active
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 no-print">
        <div className="flex">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs font-semibold transition-colors
                  ${active ? 'text-orange-400' : 'text-gray-500'}`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
