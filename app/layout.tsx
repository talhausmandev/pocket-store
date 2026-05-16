import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "@/app/globals.css";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} font-sans ${inter.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <TopLoadingBar durationMs={1800} />
          {userId ? (
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background/80 px-2 py-2 backdrop-blur sm:px-4">
                  <SidebarTrigger className="cursor-pointer" />
                  <div className="text-sm font-semibold truncate">Pocket Store</div>
                </header>
                <div className="flex-1 w-full">{children}</div>
              </SidebarInset>
            </SidebarProvider>
          ) : (
            <div className="flex-1 w-full">{children}</div>
          )}
        </ClerkProvider>
      </body>
    </html>
  );
}
