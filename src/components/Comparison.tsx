"use client";

import { useState } from "react";
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

const columns = ["ColdCraft HQ", "DIY / In-House", "Typical Agency"] as const;

interface ComparisonRow {
  label: string;
  values: [string, string, string];
}

const rows: ComparisonRow[] = [
  {
    label: "Infrastructure",
    values: [
      "60+ domains, 120+ mailboxes built from scratch",
      "You figure it out (or your SDR does)",
      "Shared sending pools",
    ],
  },
  {
    label: "Data quality",
    values: [
      "10+ sources, triple-verified, <2% bounce",
      "Apollo/LinkedIn scrape, 8-15% bounce",
      "Single database pull",
    ],
  },
  {
    label: "Copywriting",
    values: [
      "Specialist-written, A/B tested per ICP",
      "Marketing intern or ChatGPT",
      "Template library",
    ],
  },
  {
    label: "Time to results",
    values: ["3-4 weeks", "3-6 months (if ever)", "6-8 weeks"],
  },
  {
    label: "Monthly cost",
    values: [
      "Predictable retainer",
      "SDR salary: $5-8K + tools: $2-3K",
      "$3-5K + lock-in contract",
    ],
  },
  {
    label: "You own the infra",
    values: [
      "✓ Yes — domains and mailboxes are yours",
      "✓ Yes",
      "✗ Usually not",
    ],
  },
  {
    label: "Deliverability focus",
    values: [
      "✓ Dedicated monitoring + rotation",
      "✗ Hope for the best",
      "⚠ Basic warmup only",
    ],
  },
  {
    label: "Accountability",
    values: [
      "Weekly reports + bi-weekly calls",
      "None (they report to themselves)",
      "Monthly call + PDF",
    ],
  },
];

function styleMark(text: string) {
  if (text.startsWith("✓")) {
    return (
      <>
        <span style={{ color: "#22C55E" }}>✓</span>
        {text.slice(1)}
      </>
    );
  }
  if (text.startsWith("✗")) {
    return (
      <>
        <span style={{ color: "#5A5C66" }}>✗</span>
        {text.slice(1)}
      </>
    );
  }
  if (text.startsWith("⚠")) {
    return (
      <>
        <span style={{ color: "#F59E0B" }}>⚠</span>
        {text.slice(1)}
      </>
    );
  }
  return text;
}

export default function Comparison() {
  const [activeTab, setActiveTab] = useState(0);

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
          THE COMPARISON
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
          Three ways to do outbound. Only one that works at scale without
          burning your team.
        </motion.h2>

        {/* Desktop table */}
        <motion.div
          className="mt-14 hidden lg:block"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          custom={2}
        >
          {/* Column headers */}
          <div className="grid grid-cols-[220px_1fr_1fr_1fr] gap-0">
            <div />
            {columns.map((col, i) => (
              <div
                key={col}
                className={`px-5 pb-4 pt-5 text-center font-body text-sm font-bold ${
                  i === 0 ? "rounded-t-xl" : ""
                }`}
                style={{
                  color: i === 0 ? "#EDEEF0" : "#8B8D98",
                  backgroundColor: i === 0 ? "#111214" : "transparent",
                  borderTop: i === 0 ? "2px solid #3B82F6" : "none",
                }}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row, rowIdx) => (
            <div
              key={row.label}
              className="grid grid-cols-[220px_1fr_1fr_1fr] gap-0 border-b"
              style={{ borderColor: "#1E2028" }}
            >
              <div
                className="flex items-center px-2 py-4 font-body text-sm font-bold"
                style={{ color: "#8B8D98" }}
              >
                {row.label}
              </div>
              {row.values.map((val, colIdx) => (
                <div
                  key={colIdx}
                  className={`flex items-center px-5 py-4 font-body text-sm ${
                    colIdx === 0 ? "" : ""
                  } ${
                    rowIdx === rows.length - 1 && colIdx === 0
                      ? "rounded-b-xl"
                      : ""
                  }`}
                  style={{
                    color: colIdx === 0 ? "#EDEEF0" : "#8B8D98",
                    backgroundColor:
                      colIdx === 0 ? "#111214" : "transparent",
                  }}
                >
                  {styleMark(val)}
                </div>
              ))}
            </div>
          ))}
        </motion.div>

        {/* Mobile tabs */}
        <motion.div
          className="mt-10 lg:hidden"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          custom={2}
        >
          {/* Tab buttons */}
          <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "#111214" }}>
            {columns.map((col, i) => (
              <button
                key={col}
                onClick={() => setActiveTab(i)}
                className="flex-1 rounded-md px-3 py-2.5 font-body text-xs font-bold transition-colors"
                style={{
                  color: activeTab === i ? "#EDEEF0" : "#5A5C66",
                  backgroundColor:
                    activeTab === i ? "#191B1F" : "transparent",
                  borderTop:
                    activeTab === i && i === 0
                      ? "2px solid #3B82F6"
                      : activeTab === i
                      ? "2px solid #2A2D38"
                      : "2px solid transparent",
                }}
              >
                {col}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-6 space-y-0">
            {rows.map((row) => (
              <div
                key={row.label}
                className="border-b px-1 py-4"
                style={{ borderColor: "#1E2028" }}
              >
                <p
                  className="font-body text-xs font-bold uppercase tracking-wide"
                  style={{ color: "#8B8D98" }}
                >
                  {row.label}
                </p>
                <p
                  className="mt-1.5 font-body text-sm leading-relaxed"
                  style={{
                    color:
                      activeTab === 0 ? "#EDEEF0" : "#8B8D98",
                  }}
                >
                  {styleMark(row.values[activeTab])}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
