import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORJA — El sistema operativo de tu evolución",
  description: "Todo se forja. El cuerpo, la mente, el carácter, los hábitos, la disciplina.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#17140F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-bg-base text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
