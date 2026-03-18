import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Book a Strategy Call — ColdCraft HQ",
  description:
    "Pick a time for a free 30-minute strategy call. We'll map out what your outbound system should look like.",
};

export default function BookPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20">
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <h1 className="font-display text-4xl md:text-[56px] leading-[1.1] text-[#EDEEF0] mb-6">
            Let&apos;s talk.
          </h1>

          <p className="text-[#8B8D98] text-lg max-w-[520px] mx-auto mb-12 leading-relaxed">
            Pick a time that works. Come with questions about your market,
            your ICP, and your current pipeline — we&apos;ll come prepared with ideas.
          </p>

          {/* TODO: Replace with your actual Cal.com or Calendly embed code */}
          <div className="w-full min-h-[600px] bg-[#111214] border border-[#1E2028] rounded-2xl flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-[#191B1F] flex items-center justify-center mx-auto mb-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <p className="text-[#8B8D98] text-sm mb-2">Calendar embed goes here</p>
              <p className="text-[#5A5C66] text-xs">
                Add your Cal.com or Calendly embed to replace this placeholder
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
