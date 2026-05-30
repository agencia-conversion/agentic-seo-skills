import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getServerLocale } from '@/lib/i18n.server';
import { I18nProvider } from '@/components/i18n-provider';

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "agentic seo companion",
  description: "Local agentic seo companion powered by project files.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "agentic seo companion",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#3a5bd9",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="h-full flex flex-col overflow-hidden">
        <I18nProvider initialLocale={locale}>
          {children}
        </I18nProvider>
        {/* Userback feedback widget. access_token is a public client token by
            design, so it is safe to embed. Loaded last in <body> so it runs on
            every page, mirroring Userback's documented snippet. Note: o Companion
            roda em 127.0.0.1 com porta variável — liberar 127.0.0.1/localhost em
            Manage Domains no projeto Userback para o widget inicializar. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
  window.Userback = window.Userback || {};
  Userback.access_token = "A-05EiZMdxgyP6U5VqvZO5sFk6l";
  (function(d) {
    var s = d.createElement('script');s.async = true;s.src = 'https://static.userback.io/widget/v1.js';(d.head || d.body).appendChild(s);
  })(document);
`,
          }}
        />
      </body>
    </html>
  );
}
