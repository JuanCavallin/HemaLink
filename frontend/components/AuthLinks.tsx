'use client';

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

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
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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