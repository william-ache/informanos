import type { Metadata, Viewport } from "next";
import {
  GITHUB_URL,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EmergencyApplication",
  operatingSystem: "Web",
  inLanguage: "es-VE",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: SITE_NAME,
    url: GITHUB_URL,
  },
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Estado Aragua",
    containedInPlace: {
      "@type": "Country",
      name: "Venezuela",
    },
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Centros de Acopio en Emergencia`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: GITHUB_URL }],
  creator: "william-ache",
  publisher: SITE_NAME,
  category: "emergency",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Centros de Acopio en Emergencia`,
    description: SITE_DESCRIPTION,
    countryName: "Venezuela",
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — Centros de Acopio`,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      {
        url: "/favicon/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  other: {
    "geo.region": "VE-B",
    "geo.placename": "Estado Aragua",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#020617",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="overflow-hidden bg-slate-950 antialiased text-slate-100"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
