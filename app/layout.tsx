import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Senate MVP",
  description: "Blind evaluation of different LLM collaboration conditions."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
