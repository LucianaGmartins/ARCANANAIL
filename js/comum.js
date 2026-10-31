/* Arcana Nail — utilidades compartilhadas pelo app da cliente e pelo painel. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const REDUZIR_MOVIMENTO = matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const SEMANA_CURTA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function paraData(d) { const [a, m, dd] = d.split('-').map(Number); return new Date(a, m - 1, dd); }
function isoLocal(dt = new Date()) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function somarDias(d, n) { const x = paraData(d); x.setDate(x.getDate() + n); return isoLocal(x); }
function dataLonga(d) { const x = paraData(d); return `${SEMANA[x.getDay()]}, ${x.getDate()} de ${MESES[x.getMonth()]}`; }
function dataCurta(d) { return d ? d.split('-').reverse().join('/') : ''; }
function maiuscula(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function duracaoTexto(m) {
  m = Math.round(Number(m) || 0);
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`) : `${r} min`;
}
function horaFim(h, dur) {
  const [a, b] = h.split(':').map(Number), t = a * 60 + b + Number(dur || 0);
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
function mascaraFone(v) {
  const d = soDigitos(v).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function foneValido(v) { const d = soDigitos(v); return d.length === 10 || d.length === 11; }
function romano(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] || String(n); }
function primeiroNome(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
function lerLocal(k, padrao = null) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } }
function gravarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ } }

const STATUS = {
  aguardando: { rotulo: 'Aguardando sinal', icone: 'ampulheta' },
  confirmado: { rotulo: 'Confirmado', icone: 'check-circulo' },
  concluido: { rotulo: 'Concluído', icone: 'brilho' },
  cancelado: { rotulo: 'Cancelado', icone: 'ban' },
  faltou: { rotulo: 'Não compareceu', icone: 'alerta' }
};
const chipStatus = (s) => `<span class="chip chip-${esc(s)}">${icone(STATUS[s]?.icone || 'brilho')}${esc(STATUS[s]?.rotulo || s)}</span>`;

// ---------- ícones (traços no estilo Lucide, desenhados inline) ----------
const ICONES = {
  calendario: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'check-circulo': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  copiar: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  voltar: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  direita: '<path d="m9 18 6-6-6-6"/>',
  esquerda: '<path d="m15 18-6-6 6-6"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  brilho: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>',
  usuario: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  mensagem: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  enviar: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  ajustes: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  lista: '<path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  mais: '<path d="M5 12h14M12 5v14"/>',
  lixo: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  local: '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  instagram: '<rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01"/>',
  cadeado: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  dinheiro: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  ampulheta: '<path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  alerta: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  atualizar: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M16 16h5v5"/>',
  grafico: '<path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>',
  joia: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6M2 9h20"/>',
  lapis: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  bilhete: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  compartilhar: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  casa: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  lua: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  bolo: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"/>',
  cima: '<path d="m18 15-6-6-6 6"/>',
  olho: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>'
};
function icone(nome, classe = '') {
  return `<svg class="ic ${classe}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONES[nome] || ''}</svg>`;
}

// ---------- Pix ----------
const TIPOS_PIX = { telefone: 'celular', cpf: 'CPF', cnpj: 'CNPJ', email: 'e-mail', aleatoria: 'chave aleatória' };

function pixChaveFormatada(studio) {
  const k = String(studio.pixChave || '').trim();
  switch (studio.pixTipo) {
    case 'telefone': { let d = soDigitos(k); if (d.length <= 11) d = '55' + d; return '+' + d; }
    case 'cpf': case 'cnpj': return soDigitos(k);
    case 'email': return k.toLowerCase();
    default: return k;
  }
}

function crc16(texto) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Gera o "Pix copia e cola" (BR Code estático) já com o valor do sinal.
function pixCopiaECola(studio, valor, identificador) {
  const campo = (id, v) => id + String(v.length).padStart(2, '0') + v;
  const limpar = (s, max) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().trim().slice(0, max) || 'BRASIL';
  const txid = String(identificador || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', pixChaveFormatada(studio));
  let p = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986') +
    (valor > 0 ? campo('54', Number(valor).toFixed(2)) : '') + campo('58', 'BR') +
    campo('59', limpar(studio.pixNome || studio.nome, 25)) + campo('60', limpar(studio.pixCidade, 15)) +
    campo('62', campo('05', txid)) + '6304';
  return p + crc16(p);
}

// ---------- WhatsApp e agenda ----------
function linkWhats(numero, texto) {
  let d = soDigitos(numero);
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

function linhasReserva(r) {
  return [
    `*Reserva:* ${r.codigo}`,
    `*Data:* ${maiuscula(dataLonga(r.data))}`,
    `*Horário:* ${r.hora} às ${horaFim(r.hora, r.duracao)}`,
    `*Serviços:* ${r.servicos}`,
    `*Valor total:* ${moeda(r.total)}`
  ];
}

function msgComprovante(r, studio) {
  return [
    `Olá, ${studio.nome}! Acabei de reservar meu horário pelo app e já fiz o Pix do sinal.`,
    '',
    `*Nome:* ${r.cliente}`,
    ...linhasReserva(r),
    `*Sinal pago:* ${moeda(r.sinal)}`,
    '',
    'Segue o comprovante.'
  ].join('\n');
}

function msgParaCliente(r, studio, tipo, link) {
  const nome = primeiroNome(r.cliente);
  const pct = Math.round(r.total ? (r.sinal / r.total) * 100 : studio.sinalPct);
  const local = studio.endereco ? ['', `*Endereço:* ${studio.endereco}`] : [];
  if (tipo === 'confirmado') {
    return [
      `Olá, ${nome}! Recebi o seu sinal e o seu horário no ${studio.nome} está confirmado.`,
      '', ...linhasReserva(r),
      `*Sinal recebido:* ${moeda(r.sinal)}`,
      `*Restante no dia:* ${moeda(r.total - r.sinal)}`,
      ...local, '', 'Até breve!'
    ].join('\n');
  }
  if (tipo === 'lembrete') {
    return [
      `Olá, ${nome}! Passando para lembrar do seu horário no ${studio.nome}.`,
      '', ...linhasReserva(r),
      r.status === 'confirmado' ? `*Restante no dia:* ${moeda(r.total - r.sinal)}` : `*Sinal pendente:* ${moeda(r.sinal)}`,
      ...local, '', 'Se surgir algum imprevisto, me avise por aqui.'
    ].join('\n');
  }
  return [
    `Olá, ${nome}! Aqui é do ${studio.nome}.`,
    '', 'Seu horário está reservado:', '', ...linhasReserva(r),
    `*Sinal para confirmar (${pct}%):* ${moeda(r.sinal)}`,
    '', 'Para confirmar, faça o Pix do sinal na chave abaixo e me envie o comprovante por aqui.',
    '', `*Chave Pix (${TIPOS_PIX[studio.pixTipo] || 'chave'}):*`,
    studio.pixChave,
    ...(link ? ['', `Acompanhe sua reserva: ${link}`] : [])
  ].join('\n');
}

function linkAgendaGoogle(r, studio) {
  const ini = `${r.data.replace(/-/g, '')}T${r.hora.replace(':', '')}00`;
  const fim = `${r.data.replace(/-/g, '')}T${horaFim(r.hora, r.duracao).replace(':', '')}00`;
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: `${studio.nome}: ${r.servicos}`, dates: `${ini}/${fim}`, ctz: 'America/Fortaleza',
    details: `Reserva ${r.codigo}`, location: studio.endereco || ''
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// ---------- interface ----------
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch {
    const t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.append(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove();
    return ok;
  }
}

// Troca o conteúdo de um botão com um leve desfoque, para o estado "copiado".
function feedbackBotao(btn, html, ms = 1800) {
  if (btn._original === undefined) btn._original = btn.innerHTML;
  clearTimeout(btn._timer);
  btn.classList.add('trocando');
  setTimeout(() => { btn.innerHTML = html; btn.classList.remove('trocando'); btn.classList.add('feito'); }, 120);
  btn._timer = setTimeout(() => {
    btn.classList.add('trocando');
    setTimeout(() => { btn.innerHTML = btn._original; btn.classList.remove('trocando', 'feito'); }, 120);
  }, ms);
}

function toast(msg, tipo = 'info') {
  let caixa = $('.toasts');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.className = 'toasts';
    caixa.setAttribute('role', 'status');
    caixa.setAttribute('aria-live', 'polite');
    document.body.append(caixa);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.dataset.entrando = '';
  t.innerHTML = icone(tipo === 'erro' ? 'alerta' : tipo === 'ok' ? 'check-circulo' : 'brilho') + `<span>${esc(msg)}</span>`;
  caixa.append(t);
  requestAnimationFrame(() => requestAnimationFrame(() => delete t.dataset.entrando));
  setTimeout(() => {
    t.dataset.saindo = '';
    setTimeout(() => t.remove(), 300);
  }, tipo === 'erro' ? 5200 : 3000);
}

async function comCarga(btn, fn) {
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('carregando');
  btn.setAttribute('aria-busy', 'true');
  try { return await fn(); } finally {
    btn.disabled = false;
    btn.classList.remove('carregando');
    btn.removeAttribute('aria-busy');
  }
}

// Gaveta (bottom sheet no celular, janela centralizada no computador).
function abrirFolha({ titulo, subtitulo = '', corpo = '', classe = '' }) {
  const veu = document.createElement('div');
  veu.className = 'veu';
  const f = document.createElement('section');
  f.className = `folha ${classe}`;
  f.setAttribute('role', 'dialog');
  f.setAttribute('aria-modal', 'true');
  f.setAttribute('aria-label', titulo);
  f.tabIndex = -1;
  f.innerHTML = `
    <div class="folha-alca" aria-hidden="true"></div>
    <header class="folha-topo">
      <div>${subtitulo ? `<p class="sobretitulo">${esc(subtitulo)}</p>` : ''}<h3>${esc(titulo)}</h3></div>
      <button class="icone-btn" type="button" data-fechar aria-label="Fechar">${icone('x')}</button>
    </header>
    <div class="folha-corpo">${corpo}</div>`;
  document.body.append(veu, f);
  document.body.classList.add('travado');
  const anterior = document.activeElement;
  requestAnimationFrame(() => requestAnimationFrame(() => { veu.classList.add('aberto'); f.classList.add('aberta'); f.focus({ preventScroll: true }); }));

  let fechada = false;
  const aoFechar = [];
  function fechar() {
    if (fechada) return;
    fechada = true;
    f.style.transform = '';
    f.classList.add('fechando');
    f.classList.remove('aberta');
    veu.classList.remove('aberto');
    document.removeEventListener('keydown', tecla);
    setTimeout(() => {
      veu.remove(); f.remove();
      if (!$('.folha')) document.body.classList.remove('travado');
      if (anterior && anterior.isConnected) anterior.focus({ preventScroll: true });
      aoFechar.forEach((fn) => fn());
    }, 240);
  }
  function tecla(e) { if (e.key === 'Escape' && f === $$('.folha').pop()) fechar(); }
  document.addEventListener('keydown', tecla);
  veu.addEventListener('click', fechar);
  $('[data-fechar]', f).addEventListener('click', fechar);

  // Arrastar para baixo fecha (no celular). Um gesto rápido basta, sem precisar ir longe.
  const alca = $('.folha-alca', f), topo = $('.folha-topo', f);
  let inicioY = 0, inicioT = 0, arrastando = false, dy = 0;
  const comecar = (e) => {
    if (arrastando || matchMedia('(min-width: 720px)').matches || e.target.closest('button')) return;
    arrastando = true; inicioY = e.clientY; inicioT = performance.now(); dy = 0;
    f.style.transition = 'none';
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const mover = (e) => {
    if (!arrastando) return;
    dy = e.clientY - inicioY;
    const y = dy > 0 ? dy : dy / 6; // resistência ao puxar para cima
    f.style.transform = `translateY(${y}px)`;
  };
  const soltar = () => {
    if (!arrastando) return;
    arrastando = false;
    f.style.transition = '';
    const velocidade = dy / (performance.now() - inicioT);
    if (dy > 120 || velocidade > 0.5) fechar(); else f.style.transform = '';
  };
  [alca, topo].forEach((el) => {
    el.addEventListener('pointerdown', comecar);
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  });

  return { el: f, fechar, aoFechar: (fn) => aoFechar.push(fn) };
}

function confirmar({ titulo, texto = '', ok = 'Confirmar', cancelar = 'Voltar', perigo = false }) {
  return new Promise((resolver) => {
    let resposta = false;
    const folha = abrirFolha({
      titulo, classe: 'folha-confirmar',
      corpo: `${texto ? `<p class="folha-texto">${esc(texto)}</p>` : ''}
        <div class="folha-acoes">
          <button class="btn ${perigo ? 'btn-perigo' : 'btn-ouro'} btn-bloco" type="button" data-sim>${esc(ok)}</button>
          <button class="btn btn-fantasma btn-bloco" type="button" data-nao>${esc(cancelar)}</button>
        </div>`
    });
    $('[data-sim]', folha.el).addEventListener('click', () => { resposta = true; folha.fechar(); });
    $('[data-nao]', folha.el).addEventListener('click', () => folha.fechar());
    folha.aoFechar(() => resolver(resposta));
  });
}

// Entrada suave de uma tela nova. Saída instantânea: quem navega quer ver o destino.
function entrarTela(el, direcao = 0) {
  if (REDUZIR_MOVIMENTO || !el.animate) return;
  el.animate([
    { opacity: 0, transform: `translate3d(${direcao * 18}px, ${direcao ? 0 : 10}px, 0)`, filter: 'blur(4px)' },
    { opacity: 1, transform: 'none', filter: 'blur(0)' }
  ], { duration: 320, easing: 'cubic-bezier(.23,1,.32,1)' });
}

function avisoDemo(onde) {
  if (!API.demo) return;
  const el = document.createElement('div');
  el.className = 'faixa-demo';
  el.innerHTML = `${icone('alerta')}<span>Modo demonstração: os dados ficam salvos só neste aparelho.${onde === 'painel' ? ' Senha: <b>arcana</b>' : ''}</span>`;
  document.body.prepend(el);
}
