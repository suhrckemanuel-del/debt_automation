import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Agreement Intelligence",
    template: "%s · Agreement Intelligence",
  },
  description:
    "Source-grounded agreement intelligence for a synthetic design-partner workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full`}
    >
      <body className="min-h-full bg-background font-sans antialiased">
        <div
          role="note"
          className="flex w-full items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-xs font-medium text-amber-200"
        >
          <span aria-hidden className="text-sm leading-none">
            ⚠
          </span>
          <span>
            Synthetic demo — no real data. Do not upload real or confidential
            documents.
          </span>
        </div>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
