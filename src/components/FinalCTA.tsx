"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { y: 40, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

export default function FinalCTA() {
  return (
    <section className="border-t border-[#1E2028] relative overflow-hidden">
      {/* Radial gradient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(59, 130, 246, 0.06), transparent)",
        }}
      />

      <div className="max-w-[1200px] mx-auto px-6 py-[120px] max-md:py-20 relative z-10">
        <div className="text-center">
          <motion.h2
            {...fadeUp}
            className="font-display text-4xl md:text-[56px] leading-[1.1] text-[#EDEEF0] mb-6"
          >
            Let&apos;s build your pipeline.
          </motion.h2>

          <motion.p
            {...fadeUp}
            className="text-[#8B8D98] text-lg max-w-[500px] mx-auto mb-10 leading-relaxed"
          >
            30 minutes. No pitch deck. We&apos;ll map out what your outbound
            system should look like and give you a clear plan — whether
            you work with us or not.
          </motion.p>

          <motion.div {...fadeUp}>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-[#3B82F6] hover:bg-[#60A5FA] text-white font-body font-medium px-10 py-4 rounded-full text-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]"
            >
              Book Your Strategy Call
              <span>→</span>
            </Link>
          </motion.div>

          <motion.p
            {...fadeUp}
            className="text-[#5A5C66] text-sm mt-5"
          >
            Free · No obligation · Spots are limited
          </motion.p>
        </div>
      </div>
    </section>
  );
}
