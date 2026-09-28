import FxLayer from "@/components/fx/FxLayer";
import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from("home_content").select("logo_url, institute_name").eq("id", 1).maybeSingle();
  const logoUrl = data?.logo_url as string | undefined;
  const instituteName = (data?.institute_name as string | undefined) || "IT HUB Kohlu";

  const siteTitle = `${instituteName} | Institute of Technology`;
  const siteDescription = `${instituteName} — Admissions open for Web Development, Graphic Design, Digital Marketing & E-Commerce programs.`;

  return {
    title: siteTitle,
    description: siteDescription,
    icons: logoUrl ? { icon: logoUrl } : undefined,
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      siteName: instituteName,
      type: "website",
      ...(logoUrl ? { images: [{ url: logoUrl }] } : {}),
    },
    twitter: {
      card: "summary",
      title: siteTitle,
      description: siteDescription,
      ...(logoUrl ? { images: [logoUrl] } : {}),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FxLayer />
        {children}
      </body>
    </html>
  );
}
