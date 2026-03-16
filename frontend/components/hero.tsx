"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GRADIENT_TEXT, BTN_GRADIENT } from "@/lib/styles";

export default function Hero() {
	return (
		<section id="home" className="relative flex min-h-screen items-center justify-center px-6 py-20">

			<motion.div
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, ease: "easeOut" }}
				className="relative z-10 w-full max-w-4xl rounded-2xl bg-transparent p-8 backdrop-blur-md shadow-xl"
			>
				<div className="flex flex-col items-center gap-6 text-center">
					<h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
						<span className={GRADIENT_TEXT}>Understand Your Health.</span>
					</h1>
					<p className="max-w-2xl text-lg text-white/80">
						HemaLink uses AI to translate blood test results into clear, actionable insights so you can make informed health decisions.
					</p>

					<div className="flex gap-4">
						<Link href="/upload" className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold shadow-md transition-transform hover:scale-[1.03] ${BTN_GRADIENT}`}>
							Start Analysis
						</Link>
						<Link href="#how-it-works" className="inline-flex items-center gap-2 rounded-md border border-red-800/30 px-6 py-3 text-sm text-white/90 hover:text-red-400">
							How it works
						</Link>
					</div>
				</div>
			</motion.div>
		</section>
	);
}
