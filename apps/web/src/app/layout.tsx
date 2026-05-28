import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muster",
  description: "Agent operations platform for community organisations."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <div className="shell">
          <nav className="nav">
            <Link href="/" className="brand">Muster</Link>
            <p className="brand-subtitle">Agent operations</p>
            <div className="nav-group">
              <Link href="/">Dashboard</Link>
              <Link href="/jobs">Operations</Link>
              <Link href="/connectors">Connectors</Link>
              <Link href="/roles">Agents</Link>
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
