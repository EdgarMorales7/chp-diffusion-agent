import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CHP Diffusion Agent",
  description: "Sistema semiautónomo para difusión de contenido.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-screen bg-background`}>
        <div className="flex min-h-screen w-full flex-col md:flex-row">
          <div className="hidden md:block w-64 shrink-0">
            <Sidebar />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <Header />
            <main className="flex-1 p-4 lg:p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
