import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai, Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});
const plexThai = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-plex-thai",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Machine-Maintenance", template: "%s · Machine-Maintenance" },
  description: "Alarm & Maintenance Management System สำหรับงาน Automation และงานซ่อมบำรุงในโรงงาน",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const locale = cookieStore.get("locale")?.value || "th";

  return (
    <html
      lang={locale}
      data-theme={theme === "dark" || theme === "light" ? theme : undefined}
      className={`${roboto.variable} ${plexThai.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
