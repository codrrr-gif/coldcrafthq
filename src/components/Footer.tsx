import Link from "next/link";
import { Logo } from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-[#1E2028] px-6 py-8">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#5A5C66]">
        <div className="flex items-center gap-3 text-[#EDEEF0]">
          <Logo size="sm" />
          <span className="text-[#5A5C66] text-sm">&copy; {new Date().getFullYear()}</span>
        </div>

        <div className="flex items-center gap-6">
          {/* TODO: Create these pages */}
          <Link href="/privacy" className="hover:text-[#8B8D98] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#8B8D98] transition-colors">
            Terms
          </Link>
        </div>

        <a
          href="mailto:hello@coldcrafthq.com"
          className="hover:text-[#8B8D98] transition-colors"
        >
          {/* TODO: Set up this email via Google Workspace */}
          hello@coldcrafthq.com
        </a>
      </div>
    </footer>
  );
}
