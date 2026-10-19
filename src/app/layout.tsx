import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NONCE_HEADER } from "@/lib/csp";
import { URL_BASE } from "@/lib/links";
import { scriptTemaSalvo } from "@/lib/tema";
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
  themeColor: "#f8fafc",
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
      data-theme="light"
      className={`${manrope.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* O registro do service worker roda cedo e inline. O tema salvo roda
            logo depois, também inline e antes do primeiro paint. A decisão R1
            continua valendo no espírito: a chave antiga do tema morreu e
            nenhum valor órfão de visita antiga é reaplicado. O alternador
            (pedido de 19/10/2026) escreve em `sesi.tema.v2`, chave NOVA —
            quem nunca clicou fica no `data-theme="light"` do <html> acima. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}",
          }}
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: scriptTemaSalvo() }}
        />
      </head>
      <body>
        {children}
        {/* Web Vitals e uso anônimo. Em produção o script é servido de
            /_vercel/insights (mesma origem), então passa no `script-src 'self'`
            da CSP sem precisar de nonce. Em `next dev` o pacote troca para o
            script de debug em va.vercel-scripts.com — quem libera aquele host
            é o ramo `dev` de `montarCsp`. */}
        <Analytics />
      </body>
    </html>
  );
}
