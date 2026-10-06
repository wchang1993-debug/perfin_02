// Service worker do Portal Perfin.
// Regra de segurança: só arquivos estáticos e a página /offline ficam em cache.
// Páginas, /api e qualquer resposta autenticada vão SEMPRE à rede (nunca guardamos dados financeiros).
const VERSAO = "portal-perfin-v1";
const PRE_CACHE = ["/offline", "/icons/icone-192.png", "/icons/icone-512.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(PRE_CACHE)));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (evento) => {
  if (evento.data === "ativar-nova-versao") self.skipWaiting();
});

function ehEstatico(url) {
  return url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"));
}

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== "GET") return;
  const url = new URL(requisicao.url);

  if (ehEstatico(url)) {
    // Arquivos estáticos têm hash no nome: cache primeiro.
    evento.respondWith(
      caches.match(requisicao).then(
        (emCache) =>
          emCache ||
          fetch(requisicao).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
            }
            return resposta;
          }),
      ),
    );
    return;
  }

  if (requisicao.mode === "navigate") {
    // Navegação: sempre rede; sem conexão, mostra a página offline (sem dados).
    evento.respondWith(fetch(requisicao).catch(() => caches.match("/offline")));
  }
});
