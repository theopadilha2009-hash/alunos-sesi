import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Alunos SESI",
  description:
    "O diretório da turma: quem é quem, o LinkedIn e o GitHub de cada aluno.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo-sesi-icone.png",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sesi.tema');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
