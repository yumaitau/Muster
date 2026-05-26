import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muster",
  description: "Self-hosted back-office automation for community organisations."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <div className="shell">
          <nav className="nav">
            <Link href="/" className="text-2xl font-bold">Muster</Link>
            <div className="mt-8 grid gap-3 text-sm font-semibold">
              <Link href="/">Dashboard</Link>
              <Link href="/connectors">Connectors</Link>
              <Link href="/roles">Roles</Link>
              <Link href="/approvals">Approvals</Link>
              <Link href="/messages">Messages</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/chat">Chat</Link>
              <Link href="/setup">Setup</Link>
            </div>
          </nav>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
