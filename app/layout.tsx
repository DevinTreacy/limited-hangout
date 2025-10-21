
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Limited Hangout",
  description: "Comedy sketch group.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/10">
          <nav className="container-page flex items-center justify-between py-4">
            <Link href="/" className="text-xl font-bold tracking-tight">Limited Hangout</Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/about">About</Link>
              <Link href="/videos">Videos</Link>
              <Link href="/shows">Live Shows</Link>
              <Link href="/socials">Socials</Link>
            </div>
          </nav>
        </header>
        <main className="container-page py-10">{children}</main>
        <footer className="mt-16 border-t border-white/10">
          <div className="container-page py-6 text-sm muted">
            © {new Date().getFullYear()} Limited Hangout • All rights reserved
          </div>
        </footer>
      </body>
    </html>
  );
}
