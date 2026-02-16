"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Strategy Call",
    description:
      "We learn your offer, ICP, and goals. If we're a fit, we build your custom outbound plan.",
  },
  {
    number: "02",
    title: "Infrastructure Build",
    description:
      "We set up domains, mailboxes, DNS, and warm everything up. Takes ~14 days.",
  },
  {
    number: "03",
    title: "Campaign Launch",
    description:
      "We source leads, write copy, and launch targeted campaigns. You start seeing replies in week 3.",
  },
  {
    number: "04",
    title: "Meetings on Your Calendar",
    description:
      "Qualified prospects book directly on your calendar. You just show up and close.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-24">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(79,70,229,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
        >
          How It Works
        </motion.h2>

        <div className="mt-16 grid gap-8 md:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="relative text-center"
            >
              {/* Connector line (hidden on last item and mobile) */}
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+40px)] top-8 hidden h-px w-[calc(100%-80px)] bg-gradient-to-r from-primary/40 to-primary/10 md:block" />
              )}

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-xl font-bold text-primary">
                {step.number}
              </div>
              <h3 className="mb-3 text-lg font-semibold">{step.title}</h3>
              <p className="leading-relaxed text-text-secondary">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
