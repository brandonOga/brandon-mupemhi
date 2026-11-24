import type { Metadata } from "next";
import { Geist, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { TransitionProvider } from "./components/PageTransition";
import ButtonFlair from "./components/ButtonFlair";
import SiteCursor from "./components/SiteCursor";
import GridLines from "./components/GridLines";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Design By Brandon",
  description: "Brandon Mupemhi — Creative Web & UI/UX Designer crafting memorable digital experiences for brands of all sizes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${robotoMono.variable}`}
      suppressHydrationWarning
    >
      {/* isolate: <html> has its own background, so <body>'s is painted as
          an ordinary box. As a stacking context, body paints that first, and
          the grid at the back (-z-10) then lands above it, not under it. */}
      <body className="antialiased isolate" suppressHydrationWarning>
        <TransitionProvider>
          <ButtonFlair />
          <Header />
          {children}
          <Footer />
        </TransitionProvider>
        <GridLines />
        <SiteCursor />
      </body>
    </html>
  );
}
