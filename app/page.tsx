"use client";

import Particles from "@/components/particles";
import Hero from "@/components/hero";
import About from "@/components/about";
import HowItWorks from "@/components/howitworks";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden scroll-smooth bg-gradient-to-b from-[#0a0000] via-[#1a0000] to-[#000000] text-white">
      {/* Background particles only on home page */}
      <Particles />

      <main className="relative overflow-x-hidden">
        <section className="min-h-screen py-20 px-6">
          <Hero />
        </section>

        <section className="min-h-screen py-20 px-6">
          <About />
        </section>

        <section className="min-h-screen py-20 px-6">
          <HowItWorks />
        </section>
      </main>
    </div>
  );
}