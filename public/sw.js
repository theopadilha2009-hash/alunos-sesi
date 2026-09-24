// Service Worker para PWA do Ecossistema SESI SC - Joinville
// Garante funcionamento offline do crachá, catálogo e perfis escolares

const CACHE_NAME = "sesi-joinville-v1";
const RECURSOS_ESTATICOS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/logo-sesi.png",
  "/logo-sesi-branco.png",
  "/logo-sesi-icone.png",
  "/logo-sesi-icone-branco.png"
];

// Instalação do Service Worker e pré-cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(RECURSOS_ESTATICOS).catch((err) => {
        console.warn("[SW SESI] Falha parcial no pré-cache:", err);
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

          // Se for página de crachá ou aluno específica e não estiver em cache, entrega a raiz em cache
          const respostaRaiz = await caches.match("/");
          if (respostaRaiz) return respostaRaiz;

          return new Response(
            `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Modo Offline · SESI Joinville</title><style>body{background:#0B0F17;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}h1{color:#E30613}.card{background:#161E2E;padding:2rem;border-radius:12px;border:1px solid #233149;max-width:400px}</style></head><body><div class="card"><h1>SESI SC · Offline</h1><p>Você está sem conexão com a internet. O seu crachá e páginas salvas continuam disponíveis quando sincronizados.</p></div></body></html>`,
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
