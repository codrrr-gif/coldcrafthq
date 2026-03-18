"use client";

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

/* ------------------------------------------------------------------ */
/*  Card mock-up sub-components                                       */
/* ------------------------------------------------------------------ */

function SpamMock() {
  return (
    <div className="mb-5 rounded-xl border border-[#1E2028] bg-[#08090A] p-4">
      {/* Stacked bar */}
      <div className="mb-3 flex h-4 w-full overflow-hidden rounded-full">
        <div className="h-full bg-[#5A5C66]/50" style={{ width: "62%" }} />
        <div className="h-full bg-[#EF4444]/60" style={{ width: "23%" }} />
        <div className="h-full bg-[#EF4444]/30" style={{ width: "15%" }} />
      </div>
      <div className="space-y-1 font-mono text-[11px]">
        <p className="text-[#EF4444]">
          Inbox placement: <span className="font-semibold">62%</span>
        </p>
        <p className="text-[#EF4444]">
          Spam rate: <span className="font-semibold">23%</span>
        </p>
        <p className="text-[#EF4444]">
          Bounce rate: <span className="font-semibold">15%</span>
        </p>
      </div>
    </div>
  );
}

function TargetingMock() {
  return (
    <div className="mb-5 rounded-xl border border-[#1E2028] bg-[#08090A] p-4">
      {/* Search bar */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#1E2028] bg-[#111214] px-3 py-2">
        <svg
          className="h-4 w-4 shrink-0 text-[#5A5C66]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <span className="truncate font-body text-[12px] text-[#8B8D98]">
          VP of Sales, SaaS, 50-200 employees
        </span>
      </div>
      {/* Empty state */}
      <div className="flex flex-col items-center py-2">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-[#2A2D38]">
          <svg
            className="h-5 w-5 text-[#5A5C66]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0"
            />
          </svg>
        </div>
        <p className="text-center font-mono text-[11px] leading-relaxed text-[#5A5C66]">
          23 results found&nbsp;&mdash; 19 outdated,
          <br />4 missing email
        </p>
      </div>
    </div>
  );
}

function CopyMock() {
  return (
    <div className="mb-5 rounded-xl border border-[#1E2028] bg-[#08090A] p-4">
      <div className="space-y-1.5 font-mono text-[11px]">
        <p className="text-[#5A5C66]">
          From:{" "}
          <span className="text-[#8B8D98]">outreach@company.com</span>
        </p>
        <p className="text-[#5A5C66]">
          Subject:{" "}
          <span className="text-[#8B8D98]">&ldquo;Quick question&rdquo;</span>
        </p>
      </div>
      <div className="mt-3 rounded-lg border border-[#1E2028] bg-[#111214] px-3 py-2.5">
        <p className="font-body text-[11px] leading-relaxed text-[#5A5C66]">
          Hi &#123;&#123;First Name&#125;&#125;, I noticed your company is
          growing fast. I&rsquo;d love to set up a quick 15-min call to show
          you how we can help. Are you free Thursday?
        </p>
      </div>
      <div className="mt-3 flex items-center gap-4 font-mono text-[11px]">
        <p className="text-[#EF4444]">
          Reply rate: <span className="font-semibold">0.8%</span>
        </p>
        <p className="text-[#EF4444]">
          Meetings: <span className="font-semibold">0</span>
        </p>
      </div>
    </div>
  );
}

function BurnedMock() {
  return (
    <div className="mb-5 rounded-xl border border-[#1E2028] bg-[#08090A] p-4">
      <div className="space-y-3">
        {/* You */}
        <div className="flex gap-2">
          <span className="mt-0.5 h-5 w-5 shrink-0 rounded-md bg-[#3B82F6]/20 text-center font-mono text-[10px] leading-5 text-[#60A5FA]">
            Y
          </span>
          <div className="rounded-lg rounded-tl-none bg-[#191B1F] px-3 py-2">
            <p className="font-body text-[11px] text-[#EDEEF0]">
              Hey, what&rsquo;s the status on campaigns?
            </p>
          </div>
        </div>
        {/* Agency */}
        <div className="flex gap-2">
          <span className="mt-0.5 h-5 w-5 shrink-0 rounded-md bg-[#F59E0B]/20 text-center font-mono text-[10px] leading-5 text-[#F59E0B]">
            A
          </span>
          <div className="rounded-lg rounded-tl-none bg-[#191B1F] px-3 py-2">
            <p className="font-body text-[11px] text-[#EDEEF0]">
              We&rsquo;re still optimizing! Should see results soon
              &#128077;
            </p>
          </div>
        </div>
        {/* You */}
        <div className="flex gap-2">
          <span className="mt-0.5 h-5 w-5 shrink-0 rounded-md bg-[#3B82F6]/20 text-center font-mono text-[10px] leading-5 text-[#60A5FA]">
            Y
          </span>
          <div className="rounded-lg rounded-tl-none bg-[#191B1F] px-3 py-2">
            <p className="font-body text-[11px] text-[#EDEEF0]">
              You said that 6 weeks ago&hellip;
            </p>
          </div>
        </div>
        {/* Typing indicator */}
        <div className="flex gap-2">
          <span className="mt-0.5 h-5 w-5 shrink-0 rounded-md bg-[#F59E0B]/20 text-center font-mono text-[10px] leading-5 text-[#F59E0B]">
            A
          </span>
          <div className="flex items-center gap-1 rounded-lg rounded-tl-none bg-[#191B1F] px-3 py-2.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5A5C66]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5A5C66] [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5A5C66] [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card data                                                         */
/* ------------------------------------------------------------------ */

const cards: {
  title: string;
  desc: string;
  mock: React.ReactNode;
}[] = [
  {
    title: "Your emails land in spam",
    desc: "Poor infrastructure, lazy DNS setup, and shared IP warmup pools mean your emails never reach the primary inbox.",
    mock: <SpamMock />,
  },
  {
    title: "Your targeting is a shot in the dark",
    desc: "Scraping Apollo or LinkedIn Sales Nav gives you stale data, bad emails, and zero intent signals. Garbage in, garbage out.",
    mock: <TargetingMock />,
  },
  {
    title: "Your copy sounds like everyone else",
    desc: "Generic templates and ChatGPT copy get ignored. Your prospects receive 47 of these a day. Yours needs to be the one that doesn\u2019t sound like the other 46.",
    mock: <CopyMock />,
  },
  {
    title: "You\u2019ve been burned before",
    desc: "The last agency promised 30 meetings a month and delivered excuses. You\u2019re paying $3K/month for a weekly report that says \u2018we\u2019re testing.\u2019",
    mock: <BurnedMock />,
  },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function PainPoints() {
  return (
    <section className="border-t border-[#1E2028]">
      <div className="mx-auto max-w-[1200px] px-6 pt-[120px] pb-[120px] max-md:pt-[80px] max-md:pb-[80px]">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mb-16 max-w-[680px] max-md:mx-auto max-md:text-center"
        >
          <motion.p custom={0} variants={fadeUp} className="mono-label mb-5">
            THE PROBLEM
          </motion.p>

          <motion.h2
            custom={1}
            variants={fadeUp}
            className="font-body text-[28px] font-bold leading-tight text-[#EDEEF0] md:text-[40px]"
          >
            Outbound is broken for most B2B companies.
          </motion.h2>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mt-5 font-body text-[18px] leading-relaxed text-[#8B8D98]"
          >
            You know cold outreach works. You&rsquo;ve seen competitors fill
            their pipeline with it. But when you try it yourself&nbsp;&mdash; or
            hire someone to do it&nbsp;&mdash; the results are empty.
          </motion.p>
        </motion.div>

        {/* 2x2 grid */}
        <motion.div
          className="grid gap-6 sm:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              custom={i}
              variants={fadeUp}
              className="group rounded-2xl border border-[#1E2028] bg-[#111214] p-8 transition-colors duration-300 hover:border-[#2A2D38] hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
            >
              {card.mock}

              <h3 className="mb-2 font-body text-[18px] font-semibold text-[#EDEEF0]">
                {card.title}
              </h3>
              <p className="font-body text-[14px] leading-relaxed text-[#8B8D98]">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Transitional text */}
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
          className="mx-auto mt-20 max-w-[640px] text-center font-body text-[20px] italic leading-relaxed text-[#8B8D98]"
        >
          The problem isn&rsquo;t cold email. The problem is how it&rsquo;s
          being done.
        </motion.p>
      </div>
    </section>
  );
}
