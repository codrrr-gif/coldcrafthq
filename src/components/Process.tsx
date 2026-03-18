"use client";

import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const steps = [
  {
    number: "01",
    title: "Strategy Call",
    description:
      "We dig into your offer, your ICP, your competitive landscape, and what you've tried before. If there's a fit, we scope the build.",
    timeline: "Day 1",
  },
  {
    number: "02",
    title: "Infrastructure Build",
    description:
      "We purchase domains, configure DNS, set up mailboxes, and begin warmup. You own all the infrastructure.",
    timeline: "Week 1-2",
  },
  {
    number: "03",
    title: "Targeting & Copy",
    description:
      "We map your TAM, enrich and verify contacts, write personalized sequences, and prepare campaign logic.",
    timeline: "Week 2-3",
  },
  {
    number: "04",
    title: "Launch & Optimize",
    description:
      "Campaigns go live. We manage replies, A/B test relentlessly, and push qualified meetings to your calendar.",
    timeline: "Week 3+",
  },
];

export default function Process() {
  return (
    <section id="how-it-works" className="relative bg-[#08090A]">
      {/* Keyframe animation for traveling dots */}
      <style jsx>{`
        @keyframes travelHorizontal {
          0% {
            left: 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }
        @keyframes travelVertical {
          0% {
            top: 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        .dot-horizontal {
          animation: travelHorizontal 3s linear infinite;
        }
        .dot-horizontal-delayed {
          animation: travelHorizontal 3s linear infinite 1.5s;
        }
        .dot-vertical {
          animation: travelVertical 3s linear infinite;
        }
        .dot-vertical-delayed {
          animation: travelVertical 3s linear infinite 1.5s;
        }
      `}</style>

      {/* Section divider */}
      <div className="w-full h-px bg-[#1E2028]" />

      <div className="py-20 lg:py-[120px]">
        <div className="mx-auto max-w-[1200px] px-6">
          {/* Header */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-20"
          >
            <motion.p
              variants={fadeUp}
              className="font-mono text-xs uppercase tracking-widest text-[#5A5C66] mb-4"
            >
              The Process
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-body text-3xl md:text-4xl lg:text-5xl font-bold text-[#EDEEF0] mb-6 max-w-3xl mx-auto leading-tight"
            >
              Live in 3 weeks. Meetings in 4.
            </motion.h2>
          </motion.div>

          {/* Desktop Timeline — Horizontal */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="hidden lg:block"
          >
            {/* Timeline container */}
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute top-[52px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px bg-[#1E2028]">
                {/* Animated dots */}
                <div className="relative w-full h-full overflow-hidden">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#3B82F6] dot-horizontal"
                    style={{ opacity: 0 }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#3B82F6] dot-horizontal-delayed"
                    style={{ opacity: 0 }}
                  />
                </div>
              </div>

              {/* Steps grid */}
              <div className="grid grid-cols-4 gap-8">
                {steps.map((step) => (
                  <motion.div
                    key={step.number}
                    variants={fadeUp}
                    className="text-center"
                  >
                    {/* Number circle */}
                    <div className="mx-auto w-[104px] h-[104px] rounded-full border border-[#1E2028] bg-[#111214] flex items-center justify-center mb-8 relative z-10">
                      <span className="font-mono text-2xl font-bold text-[#3B82F6]">
                        {step.number}
                      </span>
                    </div>

                    {/* Content */}
                    <h3 className="font-body text-lg font-bold text-[#EDEEF0] mb-3">
                      {step.title}
                    </h3>
                    <p className="text-[#8B8D98] text-sm leading-relaxed mb-4 max-w-[240px] mx-auto">
                      {step.description}
                    </p>

                    {/* Timeline pill badge */}
                    <span className="inline-block font-mono text-xs font-medium text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-full px-3 py-1">
                      {step.timeline}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Mobile Timeline — Vertical */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="lg:hidden"
          >
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute top-0 bottom-0 left-[31px] w-px bg-[#1E2028]">
                <div className="relative w-full h-full overflow-hidden">
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#3B82F6] dot-vertical"
                    style={{ opacity: 0 }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#3B82F6] dot-vertical-delayed"
                    style={{ opacity: 0 }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-12">
                {steps.map((step) => (
                  <motion.div
                    key={step.number}
                    variants={fadeUp}
                    className="flex gap-6"
                  >
                    {/* Number circle */}
                    <div className="w-16 h-16 rounded-full border border-[#1E2028] bg-[#111214] flex items-center justify-center flex-shrink-0 relative z-10">
                      <span className="font-mono text-lg font-bold text-[#3B82F6]">
                        {step.number}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="pt-2">
                      <h3 className="font-body text-lg font-bold text-[#EDEEF0] mb-2">
                        {step.title}
                      </h3>
                      <p className="text-[#8B8D98] text-sm leading-relaxed mb-3">
                        {step.description}
                      </p>
                      <span className="inline-block font-mono text-xs font-medium text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-full px-3 py-1">
                        {step.timeline}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
