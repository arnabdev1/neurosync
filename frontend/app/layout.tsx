import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "NeuroSync | Closed-Loop Brain-Computer Interface",
  description: "External Executive Function for knowledge workers and individuals with ADHD",
  icons: {
    icon: "/neurosync-logo.svg",
    shortcut: "/neurosync-logo.svg",
    apple: "/neurosync-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="antialiased bg-[#0a0a0f] text-zinc-100 min-h-screen font-sans"
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
