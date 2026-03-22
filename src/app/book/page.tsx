import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingEmbed from "@/components/BookingEmbed";

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

          <div className="w-full">
            <BookingEmbed />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
