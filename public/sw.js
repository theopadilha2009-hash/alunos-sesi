// Service Worker para PWA do Ecossistema SESI SC - Joinville
// Garante funcionamento offline do crachá, catálogo e perfis escolares

const CACHE_NAME = "sesi-joinville-v3";
const RECURSOS_ESTATICOS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/logo-sesi.png",
  "/logo-sesi-branco.png",
  "/logo-sesi-icone.png",
  "/logo-sesi-icone-branco.png"
];

// Vitrine: única rota pública, sempre acessível, com a turma inteira e link
// para os perfis. É ela que responde offline por uma página de aluno.
const ROTA_PUBLICA_OFFLINE = "/alunos";

// Onde esse fallback vale: páginas do aluno. Em rota do CRM (`/`, `/adm`) a
// vitrine seria tão fora de contexto quanto o login.
const PREFIXOS_PUBLICOS = ["/alunos", "/u/", "/validar/"];

// Instalação do Service Worker e pré-cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Estáticos primeiro, em bloco: o addAll é tudo-ou-nada, então ele não
      // pode depender da rota dinâmica abaixo.
      await cache.addAll(RECURSOS_ESTATICOS).catch((err) => {
        console.warn("[SW SESI] Falha parcial no pré-cache:", err);
      });
      // A vitrine lê o banco a cada render. Em `add` separado, uma falha dela
      // não derruba o pré-cache dos ícones junto.
      await cache.add(ROTA_PUBLICA_OFFLINE).catch((err) => {
        console.warn("[SW SESI] Vitrine fora do pré-cache:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de versões antigas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) => {
      return Promise.all(
        chaves.map((chave) => {
          if (chave !== CACHE_NAME) {
            return caches.delete(chave);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de Fetch:
// - Para navegação HTML: Network-First com fallback para Cache
// - Para arquivos estáticos (_next, imagens): Stale-While-Revalidate ou Cache-First
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Não intercepta chamadas de API do Supabase ou POST
  if (req.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Requisições de Páginas HTML (Navegação)
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.status === 200) {
            const copia = respostaRede.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          }
          return respostaRede;
        })
        .catch(async () => {
          // Quando estiver sem conexão no colégio, tenta o cache
          const respostaCache = await caches.match(req);
          if (respostaCache) return respostaCache;

          // Perfil/crachá de aluno fora do cache e sem rede. A raiz `/` seria a
          // tela de LOGIN do CRM: inútil sem rede e sem relação com o pedido.
          // A vitrine é a resposta coerente — é pública, está pré-cacheada e
          // leva a turma inteira, com link para os perfis que o aluno já abriu.
          if (PREFIXOS_PUBLICOS.some((prefixo) => url.pathname.startsWith(prefixo))) {
            const respostaPublica = await caches.match(ROTA_PUBLICA_OFFLINE);
            if (respostaPublica) return respostaPublica;
          }
          // Qualquer outra rota do CRM cai no aviso offline abaixo.

          return new Response(
            `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Modo Offline · SESI Joinville</title><style>body{background:#090d12;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}h1{color:#38c7bd}.card{background:#10161f;padding:2rem;border-radius:12px;border:1px solid #1e2a38;max-width:400px}</style></head><body><div class="card"><h1>SESI SC · Offline</h1><p>Você está sem conexão com a internet. O seu crachá e páginas salvas continuam disponíveis quando sincronizados.</p></div></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // Arquivos estáticos (_next/static, imagens, css)
  event.respondWith(
    caches.match(req).then((respostaCache) => {
      if (respostaCache) {
        // Busca atualização em segundo plano
        fetch(req)
          .then((respostaRede) => {
            if (respostaRede && respostaRede.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, respostaRede));
            }
          })
          .catch(() => {});
        return respostaCache;
      }

      return fetch(req).then((respostaRede) => {
        if (respostaRede && respostaRede.status === 200) {
          const copia = respostaRede.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        }
        return respostaRede;
      });
    })
  );
});
