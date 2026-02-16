"use client";

import { motion } from "framer-motion";

// TODO: Replace with real metrics
const metrics = [
  { value: "3,000+", label: "Meetings Booked" },
  { value: "20+", label: "Active Clients" },
  { value: "42%", label: "Avg Open Rate" },
  { value: "12–18", label: "Meetings/Month Per Client" },
];

// TODO: Replace with real testimonials
const testimonials = [
  {
    quote:
      "ColdCraft booked us 16 meetings in the first month. Our pipeline has never been this full.",
    name: "John D.",
    role: "CEO",
    company: "SaaS Company",
  },
  {
    quote:
      "We went from zero outbound to 14 qualified calls/month. These guys know what they're doing.",
    name: "Sarah M.",
    role: "Founder",
    company: "Marketing Agency",
  },
  {
    quote:
      "Finally an agency that actually delivers. 22 meetings in 30 days.",
    name: "Mike R.",
    role: "VP Sales",
    company: "Tech Company",
  },
];

export default function Results() {
  return (
    <section id="results" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Results That Speak
        </motion.h2>

        {/* Metrics */}
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-xl border border-border bg-surface p-6 text-center"
            >
              <p className="text-3xl font-bold text-accent sm:text-4xl">
                {metric.value}
              </p>
              <p className="mt-2 text-sm text-text-secondary">{metric.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="rounded-xl border border-border bg-surface p-8"
            >
              {/* Quote mark */}
              <svg
                className="mb-4 h-8 w-8 text-primary/40"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
              </svg>
              <p className="mb-6 leading-relaxed text-text-secondary">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-text-secondary">
                  {t.role} @ {t.company}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
