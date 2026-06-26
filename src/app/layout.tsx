import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lottery Dynamic Form System",
  description: "Thai lottery dynamic form ordering and payment system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}
