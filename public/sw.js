// Service Worker para PWA do Ecossistema SESI SC - Joinville
// Garante funcionamento offline do crachá, catálogo e perfis escolares

// v4: o cache de estáticos passou a revalidar e a avisar a página quando um
  // asset muda. Subir a versão aqui descarta o cache antigo de todo mundo no
  // activate — é o que faz um aparelho que já tem CSS velho se corrigir sozinho.
  const CACHE_NAME = "sesi-joinville-v4";
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

  // Arquivos estáticos (_next/static, imagens, css).
  //
  // Antes era Cache-First: o cache respondia e a atualização entrava "em
  // segundo plano", então uma troca de CSS só aparecia na SEGUNDA visita. Foi
  // exatamente o que fez o login parecer quebrado depois do redesign — o HTML
  // vinha novo (network-first) e o CSS vinha velho do cache, então o layout
  // rachava. Agora é Stale-While-Revalidate de verdade: responde do cache para
  // ser instantâneo, mas quando a rede traz uma versão diferente o cache é
  // atualizado E a página recarrega uma vez, para a pessoa já ver o certo.
  event.respondWith(
    caches.match(req).then(async (respostaCache) => {
      if (!respostaCache) {
        const respostaRede = await fetch(req);
        if (respostaRede && respostaRede.status === 200) {
          const copia = respostaRede.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        }
        return respostaRede;
      }

      // Revalida em paralelo; quem já está na tela segue com o cache.
      const redePromise = fetch(req)
        .then(async (respostaRede) => {
          if (respostaRede && respostaRede.status === 200) {
            const copia = respostaRede.clone();
            const cache = await caches.open(CACHE_NAME);
            const antigo = await cache.match(req);
            const etagAntigo = antigo?.headers.get("etag");
            const etagNovo = respostaRede.headers.get("etag");
            await cache.put(req, copia);
            // Só recarrega quando o conteúdo mudou de fato (ETag diferente).
            // Sem ETag, não força recarga: recarregar a cada navegação por um
            // asset estático seria pior que servir o antigo por um instante.
            if (etagAntigo && etagNovo && etagAntigo !== etagNovo) {
              const clientes = await self.clients.matchAll({ type: "window" });
              for (const c of clientes) c.postMessage({ tipo: "asset-atualizado", url: req.url });
            }
          }
          return respostaRede;
        })
        .catch(() => null);

      // Não espera a rede: entrega o cache agora.
      event.waitUntil(redePromise);
      return respostaCache;
    })
  );
});
