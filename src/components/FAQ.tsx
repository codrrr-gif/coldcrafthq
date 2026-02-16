"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    q: "How long before I see results?",
    a: "Infrastructure setup takes about 2 weeks. Campaigns launch in week 3. Most clients see their first booked meetings by week 3-4.",
  },
  {
    q: "Do you guarantee results?",
    a: "We don't guarantee specific numbers because every market is different. But we optimize relentlessly and most clients see 12-18 qualified meetings per month within 60 days.",
  },
  {
    q: "What industries do you work with?",
    a: "We work with B2B companies — SaaS, agencies, professional services, consulting, and tech-enabled businesses. If you sell to other businesses, we can likely help.",
  },
  {
    q: "Do I need to provide leads?",
    a: "No. We handle everything — sourcing, verification, enrichment, and list building. You just tell us who your ideal customer is.",
  },
  {
    q: "What tools do you use?",
    a: "We use a proprietary stack of best-in-class tools for sending, warmup, deliverability monitoring, lead sourcing, and CRM integration. We'll walk you through everything on our strategy call.",
  },
  {
    q: "What if I've been burned by agencies before?",
    a: "We get it. That's why we're transparent about our process, timelines, and what realistic results look like. We don't overpromise — we overdeliver.",
  },
];

function FAQItem({ faq, index }: { faq: (typeof faqs)[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="border-b border-border"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-4 font-semibold">{faq.q}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 leading-relaxed text-text-secondary">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="relative px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Questions? We&apos;ve Got Answers.
        </motion.h2>

        <div className="mt-12">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
