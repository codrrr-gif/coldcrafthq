"use client";

import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as const,
      delay: i * 0.08,
    },
  }),
};

function CheckIcon() {
  return (
    <span className="font-body text-xs font-bold" style={{ color: "#22C55E" }}>
      ✓
    </span>
  );
}

function StatusRow({
  label,
  value,
  check,
}: {
  label: string;
  value: string;
  check?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between border-b py-2.5"
      style={{ borderColor: "#1E2028" }}
    >
      <span className="font-body text-xs" style={{ color: "#8B8D98" }}>
        {label}
      </span>
      <span className="flex items-center gap-1.5 font-body text-xs font-medium" style={{ color: "#EDEEF0" }}>
        {value}
        {check && <CheckIcon />}
      </span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between border-b py-2.5"
      style={{ borderColor: "#1E2028" }}
    >
      <span className="font-body text-xs" style={{ color: "#8B8D98" }}>
        {label}
      </span>
      <span className="font-mono text-xs font-medium" style={{ color: "#EDEEF0" }}>
        {value}
      </span>
    </div>
  );
}

function InfrastructureCard() {
  return (
    <div
      className="group rounded-2xl border p-6 transition-colors hover:border-[#2A2D38]"
      style={{
        backgroundColor: "#111214",
        borderColor: "#1E2028",
      }}
    >
      <h3
        className="font-body text-lg font-bold"
        style={{ color: "#EDEEF0" }}
      >
        Your Sending Infrastructure
      </h3>

      <div
        className="mt-5 rounded-xl border p-4"
        style={{ backgroundColor: "#08090A", borderColor: "#1E2028" }}
      >
        {/* Top stats */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "#1E2028" }}>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#5A5C66" }}>Domains</p>
            <p className="font-mono text-sm font-bold" style={{ color: "#EDEEF0" }}>64 <span style={{ color: "#22C55E" }} className="text-xs font-normal">active</span></p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#5A5C66" }}>Mailboxes</p>
            <p className="font-mono text-sm font-bold" style={{ color: "#EDEEF0" }}>128 <span style={{ color: "#8B8D98" }} className="text-xs font-normal">configured</span></p>
          </div>
        </div>

        {/* Status rows */}
        <div className="mt-1">
          <StatusRow label="Inbox Placement" value="98.2%" check />
          <StatusRow label="Warmup Score" value="9.4/10" check />
          <StatusRow label="Blacklist Status" value="Clear" check />
          <StatusRow label="DNS/DMARC" value="Pass" check />
        </div>

        <p className="mt-3 font-mono text-[10px]" style={{ color: "#5A5C66" }}>
          Last checked: 2 hours ago
        </p>
      </div>
    </div>
  );
}

function LeadPipelineCard() {
  return (
    <div
      className="group rounded-2xl border p-6 transition-colors hover:border-[#2A2D38]"
      style={{
        backgroundColor: "#111214",
        borderColor: "#1E2028",
      }}
    >
      <h3
        className="font-body text-lg font-bold"
        style={{ color: "#EDEEF0" }}
      >
        Your Verified Lead Pipeline
      </h3>

      <div
        className="mt-5 rounded-xl border p-4"
        style={{ backgroundColor: "#08090A", borderColor: "#1E2028" }}
      >
        {/* Target header */}
        <div className="pb-3 border-b" style={{ borderColor: "#1E2028" }}>
          <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#5A5C66" }}>Target</p>
          <p className="font-body text-xs font-medium mt-0.5" style={{ color: "#EDEEF0" }}>VP Sales, SaaS, 50-500 emp</p>
        </div>

        {/* Stats */}
        <div className="mt-1">
          <StatRow label="Total leads found" value="4,271" />
          <StatRow label="Email verified" value="3,847" />
          <StatRow label="Bounce risk < 2%" value="3,812" />
          <StatRow label="Intent signal match" value="891" />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="font-mono text-[10px]" style={{ color: "#5A5C66" }}>
            Sources: 12 providers enriched
          </p>
          <p className="font-mono text-[10px]" style={{ color: "#5A5C66" }}>
            Last updated: Today
          </p>
        </div>
      </div>
    </div>
  );
}

function CampaignPerformanceCard() {
  const bars = [
    { label: "Wk 1", height: "40%" },
    { label: "Wk 2", height: "65%" },
    { label: "Wk 3", height: "85%" },
    { label: "Wk 4", height: "55%" },
  ];

  return (
    <div
      className="group rounded-2xl border p-6 transition-colors hover:border-[#2A2D38]"
      style={{
        backgroundColor: "#111214",
        borderColor: "#1E2028",
      }}
    >
      <h3
        className="font-body text-lg font-bold"
        style={{ color: "#EDEEF0" }}
      >
        Your Campaign Performance
      </h3>

      <div
        className="mt-5 rounded-xl border p-4"
        style={{ backgroundColor: "#08090A", borderColor: "#1E2028" }}
      >
        {/* Campaign header */}
        <div className="pb-3 border-b" style={{ borderColor: "#1E2028" }}>
          <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#5A5C66" }}>Campaign</p>
          <p className="font-body text-xs font-medium mt-0.5" style={{ color: "#EDEEF0" }}>Q1 Outbound — Series A</p>
        </div>

        {/* Stats */}
        <div className="mt-1">
          <StatRow label="Sent" value="2,847" />
          <StatRow label="Opened" value="1,394 (49%)" />
          <StatRow label="Replied" value="187 (6.6%)" />
          <StatRow label="Interested" value="43" />
          <StatRow label="Meetings booked" value="18" />
        </div>

        {/* Mini bar chart */}
        <div className="mt-4 flex items-end gap-2" style={{ height: 48 }}>
          {bars.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm"
                style={{
                  backgroundColor: "#3B82F6",
                  height: bar.height,
                  minHeight: 4,
                }}
              />
              <span className="font-mono text-[9px]" style={{ color: "#5A5C66" }}>
                {bar.label}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-3 font-mono text-[10px]" style={{ color: "#5A5C66" }}>
          Status: Optimizing Sequence B
        </p>
      </div>
    </div>
  );
}

export default function Deliverables() {
  return (
    <section
      className="border-t py-20 lg:py-[120px]"
      style={{ borderColor: "#1E2028" }}
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <motion.p
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "#5A5C66" }}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          custom={0}
        >
          WHAT YOU GET
        </motion.p>

        <motion.h2
          className="font-body mt-4 text-3xl font-bold leading-tight md:text-[40px] md:leading-[1.15]"
          style={{ color: "#EDEEF0" }}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          custom={1}
        >
          The deliverables behind every engagement.
        </motion.h2>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            custom={2}
          >
            <InfrastructureCard />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            custom={3}
          >
            <LeadPipelineCard />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            custom={4}
          >
            <CampaignPerformanceCard />
          </motion.div>
        </div>

        <motion.p
          className="mt-10 text-center font-body"
          style={{ color: "#5A5C66", fontSize: 13 }}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          custom={5}
        >
          Illustrative dashboards. Actual metrics vary by market, offer, and ICP.
        </motion.p>
      </div>
    </section>
  );
}
