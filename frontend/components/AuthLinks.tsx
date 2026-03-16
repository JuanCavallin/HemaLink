'use client';

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { BTN_PRIMARY } from '@/lib/styles';

export default function AuthLinks() {
  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-gray-300 hover:text-white"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className={BTN_PRIMARY}
        >
          Sign Up
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}