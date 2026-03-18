"use client";

import { motion } from "framer-motion";
import {
  Server,
  Target,
  PenLine,
  Share2,
  Zap,
  BarChart3,
} from "lucide-react";

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

const stages = [
  {
    number: "01",
    title: "Infrastructure",
    items: ["Domains", "Mailboxes", "DNS/DMARC", "Warmup", "Monitoring"],
  },
  {
    number: "02",
    title: "Targeting",
    items: [
      "ICP mapping",
      "Data enriched",
      "Triple verify",
      "Intent signals",
      "Scoring",
    ],
  },
  {
    number: "03",
    title: "Campaigns",
    items: [
      "Copy written",
      "A/B testing",
      "Multi-channel",
      "Optimization",
      "Deliverability",
    ],
  },
  {
    number: "04",
    title: "Meetings",
    items: [
      "Replies managed",
      "Calls booked",
      "CRM synced",
      "Reports sent",
      "Optimization",
    ],
  },
];

const detailCards = [
  {
    icon: Server,
    title: "Email Infrastructure",
    description:
      "We purchase, authenticate, and warm 60+ domains and 120+ mailboxes for you. Custom DNS. Dedicated IPs. You own everything.",
  },
  {
    icon: Target,
    title: "ICP Research & TAM Mapping",
    description:
      "We map your total addressable market using 10+ data sources — not just LinkedIn. Triple-verified emails. Sub-2% bounce rate guaranteed.",
  },
  {
    icon: PenLine,
    title: "Campaign Copywriting",
    description:
      "Every sequence is written by cold email specialists. Personalized angles. A/B tested hooks. No templates, no ChatGPT slop.",
  },
  {
    icon: Share2,
    title: "Multi-Channel Sequencing",
    description:
      "Email, LinkedIn, and coordinated follow-ups timed to maximize touchpoints without burning your audience.",
  },
  {
    icon: Zap,
    title: "Intent Signal Tracking",
    description:
      "Job changes, funding events, tech stack shifts, hiring surges — we trigger outreach when prospects are most likely to respond.",
  },
  {
    icon: BarChart3,
    title: "Analytics & CRM Sync",
    description:
      "Full reporting dashboard. Every reply categorized. Interested leads pushed to your CRM automatically.",
  },
];

export default function System() {
  return (
    <section id="what-we-build" className="relative bg-[#08090A]">
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
              The System
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-body text-3xl md:text-4xl lg:text-5xl font-bold text-[#EDEEF0] mb-6 max-w-3xl mx-auto leading-tight"
            >
              A complete outbound engine, built from scratch for your business.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-[#8B8D98] text-lg max-w-2xl mx-auto leading-relaxed"
            >
              We don&apos;t bolt campaigns onto broken infrastructure. We build
              the entire system — sending infrastructure, data pipeline,
              targeting logic, and copy — then run it for you.
            </motion.p>
          </motion.div>

          {/* System Map — 4 Stage Cards */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col lg:flex-row items-stretch justify-center gap-0 mb-24"
          >
            {stages.map((stage, i) => (
              <div key={stage.number} className="flex flex-col lg:flex-row items-center">
                {/* Stage card */}
                <motion.div
                  variants={fadeUp}
                  className="bg-[#111214] border border-[#1E2028] border-t-2 border-t-[#3B82F6] rounded-2xl p-6 w-full lg:w-[260px] flex-shrink-0"
                >
                  <p className="font-mono text-2xl font-bold text-[#3B82F6] mb-3">
                    {stage.number}
                  </p>
                  <h3 className="font-body text-lg font-bold text-[#EDEEF0] mb-4">
                    {stage.title}
                  </h3>
                  <ul className="space-y-2">
                    {stage.items.map((item) => (
                      <li
                        key={item}
                        className="text-[#8B8D98] text-sm flex items-center gap-2"
                      >
                        <span className="w-1 h-1 rounded-full bg-[#3B82F6] flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Connector arrow between cards */}
                {i < stages.length - 1 && (
                  <>
                    {/* Desktop: horizontal dashed line + arrow */}
                    <div className="hidden lg:flex items-center px-3 flex-shrink-0">
                      <div className="w-8 border-t border-dashed border-[#2A2D38]" />
                      <span className="text-[#3B82F6] text-sm mx-1 select-none">
                        &rarr;
                      </span>
                      <div className="w-8 border-t border-dashed border-[#2A2D38]" />
                    </div>
                    {/* Mobile: vertical dashed line + arrow */}
                    <div className="flex lg:hidden flex-col items-center py-3 flex-shrink-0">
                      <div className="h-6 border-l border-dashed border-[#2A2D38]" />
                      <span className="text-[#3B82F6] text-sm my-1 select-none">
                        &darr;
                      </span>
                      <div className="h-6 border-l border-dashed border-[#2A2D38]" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </motion.div>

          {/* Detail Cards — 3 col grid */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {detailCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  variants={fadeUp}
                  whileHover={{
                    y: -2,
                    borderColor: "#2A2D38",
                    transition: { duration: 0.2 },
                  }}
                  className="bg-[#111214] border border-[#1E2028] rounded-2xl p-6 cursor-default transition-colors"
                >
                  <Icon
                    size={24}
                    className="text-[#3B82F6] mb-4"
                    strokeWidth={1.5}
                  />
                  <h3 className="font-body text-base font-bold text-[#EDEEF0] mb-2">
                    {card.title}
                  </h3>
                  <p className="text-[#8B8D98] text-sm leading-relaxed">
                    {card.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
