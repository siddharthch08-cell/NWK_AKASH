import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = localFont({
  src: "../../public/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "../../public/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Naya Wallah Kanoon — Judicial Classes | New Law, New Way",
  description:
    "Naya Wallah Kanoon Judicial Classes — judicial services preparation, now at your doorstep. Courses for Judiciary, ADJ, and APO. Morning and evening batches. New Law ~ New Way.",
  keywords: [
    "Naya Wallah Kanoon",
    "Judicial Classes",
    "Judiciary Preparation",
    "ADJ",
    "APO",
    "Law Coaching",
    "Rajasthan High Court",
    "Jaipur",
  ],
  authors: [{ name: "Adv. Akash Faujdar" }],
  icons: {
    icon: "/logo.svg.jpeg",
  },
  openGraph: {
    title: "Naya Wallah Kanoon — Judicial Classes",
    description:
      "Judicial services preparation, now at your doorstep. Courses for Judiciary, ADJ, and APO.",
    siteName: "Naya Wallah Kanoon",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Naya Wallah Kanoon",
    description: "Judicial Classes — New Law, New Way",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
