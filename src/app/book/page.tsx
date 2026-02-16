import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Book a Strategy Call — ColdCraft HQ",
  description:
    "Pick a time that works. We'll come prepared with ideas for your business.",
};

export default function BookPage() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center px-6 pt-32 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Let&apos;s Talk Growth
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-text-secondary">
            Pick a time that works. We&apos;ll come prepared with ideas for your
            business.
          </p>
        </div>

        {/* TODO: Replace with your actual Cal.com embed code */}
        {/* To set up: go to cal.com, create a booking link, and paste the embed snippet below */}
        <div className="mx-auto mt-12 w-full max-w-4xl">
          <div
            id="calendly-embed"
            className="flex min-h-[600px] items-center justify-center rounded-xl border border-border bg-surface"
          >
            <div className="text-center">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-4 text-primary">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <p className="text-lg font-medium text-text-secondary">
                Cal.com scheduler will appear here
              </p>
              <p className="mt-2 text-sm text-text-secondary/60">
                Replace this placeholder with your Cal.com embed code
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
