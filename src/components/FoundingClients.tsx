"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { y: 40, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const slots = [
  {
    status: "taken",
    label: "B2B SaaS — ICP: Mid-Market",
  },
  {
    status: "taken",
    label: "Professional Services — ICP: Enterprise",
  },
  {
    status: "open",
    label: "Your company?",
  },
];

export default function FoundingClients() {
  return (
    <section className="border-t border-[#1E2028] relative">
      <div className="max-w-[1200px] mx-auto px-6 py-[120px] max-md:py-20">
        <motion.p {...fadeUp} className="font-mono text-xs uppercase tracking-widest text-[#5A5C66] mb-4">
          WHY WE EXIST
        </motion.p>

        <motion.h2
          {...fadeUp}
          className="font-body font-bold text-3xl md:text-[40px] leading-tight text-[#EDEEF0] mb-8"
        >
          Cold email works. The way most people do it doesn&apos;t.
        </motion.h2>

        {/* Belief / Manifesto */}
        <motion.div
          {...fadeUp}
          className="max-w-[640px] text-[#8B8D98] text-lg leading-relaxed space-y-6 mb-16"
        >
          <p>
            Most outbound fails because it&apos;s treated like a volume game — blast 10,000
            generic emails and pray. We treat it like engineering. The infrastructure,
            the data, the targeting, the copy — each layer is a system. Build them
            right and outbound becomes the most predictable revenue channel you have.
            Build them wrong and you&apos;re just paying to burn your domain.
          </p>
          <p>
            That&apos;s why we build everything from scratch for every client. No shared
            infrastructure. No recycled templates. No shortcuts that save us time
            and cost you deliverability.
          </p>
        </motion.div>

        {/* Divider */}
        <div className="border-t border-[#1E2028] mb-16" />

        {/* Founding client slots */}
        <motion.h3
          {...fadeUp}
          className="font-body font-bold text-2xl md:text-3xl text-[#EDEEF0] mb-4 text-center"
        >
          We&apos;re taking on 3 new clients this month.
        </motion.h3>

        <motion.p
          {...fadeUp}
          className="text-[#8B8D98] text-base max-w-[600px] mx-auto text-center mb-12"
        >
          ColdCraft is deliberately small. Every engagement gets senior-level
          attention — not a junior account manager reading from a script.
        </motion.p>

        {/* Slots */}
        <motion.div
          initial="initial"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="max-w-[640px] mx-auto space-y-3 mb-12"
        >
          {slots.map((slot, i) => (
            <motion.div
              key={i}
              variants={{
                initial: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
              }}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all duration-200 ${
                slot.status === "open"
                  ? "bg-[#111214] border-[#3B82F6]/40 shadow-[0_0_24px_rgba(59,130,246,0.1)]"
                  : "bg-[#111214]/50 border-[#1E2028] opacity-60"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  slot.status === "open"
                    ? "bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    : "bg-[#5A5C66]"
                }`}
              />
              <span
                className={`font-mono text-xs uppercase tracking-wider ${
                  slot.status === "open" ? "text-[#EDEEF0]" : "text-[#5A5C66]"
                }`}
              >
                {slot.status === "taken" ? "Taken" : "Open"}
              </span>
              <span
                className={`text-sm font-body ${
                  slot.status === "open" ? "text-[#EDEEF0]" : "text-[#5A5C66]"
                }`}
              >
                {slot.label}
              </span>
              {slot.status === "open" && (
                <span className="ml-auto text-[#3B82F6] text-sm">→</span>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* TODO: Update these slots as you actually fill client spots. Once you have 5+ real testimonials, add a testimonials section after this one. */}

        <motion.div {...fadeUp} className="text-center">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-[#3B82F6] hover:bg-[#60A5FA] text-white font-body font-medium px-8 py-3.5 rounded-full text-base transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(59,130,246,0.3)]"
          >
            Claim Your Spot
            <span>→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
