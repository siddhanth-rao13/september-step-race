import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Self-hosted so the build never needs the network and the font can never
 * fail to load at runtime.
 */
const pixelFont = localFont({
  src: "./fonts/PressStart2P-Regular.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-pixel",
  fallback: ["Courier New", "monospace"],
});

export const metadata: Metadata = {
  title: "September Step Race",
  description: "A retro pixel-art race tracking September 2026 step totals.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#191226",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={pixelFont.variable}>
      <body>{children}</body>
    </html>
  );
}
