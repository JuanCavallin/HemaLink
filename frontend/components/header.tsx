"use client";

import Link from "next/link";
import { SignInButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { GRADIENT_TEXT_STRONG, NAV_LINK, BTN_GRADIENT } from "@/lib/styles";

export default function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            <div className="mx-auto max-w-7xl px-6">
                <div className="flex items-center justify-between rounded-lg border border-red-800/20 bg-black/40 px-4 py-3 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.6)] shadow-[0_0_20px_rgba(255,0,60,0.25)]">
                    <Link href="/" className="flex items-center gap-3">
                        <span className={`text-xl font-extrabold ${GRADIENT_TEXT_STRONG}`}>
                            HemaLink
                        </span>
                    </Link>

                    <nav className="hidden gap-6 md:flex">
                        <Link href="/" className={NAV_LINK}>
                            Home
                        </Link>
                        {/* <Link href="/#about" className={NAV_LINK}>
                            About
                        </Link>
                        <Link href="/#how-it-works" className={NAV_LINK}>
                            How it works
                        </Link>*/}

                        <SignedIn>
                            <Link href="/upload" className={NAV_LINK}>
                                Upload
                            </Link>
                            <Link href="/analysis" className={NAV_LINK}>
                                Analysis
                            </Link>
                            <Link href="/summary" className={NAV_LINK}>
                                History
                            </Link>
                        </SignedIn>
                    </nav>

                    <div className="flex items-center gap-3">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className={`${BTN_GRADIENT} px-3 py-1 text-sm font-medium shadow-sm`}>
                                    Sign in
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <div className="hidden md:flex items-center gap-3">
                                <UserButton afterSignOutUrl="/" />
                            </div>
                        </SignedIn>
                    </div>
                </div>
            </div>
        </header>
    );
}