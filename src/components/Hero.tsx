"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

const campaigns = [
  {
    dot: "bg-[#22C55E]",
    icp: "ICP: Series A SaaS",
    leads: "1,247 leads",
    badge: "Active",
    badgeColor: "bg-[#3B82F6]/20 text-[#60A5FA]",
  },
  {
    dot: "bg-[#22C55E]",
    icp: "ICP: Marketing Agencies",
    leads: "834 leads",
    badge: "Active",
    badgeColor: "bg-[#3B82F6]/20 text-[#60A5FA]",
  },
  {
    dot: "bg-[#F59E0B]",
    icp: "ICP: IT Services",
    leads: "2,103 leads",
    badge: "Warming",
    badgeColor: "bg-[#5A5C66]/20 text-[#8B8D98]",
  },
];

const barHeights = [40, 72, 56, 88];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-[120px] pb-[120px] max-md:pt-[80px] max-md:pb-[80px]">
      {/* Radial gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.06), transparent)",
        }}
      />

      <div className="relative mx-auto flex max-w-[1200px] items-center gap-12 px-6 max-lg:flex-col max-lg:text-center">
        {/* Left column — text */}
        <motion.div
          className="w-full lg:w-[60%]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.p custom={0} variants={fadeUp} className="mono-label mb-5">
            COLD EMAIL INFRASTRUCTURE &amp; OUTBOUND SYSTEMS
          </motion.p>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="font-display text-[36px] leading-[1.1] tracking-tight text-[#EDEEF0] md:text-[56px]"
          >
            Your
            <br />
            pipeline,
            <br />
            engineered.
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mt-6 max-w-[520px] font-body text-[20px] leading-relaxed text-[#8B8D98] max-lg:mx-auto"
          >
            We build and run cold outreach systems that put qualified B2B
            meetings on your calendar&nbsp;&mdash; every week, on autopilot.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="mt-8">
            <Link
              href="/book"
              className="group inline-flex items-center rounded-full bg-[#3B82F6] px-8 py-4 font-body text-[17px] font-semibold text-white transition-all duration-300 hover:scale-[1.04] hover:bg-[#60A5FA] hover:shadow-[0_0_32px_rgba(59,130,246,0.35)]"
            >
              Book a Strategy Call&nbsp;&rarr;
            </Link>
          </motion.div>

          <motion.p
            custom={4}
            variants={fadeUp}
            className="mt-5 font-body text-[14px] text-[#5A5C66]"
          >
            Free 30-minute call&nbsp;&middot; No commitment&nbsp;&middot;
            We&rsquo;ll build your custom outbound plan
          </motion.p>
        </motion.div>

        {/* Right column — mock dashboard */}
        <motion.div
          className="hidden w-full lg:block lg:w-[40%]"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.32, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <div
            className="rounded-2xl border border-[#1E2028] bg-[#111214] p-0 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
            style={{
              transform: "perspective(1000px) rotateY(-2deg) rotateX(1deg)",
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-[#1E2028] px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-[#EF4444]/70" />
              <span className="h-3 w-3 rounded-full bg-[#F59E0B]/70" />
              <span className="h-3 w-3 rounded-full bg-[#22C55E]/70" />
              <span className="ml-3 font-mono text-[11px] text-[#5A5C66]">
                campaigns.coldcrafthq.com
              </span>
            </div>

            {/* Campaign rows */}
            <div className="divide-y divide-[#1E2028] px-5">
              {campaigns.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 py-3.5"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-body text-[13px] font-medium text-[#EDEEF0]">
                        {c.icp}
                      </p>
                      <p className="font-mono text-[11px] text-[#5A5C66]">
                        {c.leads}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${c.badgeColor}`}
                  >
                    {c.badge}
                  </span>
                </div>
              ))}
            </div>

            {/* Mini bar chart */}
            <div className="border-t border-[#1E2028] px-5 pb-5 pt-4">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-[#5A5C66]">
                Meetings This Week
              </p>
              <div className="flex items-end gap-3">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className="w-full rounded-sm bg-[#3B82F6]/80"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-[#5A5C66]">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
