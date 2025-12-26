import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beat The House - Salary Cap Fantasy",
  description: "Pick your connections, beat the house's expected points, and win big!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
