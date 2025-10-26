"use client";

import { motion } from "framer-motion";

export default function About() {
  return (
    <section id="about" className="px-6 py-20">
      <motion.div
        whileInView={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 20 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-[800px] rounded-2xl bg-black/40 border border-red-800/30 p-10 text-center backdrop-blur-md shadow-lg glow"
      >
        <h2 className="text-3xl font-bold">
          <span className="bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent">About HemaLink</span>
        </h2>
        <p className="mt-4 text-lg text-white/80">
          HemaLink transforms complex lab reports into clear, actionable health insights. We use Explainable AI to analyze your blood work and provide precise interpretations, not just numbers. Upload your results to instantly understand your health, see clear visualizations of your data, and easily track your wellness trends over time.
        </p>
      </motion.div>
    </section>
  );
}
