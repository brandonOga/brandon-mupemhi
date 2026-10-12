import type { Metadata } from "next";
import { Geist, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { TransitionProvider } from "./components/PageTransition";
import ButtonFlair from "./components/ButtonFlair";

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
      <head>
        <link rel="preconnect" href="https://db.onlinewebfonts.com" crossOrigin="" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <TransitionProvider>
          <ButtonFlair />
          <Header />
          {children}
          <Footer />
        </TransitionProvider>
      </body>
    </html>
  );
}
