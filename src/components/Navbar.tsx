"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "./Logo";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300 ${
        scrolled
          ? "bg-[#08090A]/80 backdrop-blur-xl border-b border-[#1E2028]"
          : "bg-transparent"
      }`}
    >
      <div className="w-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="text-[#EDEEF0]">
          <Logo size="md" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a
            href="#how-it-works"
            className="text-sm font-body font-medium text-[#8B8D98] hover:text-[#EDEEF0] transition-colors duration-200"
          >
            How It Works
          </a>
          <a
            href="#what-we-build"
            className="text-sm font-body font-medium text-[#8B8D98] hover:text-[#EDEEF0] transition-colors duration-200"
          >
            What We Build
          </a>
          <a
            href="#faq"
            className="text-sm font-body font-medium text-[#8B8D98] hover:text-[#EDEEF0] transition-colors duration-200"
          >
            FAQ
          </a>
        </div>

        <Link
          href="/book"
          className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-sm font-body font-medium px-5 py-2 rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
        >
          Book a Call
        </Link>
      </div>
    </nav>
  );
}
