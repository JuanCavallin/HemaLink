"use client";

import { motion } from "framer-motion";
import { UploadCloud, Brain, BarChart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { GRADIENT_BAR, ICON_CONTAINER, ICON_ACCENT } from "@/lib/styles";

const steps = [
	{
		title: "Upload Results",
		desc: "Securely upload lab reports or copy/paste values.\n",
		icon: UploadCloud,
	},
	{
		title: "AI Analysis",
		desc: "Our models analyze markers and highlight important signals.",
		icon: Brain,
	},
	{
		title: "Track & Act",
		desc: "Monitor your progress over time and receive personalized, data-driven tips.",
		icon: BarChart,
	},
];

export default function HowItWorks() {
	return (
		<section id="how-it-works" className="px-6 py-20">
			<div className="mx-auto max-w-6xl">
				<motion.h3 className="mb-2 text-center text-3xl font-bold text-white">How it works</motion.h3>
				<div className={`mb-8 w-28 mx-auto ${GRADIENT_BAR}`} />

				<div className="grid gap-6 sm:grid-cols-3">
					{steps.map((s, i) => (
						<motion.div
							key={s.title}
							initial={{ opacity: 0, y: 18 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: i * 0.12, duration: 0.6 }}
						>
							<Card className="text-white">
								<CardHeader>
									<div className={ICON_CONTAINER}>
										<s.icon className={`h-6 w-6 ${ICON_ACCENT}`} />
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
