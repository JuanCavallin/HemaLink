'use client';

import Link from 'next/link';
import AuthLinks from './AuthLinks';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  //creates correct link
  const getHref = (id: string) => {
    return isHomePage ? `#${id}` : `/#${id}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-700 bg-[var(--background)]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4">
        {/* logo */}
        <div className="flex-shrink-0">
          <Link
            href={getHref('home')}
            className="text-lg font-bold text-[var(--foreground)]"
          >
            HemaLink
          </Link>
        </div>

        {/* nav */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <Link
            href={getHref('home')}
            className="text-sm text-gray-400 hover:text-gray-200"
          >
            Home
          </Link>
          <Link
            href={getHref('about')}
            className="text-sm text-gray-400 hover:text-gray-200"
          >
            About
          </Link>
          <Link
            href={getHref('how-it-works')}
            className="text-sm text-gray-400 hover:text-gray-200"
          >
            How It Works
          </Link>
          <Link
            href={getHref('pricing')}
            className="text-sm text-gray-400 hover:text-gray-200"
          >
            Pricing
          </Link>
        </div>

        {/* sign in */}
        <AuthLinks />
      </nav>
    </header>
  );
}