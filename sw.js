/*
 * Arcana Nail — service worker.
 * Guarda os arquivos do app para abrir rápido e funcionar com internet fraca.
 * A agenda (Apps Script) nunca é guardada: sempre vem da internet.
 * Ao publicar uma versão nova, aumente o número em VERSAO.
 */
const VERSAO = 'arcana-v4';
const ARQUIVOS = [
  './', 'index.html', 'painel.html', 'css/arcana.css', 'css/cliente.css', 'css/painel.css',
  'parceiras.html', 'css/parceiras.css', 'js/config.js', 'js/comum.js', 'js/api.js', 'js/ceu.js', 'js/cliente.js', 'js/painel.js',
  'js/divulgacao.js', 'js/parceiras.js',
  'assets/sol.webp', 'assets/letreiro.webp', 'assets/icone-192.png', 'assets/icone-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Páginas e código: rede primeiro (para receber atualizações), cópia guardada se estiver offline.
  if (req.mode === 'navigate' || /\.(js|css|webmanifest)$/.test(url.pathname)) {
    e.respondWith(fetch(req).then((resp) => {
      const copia = resp.clone();
      caches.open(VERSAO).then((c) => c.put(req, copia));
      return resp;
    }).catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }

  // Imagens: cópia guardada primeiro.
  e.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
