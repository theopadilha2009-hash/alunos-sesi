import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NONCE_HEADER } from "@/lib/csp";
import { URL_BASE } from "@/lib/links";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--fonte-manrope",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--fonte-bricolage",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#090d12",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE),
  title: "Alunos SESI SC · Joinville",
  description:
    "Diretório oficial de talentos, crachás digitais e ecossistema escolar do SESI SENAI Joinville - SC.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SESI Joinville",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/logo-sesi-icone.png",
  },
  // Sem `robots` aqui de propósito. Um noindex no layout raiz vale para o site
  // inteiro e contradizia o sitemap, que anuncia a vitrine e um URL por aluno —
  // o Google recebia um mapa de páginas que o HTML mandava não indexar. Cada
  // rota agora declara o seu: a vitrine e os perfis são indexáveis, e as telas
  // de CRM, identidade e validação se marcam sozinhas.
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // O nonce vem do proxy.ts, que é quem gera a CSP desta requisição. Ler
  // `headers()` torna o layout dinâmico — não é regressão, porque todas as
  // páginas reais já chamam `cookies()`.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      className={`${manrope.variable} ${bricolage.variable}`}
    >
      <head>
        {/* Roda antes da primeira pintura: sem isso a página aparece escura
            e pisca para clara quando o React hidrata. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sesi.tema');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){};if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}",
          }}
        />
      </head>
      <body>
        {children}
        {/* Web Vitals e uso anônimo. O script é servido de /_vercel/insights
            (mesma origem), então passa no `script-src 'self'` da CSP sem
            precisar de nonce. Fora da Vercel ele não é injetado. */}
        <Analytics />
      </body>
    </html>
  );
}
