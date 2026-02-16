import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-text-secondary">
          &copy; {new Date().getFullYear()} ColdCraft HQ. All rights reserved.
        </p>

        <div className="flex gap-6 text-sm text-text-secondary">
          <Link href="#" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
        </div>

        <a
          href="mailto:hello@coldcrafthq.com"
          className="text-sm text-text-secondary transition-colors hover:text-foreground"
        >
          hello@coldcrafthq.com
        </a>
      </div>
    </footer>
  );
}
