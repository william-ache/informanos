import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Informa Aragua — Centros de Acopio",
  description:
    "Sistema de emergencia para rastrear centros de acopio y necesidades en tiempo real",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Informa Aragua",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className="overflow-hidden bg-slate-950 antialiased text-slate-100"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
