import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calm Chore",
  description: "A calm, gamified way for families to manage chores together.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
