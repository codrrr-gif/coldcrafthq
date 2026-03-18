"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  initial: { y: 40, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const faqs = [
  {
    q: "How long before I start getting meetings?",
    a: "Infrastructure takes 2 weeks to warm up properly (there are no shortcuts here without destroying deliverability). Campaigns launch in week 3. Most clients see their first booked meetings in weeks 3-4, with consistent volume building through month 2.",
  },
  {
    q: "What does the engagement look like day-to-day?",
    a: "We handle everything — infrastructure, data, copy, sending, reply management. You'll get a dedicated Slack channel, weekly performance reports, and bi-weekly strategy calls. When a prospect says \"yes,\" the meeting appears on your calendar. You just show up.",
  },
  {
    q: "What industries do you work with?",
    a: "B2B companies with an offer that sells for $3K+ and a clear ICP. That usually means SaaS, agencies, professional services, consulting, and tech-enabled businesses. If you sell to other businesses and your deal size justifies outbound, we should talk.",
  },
  {
    q: "Do I own the infrastructure you build?",
    a: "Yes. Every domain, mailbox, and sending account is purchased in your name or transferred to you. If we part ways, you keep everything.",
  },
  {
    q: "What makes you different from other agencies?",
    a: "Most agencies use shared sending infrastructure, one data source (usually Apollo), and template copy. We build dedicated infrastructure from scratch, enrich data from 10+ providers with triple verification, and write custom copy per ICP. The difference shows up in deliverability and reply rates.",
  },
  {
    q: "What if it doesn't work?",
    /* TODO: Once you define your actual guarantee/terms, update this answer */
    a: "We'll know within 3-4 weeks whether the campaigns are gaining traction. If we're not seeing positive signals by week 6, we'll have an honest conversation about what's not working and whether it makes sense to continue. We don't lock you into long-term contracts.",
  },
];

function FAQItem({ item, isOpen, toggle }: { item: typeof faqs[0]; isOpen: boolean; toggle: () => void }) {
  return (
    <div className="border-b border-[#1E2028]">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between py-6 text-left group"
        aria-expanded={isOpen}
      >
        <span className="font-body font-medium text-[#EDEEF0] text-base md:text-lg pr-8 group-hover:text-[#60A5FA] transition-colors">
          {item.q}
        </span>
        <span
          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-[#5A5C66] transition-transform duration-300 ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-[#8B8D98] text-base leading-relaxed max-w-[680px]">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="border-t border-[#1E2028]">
      <div className="max-w-[1200px] mx-auto px-6 py-[120px] max-md:py-20">
        <motion.p {...fadeUp} className="font-mono text-xs uppercase tracking-widest text-[#5A5C66] mb-4">
          FAQ
        </motion.p>

        <motion.h2
          {...fadeUp}
          className="font-body font-bold text-3xl md:text-[40px] leading-tight text-[#EDEEF0] mb-12"
        >
          Common questions before booking.
        </motion.h2>

        <motion.div
          initial="initial"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
          }}
          className="max-w-[760px]"
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={{
                initial: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
              }}
            >
              <FAQItem
                item={faq}
                isOpen={openIndex === i}
                toggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
