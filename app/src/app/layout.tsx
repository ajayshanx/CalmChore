import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calm Chore",
  description: "A calm, gamified way for families to manage chores together.",
  manifest: "/manifest.json",
  icons: {
    // Chrome/Android reads public/manifest.json directly for its home
    // screen icon, but iOS Safari does not — it specifically needs an
    // apple-touch-icon link tag, or it falls back to a page screenshot.
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
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
