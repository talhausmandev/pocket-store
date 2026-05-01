import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import {  SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pocket Store - Store Manager",
  description: "Pocket Store - Your Store Manager in your pocket.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={ `${geistSans.variable} ${geistMono.variable} font-sans ${inter.variable}` }
    >
      <body className="min-h-full flex flex-col">
        <SidebarProvider>
          <AppSidebar />
            <SidebarTrigger className="cursor-pointer my-2"/>
            {children}
        </SidebarProvider>
      </body>
    </html>
  );
}
