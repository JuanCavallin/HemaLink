"use client";

import { motion } from "framer-motion";
import { UploadCloud, Brain, BarChart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const steps = [
	{
		title: "Upload Results",
		desc: "Securely upload lab reports or copy/paste values.",
		icon: UploadCloud,
	},
	{
		title: "AI Analysis",
		desc: "Our models analyze markers and highlight important signals.",
		icon: Brain,
	},
	{
		title: "Track & Act",
		desc: "Clear recommendations and charts to monitor progress.",
		icon: BarChart,
	},
];

export default function HowItWorks() {
	return (
		<section id="how-it-works" className="px-6 py-20">
			<div className="mx-auto max-w-6xl">
				<motion.h3 className="mb-2 text-center text-3xl font-bold text-white">How it works</motion.h3>
				<div className="mb-8 h-1 w-28 mx-auto rounded-full bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_20px_rgba(255,0,60,0.12)]" />

				<div className="grid gap-6 sm:grid-cols-3">
					{steps.map((s, i) => (
						<motion.div
							key={s.title}
							initial={{ opacity: 0, y: 18 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: i * 0.12, duration: 0.6 }}
						>
							<Card className="bg-black/40 border border-red-800/20 text-white shadow-[0_0_20px_rgba(255,0,60,0.1)]">
								<CardHeader>
									<div className="flex h-12 w-12 items-center justify-center rounded-md bg-red-900/20">
										<s.icon className="h-6 w-6 text-red-400" />
									</div>
									<CardTitle>{s.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-white/80">{s.desc}</p>
								</CardContent>
							</Card>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
