import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EDULEARN PRO — Advanced Learning Management System",
  description:
    "EDULEARN PRO is a production-ready Learning Management System for educational institutes. Manage students, batches, courses, video lectures, timed MCQ tests, leaderboards, and analytics.",
  keywords: [
    "EDULEARN PRO",
    "LMS",
    "Learning Management System",
    "Online Courses",
    "Education",
    "MCQ Tests",
    "E-Learning",
  ],
  authors: [{ name: "EDULEARN PRO" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "EDULEARN PRO — Advanced Learning Management System",
    description:
      "Manage students, batches, courses, video lectures, timed MCQ tests, leaderboards, and analytics.",
    siteName: "EDULEARN PRO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EDULEARN PRO",
    description: "Advanced Learning Management System",
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
          enableSystem
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
