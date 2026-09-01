import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Charging Assessment",
  description:
    "Initial Next.js template for a future EV home charging assessment app.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
