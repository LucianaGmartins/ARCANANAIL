/* Arcana Nail — painel do studio */
(() => {
  const raiz = $('#painel');
  const CH_TOKEN = 'arcana-token';
  const ABAS = [
    { id: 'agenda', nome: 'Agenda', icone: 'calendario' },
    { id: 'sinais', nome: 'Sinais', icone: 'ampulheta' },
    { id: 'visao', nome: 'Visão geral', curto: 'Visão', icone: 'grafico' },
    { id: 'servicos', nome: 'Serviços', icone: 'joia' },
    { id: 'ajustes', nome: 'Ajustes', icone: 'ajustes' }
  ];
  const P = {
    token: lerLocal(CH_TOKEN, ''), base: null, aba: 'agenda', dia: isoLocal(), semana: [], doSemana: [],
    pendentes: [], clientes: null, mes: isoLocal().slice(0, 7), filtroClientes: ''
  };
  const st = () => P.base.studio;
  const hoje = () => isoLocal();
  const linkApp = (codigo) => new URL(`./?c=${encodeURIComponent(codigo)}`, location.href).href;
  const linkAppBase = () => new URL('./', location.href).href;
  const buscar = (codigo) => P.doSemana.concat(P.pendentes).find((r) => r.codigo === codigo);

  async function api(acao, dados) {
    try { return await API.chamar(acao, dados, P.token); } catch (e) {
      if (e.codigo === 'auth') { encerrarSessao(); toast(e.message, 'erro'); }
      throw e;
    }
  }

  function haQuanto(iso) {
    const min = Math.round((Date.now() - new Date(iso)) / 60000);
    if (min < 60) return `há ${Math.max(1, min)} min`;
    const h = Math.round(min / 60);
    return h < 48 ? `há ${h} h` : `há ${Math.round(h / 24)} dias`;
  }
  const horasDesde = (iso) => (Date.now() - new Date(iso)) / 36e5;
  function segundaDe(d) { const x = paraData(d); return somarDias(d, -((x.getDay() + 6) % 7)); }

  // ---------- entrada ----------
  function telaLogin() {
    raiz.innerHTML = `
      <div class="login">
        <div class="login-caixa">
          <div class="login-marca" aria-hidden="true"><img src="assets/sol.webp" alt="" width="760" height="400"><img src="assets/letreiro.webp" alt="" width="1200" height="369"></div>
          <p class="sobretitulo">Área do studio</p>
          <form id="form-login" class="form-login">
            <label class="campo"><span>Senha</span><input class="entrada" type="password" name="senha" autocomplete="current-password" required></label>
            <button class="btn btn-ouro btn-bloco" type="submit">${icone('cadeado')}Entrar</button>
          </form>
          <a class="btn-texto" href="./">Ir para o app das clientes</a>
        </div>
      </div>`;
    entrarTela($('.login-caixa'), 0);
    const f = $('#form-login');
    f.senha.focus();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      comCarga($('button', f), async () => {
        try {
          const r = await API.chamar('entrar', { senha: f.senha.value });
          P.token = r.token;
          gravarLocal(CH_TOKEN, r.token);
          await iniciar();
        } catch (err) {
          toast(err.message, 'erro');
          f.senha.select();
        }
      });
    });
  }

  function encerrarSessao() {
    P.token = '';
    try { localStorage.removeItem(CH_TOKEN); } catch { /* sem armazenamento */ }
    telaLogin();
  }

  async function sair() {
    if (!await confirmar({ titulo: 'Sair do painel?', ok: 'Sair', cancelar: 'Ficar' })) return;
    API.chamar('sair', {}, P.token).catch(() => null);
    encerrarSessao();
  }

  async function iniciar() {
    raiz.innerHTML = `<div class="carregando-painel"><img src="assets/sol.webp" alt="" width="760" height="400"><p class="sobretitulo">Abrindo a agenda</p></div>`;
    try {
      const [base, pend] = await Promise.all([api('painel'), api('pendentes')]);
      P.base = base; P.pendentes = pend; P.dia = base.hoje;
      montarCasca();
      irAba(location.hash.replace('#', '') || 'agenda');
    } catch (e) {
      if (e.codigo !== 'auth') raiz.innerHTML = `<div class="carregando-painel"><p>${esc(e.message)}</p><button class="btn btn-fantasma" data-acao="reiniciar">${icone('atualizar')}Tentar de novo</button></div>`;
    }
  }

  // ---------- casca ----------
  function montarCasca() {
    const nav = (cls) => ABAS.map((a) => `
      <button class="${cls}" data-acao="aba" data-aba="${a.id}">${icone(a.icone)}<span>${cls === 'nav-baixo-item' ? (a.curto || a.nome) : a.nome}</span>${a.id === 'sinais' ? '<b class="contador" data-contador></b>' : ''}</button>`).join('');
    raiz.innerHTML = `
      <div class="painel">
        <aside class="lateral">
          <div class="lateral-marca"><img src="assets/sol.webp" alt="" width="760" height="400"><img src="assets/letreiro.webp" alt="${esc(st().nome)}" width="1200" height="369"></div>
          <nav class="nav">${nav('nav-item')}</nav>
          <div class="lateral-pe">
            <a class="nav-item" href="./" target="_blank" rel="noopener">${icone('link')}<span>App das clientes</span></a>
            <button class="nav-item" data-acao="sair">${icone('sair')}<span>Sair</span></button>
          </div>
        </aside>
        <main class="principal">
          <header class="principal-topo">
            <div><p class="sobretitulo" id="topo-sub"></p><h1 id="topo-titulo"></h1></div>
            <div class="topo-acoes">
              <button class="btn btn-ouro btn-pequeno so-largo" data-acao="nova-reserva">${icone('mais')}Nova reserva</button>
              <button class="icone-btn so-estreito" data-acao="sair" aria-label="Sair">${icone('sair')}</button>
            </div>
          </header>
          <section id="conteudo" class="conteudo"></section>
        </main>
        <nav class="nav-baixo">${nav('nav-baixo-item')}</nav>
        <button class="fab so-estreito" data-acao="nova-reserva" aria-label="Nova reserva">${icone('mais')}</button>
      </div>`;
    atualizarContador();
  }

  function atualizarContador() {
    const n = P.pendentes.length;
    $$('[data-contador]').forEach((b) => { b.textContent = n || ''; b.hidden = !n; });
  }

  function irAba(id) {
    if (!ABAS.some((a) => a.id === id)) id = 'agenda';
    P.aba = id;
    $('.painel').dataset.aba = id;
    history.replaceState(null, '', `#${id}`);
    $$('[data-aba]').forEach((b) => b.classList.toggle('ativo', b.dataset.aba === id));
    const a = ABAS.find((x) => x.id === id);
    $('#topo-titulo').textContent = a.nome;
    $('#topo-sub').textContent = st().nome;
    window.scrollTo(0, 0);
    ({ agenda: abaAgenda, sinais: abaSinais, visao: abaVisao, servicos: abaServicos, ajustes: abaAjustes })[id]();
  }

  function pintar(html) {
    const c = $('#conteudo');
    c.innerHTML = html;
    entrarTela(c, 0);
    return c;
  }

  const esqueleto = (n = 3, h = 120) => Array.from({ length: n }, () => `<div class="esqueleto" style="height:${h}px"></div>`).join('');
  const erroBloco = (msg) => `<div class="vazio">${icone('alerta')}<h3>Não carregou</h3><p>${esc(msg)}</p><button class="btn btn-fantasma" data-acao="recarregar">${icone('atualizar')}Tentar de novo</button></div>`;

  // ---------- agenda ----------
  async function abaAgenda() {
    const inicio = segundaDe(P.dia);
    P.semana = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
    pintar(`
      <div class="semana-topo">
        <button class="icone-btn" data-acao="semana" data-passo="-7" aria-label="Semana anterior">${icone('esquerda')}</button>
        <p class="semana-rotulo">${esc(rotuloSemana())}</p>
        <button class="icone-btn" data-acao="semana" data-passo="7" aria-label="Próxima semana">${icone('direita')}</button>
        <button class="btn btn-sutil btn-pequeno" data-acao="hoje">Hoje</button>
      </div>
      <div class="semana" id="semana">${P.semana.map((d) => htmlDiaSemana(d, null)).join('')}</div>
      <div id="dia-resumo" class="dia-resumo"></div>
      <div id="lista-dia" class="lista-dia">${esqueleto(3, 130)}</div>`);
    try {
      P.doSemana = await api('agendaStudio', { de: P.semana[0], ate: P.semana[6] });
      if (P.aba !== 'agenda') return;
      $('#semana').innerHTML = P.semana.map((d) => htmlDiaSemana(d, P.doSemana)).join('');
      pintarDia();
    } catch (e) {
      if (P.aba === 'agenda') $('#lista-dia').innerHTML = erroBloco(e.message);
    }
  }

  function rotuloSemana() {
    const a = paraData(P.semana[0]), b = paraData(P.semana[6]);
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()} a ${b.getDate()} de ${MESES[b.getMonth()]}`
      : `${a.getDate()} ${MESES[a.getMonth()].slice(0, 3)} a ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3)}`;
  }

  function htmlDiaSemana(d, lista) {
    const x = paraData(d);
    const n = lista ? lista.filter((r) => r.data === d && r.status !== 'cancelado').length : 0;
    return `<button class="sem-dia${d === P.dia ? ' sel' : ''}${d === hoje() ? ' hoje' : ''}" data-acao="dia" data-data="${d}" aria-pressed="${d === P.dia}">
      <span>${SEMANA_CURTA[x.getDay()]}</span><strong>${x.getDate()}</strong><i>${lista ? (n ? n : '&middot;') : ''}</i></button>`;
  }

  function pintarDia() {
    const lista = P.doSemana.filter((r) => r.data === P.dia);
    const ativos = lista.filter((r) => r.status !== 'cancelado');
    const previsto = ativos.filter((r) => r.status !== 'faltou').reduce((a, r) => a + r.total, 0);
    const pend = ativos.filter((r) => r.status === 'aguardando').length;
    $('#dia-resumo').innerHTML = `
      <h2>${esc(maiuscula(dataLonga(P.dia)))}</h2>
      <p>${ativos.length ? `${ativos.length} ${ativos.length === 1 ? 'atendimento' : 'atendimentos'} · ${moeda(previsto)}${pend ? ` · <span class="texto-alerta">${pend} sinal pendente${pend > 1 ? 's' : ''}</span>` : ''}` : 'Nenhum atendimento marcado'}</p>`;
    const el = $('#lista-dia');
    el.innerHTML = lista.length ? lista.map(cartaoReserva).join('') : `
      <div class="vazio">${icone('lua')}<h3>Dia livre</h3><p>Nenhuma reserva para este dia.</p>
        <button class="btn btn-fantasma" data-acao="nova-reserva">${icone('mais')}Criar reserva</button></div>`;
    entrarTela(el, 0);
  }

  function aniversario(r) {
    if (!r.nascimento) return '';
    const n = r.nascimento.slice(5), d = r.data.slice(5);
    if (n === d) return 'Faz aniversário no dia do atendimento';
    if (n.slice(0, 2) === d.slice(0, 2)) return `Aniversário dia ${Number(n.slice(3))}`;
    return '';
  }

  function cartaoReserva(r) {
    const niver = aniversario(r);
    return `
      <article class="ag-cartao st-${esc(r.status)}">
        <div class="ag-hora"><strong>${esc(r.hora)}</strong><span>${horaFim(r.hora, r.duracao)}</span></div>
        <div class="ag-info">
          <div class="ag-linha1"><h3>${esc(r.cliente)}</h3>${chipStatus(r.status)}</div>
          <p class="ag-servicos">${esc(r.servicos)}</p>
          <p class="ag-meta">${moeda(r.total)} · sinal ${moeda(r.sinal)} · ${duracaoTexto(r.duracao)} · ${r.origem === 'studio' ? 'pelo studio' : 'pelo app'}</p>
          ${niver ? `<p class="ag-niver">${icone('bolo')}${esc(niver)}</p>` : ''}
          ${r.obs ? `<p class="ag-obs">${esc(r.obs)}</p>` : ''}
          <div class="ag-acoes">${acoesRapidas(r)}</div>
        </div>
      </article>`;
  }

  function acoesRapidas(r) {
    const c = esc(r.codigo);
    const mais = `<button class="btn btn-sutil btn-pequeno" data-acao="mais" data-codigo="${c}" aria-label="Mais ações">${icone('lista')}Mais</button>`;
    if (r.status === 'aguardando') {
      return `<button class="btn btn-ouro btn-pequeno" data-acao="status" data-status="confirmado" data-codigo="${c}">${icone('check')}Sinal recebido</button>
        <a class="btn btn-sutil btn-pequeno" href="${whats(r, 'sinal')}" target="_blank" rel="noopener">${icone('mensagem')}Enviar Pix</a>${mais}`;
    }
    if (r.status === 'confirmado') {
      return `<button class="btn btn-fantasma btn-pequeno" data-acao="status" data-status="concluido" data-codigo="${c}">${icone('brilho')}Concluir</button>
        <a class="btn btn-sutil btn-pequeno" href="${whats(r, 'lembrete')}" target="_blank" rel="noopener">${icone('mensagem')}Lembrete</a>${mais}`;
    }
    return mais;
  }

  const whats = (r, tipo) => linkWhats(r.whatsapp, msgParaCliente(r, st(), tipo, linkApp(r.codigo)));

  async function mudarStatus(codigo, status, forcar) {
    const r = buscar(codigo);
    const textos = {
      cancelado: ['Cancelar esta reserva?', 'O horário volta a ficar livre no app.', 'Cancelar reserva', true],
      faltou: ['Marcar como não compareceu?', 'O sinal fica registrado como recebido no resumo do mês.', 'Marcar falta', true],
      concluido: null, confirmado: null, aguardando: null
    };
    const t = textos[status];
    if (t && !await confirmar({ titulo: t[0], texto: t[1], ok: t[2], perigo: t[3] })) return;
    try {
      const novo = await api('status', { codigo, status, forcar: !!forcar });
      substituirLocal(novo);
      if (status === 'confirmado') {
        P.pendentes = P.pendentes.filter((x) => x.codigo !== codigo);
        oferecerMensagem(novo, 'confirmado', 'Sinal confirmado', 'Quer avisar a cliente pelo WhatsApp que o horário está confirmado?');
      } else {
        toast(`Reserva marcada como ${STATUS[status].rotulo.toLowerCase()}.`, 'ok');
        if (status !== 'aguardando') P.pendentes = P.pendentes.filter((x) => x.codigo !== codigo);
      }
      if (status === 'aguardando') P.pendentes = await api('pendentes');
      atualizarContador();
      recarregarAba();
    } catch (e) {
      if (/ocupado/.test(e.message) && r) {
        if (await confirmar({ titulo: 'Horário ocupado', texto: `${e.message} Quer reativar mesmo assim, como encaixe?`, ok: 'Reativar assim mesmo' })) mudarStatus(codigo, status, true);
      } else toast(e.message, 'erro');
    }
  }

  function substituirLocal(novo) {
    [P.doSemana, P.pendentes].forEach((lista) => {
      const i = lista.findIndex((x) => x.codigo === novo.codigo);
      if (i >= 0) lista[i] = Object.assign({}, lista[i], novo);
    });
  }

  function oferecerMensagem(r, tipo, titulo, texto) {
    const f = abrirFolha({
      titulo, classe: 'folha-confirmar',
      corpo: `<p class="folha-texto">${esc(texto)}</p>
        <div class="folha-acoes">
          <a class="btn btn-ouro btn-bloco" href="${whats(r, tipo)}" target="_blank" rel="noopener" data-fecha>${icone('mensagem')}Enviar no WhatsApp</a>
          <button class="btn btn-fantasma btn-bloco" data-fecha>Agora não</button>
        </div>`
    });
    $$('[data-fecha]', f.el).forEach((b) => b.addEventListener('click', () => setTimeout(f.fechar, 50)));
  }

  function maisAcoes(codigo) {
    const r = buscar(codigo);
    if (!r) return;
    const ativa = r.status === 'aguardando' || r.status === 'confirmado';
    const itens = [
      r.status === 'aguardando' && ['link', whats(r, 'sinal'), 'mensagem', 'Enviar reserva e Pix no WhatsApp'],
      r.status === 'confirmado' && ['link', whats(r, 'confirmado'), 'mensagem', 'Enviar confirmação no WhatsApp'],
      ativa && ['link', whats(r, 'lembrete'), 'mensagem', 'Enviar lembrete no WhatsApp'],
      r.status === 'aguardando' && ['status', 'confirmado', 'check-circulo', 'Sinal recebido: confirmar'],
      r.status === 'confirmado' && ['status', 'concluido', 'brilho', 'Marcar como concluído'],
      ativa && ['remarcar', '', 'calendario', 'Remarcar'],
      ['obs', '', 'lapis', r.obs ? 'Editar observação' : 'Adicionar observação'],
      ['copiar-link', '', 'link', 'Copiar link da reserva para a cliente'],
      r.status === 'confirmado' && ['status', 'faltou', 'alerta', 'Não compareceu'],
      ativa && ['status', 'cancelado', 'ban', 'Cancelar reserva', 'perigo'],
      (r.status === 'cancelado' || r.status === 'faltou' || r.status === 'concluido') && ['status', 'aguardando', 'atualizar', 'Reabrir como aguardando sinal'],
      r.status === 'concluido' && ['status', 'confirmado', 'atualizar', 'Voltar para confirmado']
    ].filter(Boolean);
    const f = abrirFolha({
      titulo: r.cliente, subtitulo: `${r.codigo} · ${maiuscula(dataLonga(r.data))} às ${r.hora}`,
      corpo: `
        <div class="folha-resumo">
          <p>${esc(r.servicos)}</p>
          <p>${moeda(r.total)} · sinal ${moeda(r.sinal)} · ${esc(mascaraFone(r.whatsapp))}</p>
          ${r.obs ? `<p class="ag-obs">${esc(r.obs)}</p>` : ''}
        </div>
        <div class="menu-acoes">${itens.map(([tipo, valor, ic, rotulo, perigo]) => tipo === 'link'
          ? `<a class="menu-acao" href="${valor}" target="_blank" rel="noopener">${icone(ic)}${esc(rotulo)}</a>`
          : `<button class="menu-acao${perigo ? ' perigo' : ''}" data-tipo="${tipo}" data-valor="${valor}">${icone(ic)}${esc(rotulo)}</button>`).join('')}
        </div>`
    });
    f.el.addEventListener('click', async (e) => {
      const b = e.target.closest('.menu-acao');
      if (!b) return;
      if (b.tagName === 'A') { setTimeout(f.fechar, 50); return; }
      f.fechar();
      const tipo = b.dataset.tipo;
      if (tipo === 'status') setTimeout(() => mudarStatus(r.codigo, b.dataset.valor), 260);
      if (tipo === 'remarcar') setTimeout(() => folhaRemarcar(r), 260);
      if (tipo === 'obs') setTimeout(() => folhaObs(r), 260);
      if (tipo === 'copiar-link') { if (await copiar(linkApp(r.codigo))) toast('Link copiado.', 'ok'); }
    });
  }

  // Busca os horários livres e preenche um <select>.
  async function preencherHorarios(sel, data, duracao, ignorar) {
    sel.innerHTML = '<option value="">Carregando...</option>';
    sel.disabled = true;
    try {
      const g = await api('grade', { data, duracao, ignorar });
      sel.innerHTML = g.livres.length
        ? '<option value="">Escolha o horário</option>' + g.livres.map((h) => `<option value="${h}">${h}</option>`).join('')
        : `<option value="">${esc(g.motivo || 'Sem horários livres')}</option>`;
      sel.disabled = !g.livres.length;
    } catch (e) {
      sel.innerHTML = `<option value="">${esc(e.message)}</option>`;
    }
  }

  function camposHorario(data) {
    return `
      <div class="grade-2">
        <label class="campo"><span>Dia</span><input class="entrada" type="date" name="data" value="${data}" required></label>
        <label class="campo campo-hora"><span>Horário</span><select class="entrada" name="hora"></select><input class="entrada" type="time" name="horaLivre" step="300" hidden></label>
      </div>
      <label class="linha-interruptor"><span><b>Encaixe</b><small>Escolher qualquer horário, mesmo fora da grade</small></span><span class="interruptor"><input type="checkbox" name="encaixe"><i></i></span></label>`;
  }

  function ligarHorario(f, duracao, ignorar) {
    const atualizar = () => { if (!f.encaixe.checked && f.data.value) preencherHorarios(f.hora, f.data.value, duracao(), ignorar); };
    f.data.addEventListener('change', atualizar);
    f.encaixe.addEventListener('change', () => {
      f.hora.hidden = f.encaixe.checked;
      f.horaLivre.hidden = !f.encaixe.checked;
      if (!f.encaixe.checked) atualizar();
    });
    atualizar();
    return { atualizar, valor: () => (f.encaixe.checked ? f.horaLivre.value : f.hora.value) };
  }

  function folhaRemarcar(r) {
    const folha = abrirFolha({
      titulo: 'Remarcar', subtitulo: `${r.cliente} · ${duracaoTexto(r.duracao)}`,
      corpo: `<form class="form-folha" novalidate>${camposHorario(r.data)}
        <button class="btn btn-ouro btn-bloco" type="submit">${icone('calendario')}Salvar novo horário</button></form>`
    });
    const f = $('form', folha.el);
    const hora = ligarHorario(f, () => r.duracao, r.codigo);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.data.value || !hora.valor()) { toast('Escolha o dia e o horário.', 'erro'); return; }
      comCarga($('button[type=submit]', f), async () => {
        try {
          const novo = await api('remarcar', { codigo: r.codigo, data: f.data.value, hora: hora.valor(), encaixe: f.encaixe.checked });
          folha.fechar();
          P.dia = novo.data;
          oferecerMensagem(novo, novo.status === 'confirmado' ? 'confirmado' : 'sinal', 'Reserva remarcada', 'Quer enviar o novo horário para a cliente pelo WhatsApp?');
          P.pendentes = await api('pendentes');
          atualizarContador();
          recarregarAba();
        } catch (err) { toast(err.message, 'erro'); }
      });
    });
  }

  function folhaObs(r) {
    const folha = abrirFolha({
      titulo: 'Observação', subtitulo: r.cliente,
      corpo: `<form class="form-folha"><label class="campo"><span>Anotação interna</span><textarea class="entrada" name="obs" maxlength="400" placeholder="Formato, cor, alergias, referência...">${esc(r.obs)}</textarea></label>
        <button class="btn btn-ouro btn-bloco" type="submit">Salvar</button></form>`
    });
    const f = $('form', folha.el);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      comCarga($('button', f), async () => {
        try {
          await api('observacao', { codigo: r.codigo, obs: f.obs.value });
          substituirLocal({ codigo: r.codigo, obs: f.obs.value.trim() });
          folha.fechar();
          toast('Observação salva.', 'ok');
          recarregarAba(true);
        } catch (err) { toast(err.message, 'erro'); }
      });
    });
  }

  async function folhaNovaReserva() {
    const servicos = P.base.servicos.filter((s) => s.ativo);
    const folha = abrirFolha({
      titulo: 'Nova reserva', subtitulo: 'Pelo studio',
      corpo: `<form class="form-folha" novalidate>
        <label class="campo"><span>Cliente</span><input class="entrada" name="nome" list="lista-clientes" autocomplete="off" maxlength="60" placeholder="Nome e sobrenome"></label>
        <datalist id="lista-clientes"></datalist>
        <label class="campo"><span>WhatsApp</span><input class="entrada" name="whatsapp" type="tel" inputmode="tel" placeholder="(88) 99999-9999"></label>
        <fieldset class="campo escolha-servicos"><span>Serviços</span>
          <div class="chips-servicos">${servicos.map((s) => `<label class="chip-escolha"><input type="checkbox" name="servico" value="${esc(s.id)}" data-duracao="${s.duracao}" data-preco="${s.preco}"><span>${esc(s.nome)}<small>${moeda(s.preco)} · ${duracaoTexto(s.duracao)}</small></span></label>`).join('')}</div>
        </fieldset>
        <p class="total-folha" id="total-folha">Escolha os serviços</p>
        ${camposHorario(P.dia >= hoje() ? P.dia : hoje())}
        <label class="campo"><span>Situação</span>
          <select class="entrada" name="status"><option value="aguardando">Aguardando sinal</option><option value="confirmado">Sinal já recebido (confirmada)</option></select></label>
        <label class="campo"><span>Observação <small>opcional</small></span><textarea class="entrada" name="obs" maxlength="400"></textarea></label>
        <button class="btn btn-ouro btn-bloco" type="submit">${icone('brilho')}Criar reserva</button>
      </form>`
    });
    const f = $('form', folha.el);
    const escolhidos = () => $$('input[name=servico]:checked', f);
    const duracao = () => escolhidos().reduce((a, i) => a + Number(i.dataset.duracao), 0);
    const hora = ligarHorario(f, () => Math.max(15, duracao()), '');
    f.whatsapp.addEventListener('input', () => { f.whatsapp.value = mascaraFone(f.whatsapp.value); });
    f.addEventListener('change', (e) => {
      if (e.target.name !== 'servico') return;
      const total = escolhidos().reduce((a, i) => a + Number(i.dataset.preco), 0);
      $('#total-folha').textContent = escolhidos().length
        ? `${moeda(total)} · ${duracaoTexto(duracao())} · sinal ${moeda(Math.round(total * st().sinalPct) / 100)}` : 'Escolha os serviços';
      hora.atualizar();
    });

    if (!P.clientes) P.clientes = await api('clientes').catch(() => []);
    $('#lista-clientes').innerHTML = (P.clientes || []).map((c) => `<option value="${esc(c.nome)}">${esc(mascaraFone(c.whatsapp))}</option>`).join('');
    f.nome.addEventListener('change', () => {
      const c = (P.clientes || []).find((x) => x.nome.toLowerCase() === f.nome.value.trim().toLowerCase());
      if (c && !soDigitos(f.whatsapp.value)) f.whatsapp.value = mascaraFone(c.whatsapp);
    });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const ids = escolhidos().map((i) => i.value);
      if (f.nome.value.trim().length < 2) { toast('Informe o nome da cliente.', 'erro'); return; }
      if (!foneValido(f.whatsapp.value)) { toast('Informe o WhatsApp com DDD.', 'erro'); return; }
      if (!ids.length) { toast('Escolha pelo menos um serviço.', 'erro'); return; }
      if (!f.data.value || !hora.valor()) { toast('Escolha o dia e o horário.', 'erro'); return; }
      comCarga($('button[type=submit]', f), async () => {
        try {
          const r = await api('reservarStudio', {
            nome: f.nome.value, whatsapp: soDigitos(f.whatsapp.value), servicoIds: ids, data: f.data.value,
            hora: hora.valor(), encaixe: f.encaixe.checked, status: f.status.value, obs: f.obs.value
          });
          folha.fechar();
          P.dia = r.data;
          P.clientes = null;
          if (r.status === 'aguardando') P.pendentes.push(r);
          atualizarContador();
          oferecerMensagem(r, r.status === 'confirmado' ? 'confirmado' : 'sinal', 'Reserva criada',
            r.status === 'confirmado' ? 'Quer mandar a confirmação para a cliente?' : 'Quer mandar para a cliente os dados da reserva com a chave Pix do sinal?');
          if (P.aba === 'agenda') abaAgenda(); else irAba('agenda');
        } catch (err) { toast(err.message, 'erro'); }
      });
    });
  }

  // ---------- sinais ----------
  async function abaSinais() {
    pintar(`<p class="intro-aba">Reservas que ainda esperam o Pix do sinal. Confirme assim que o comprovante chegar no WhatsApp.</p><div id="lista-sinais">${esqueleto(3, 120)}</div>`);
    try {
      P.pendentes = await api('pendentes');
      atualizarContador();
      if (P.aba !== 'sinais') return;
      const prazo = Number(st().prazoSinalHoras) || 12;
      $('#lista-sinais').innerHTML = P.pendentes.length ? P.pendentes.map((r) => {
        const atrasado = horasDesde(r.criadoEm) > prazo;
        return `<article class="sinal-cartao${atrasado ? ' atrasado' : ''}">
          <div class="sinal-topo">
            <div><h3>${esc(r.cliente)}</h3><p>${esc(maiuscula(dataLonga(r.data)))} às ${esc(r.hora)}</p></div>
            <strong>${moeda(r.sinal)}</strong>
          </div>
          <p class="ag-servicos">${esc(r.servicos)}</p>
          <p class="sinal-tempo">${icone('ampulheta')}Reservado ${haQuanto(r.criadoEm)}${atrasado ? ' · passou do prazo' : ''}</p>
          <div class="ag-acoes">
            <button class="btn btn-ouro btn-pequeno" data-acao="status" data-status="confirmado" data-codigo="${esc(r.codigo)}">${icone('check')}Sinal recebido</button>
            <a class="btn btn-sutil btn-pequeno" href="${whats(r, 'sinal')}" target="_blank" rel="noopener">${icone('mensagem')}Cobrar</a>
            <button class="btn btn-sutil btn-pequeno" data-acao="mais" data-codigo="${esc(r.codigo)}">${icone('lista')}Mais</button>
          </div>
        </article>`;
      }).join('') : `<div class="vazio">${icone('check-circulo')}<h3>Tudo em dia</h3><p>Nenhum sinal pendente no momento.</p></div>`;
      entrarTela($('#lista-sinais'), 0);
    } catch (e) {
      if (P.aba === 'sinais') $('#lista-sinais').innerHTML = erroBloco(e.message);
    }
  }

  // ---------- visão geral ----------
  async function abaVisao() {
    const [a, m] = P.mes.split('-').map(Number);
    pintar(`
      <div class="semana-topo">
        <button class="icone-btn" data-acao="mes" data-passo="-1" aria-label="Mês anterior">${icone('esquerda')}</button>
        <p class="semana-rotulo">${maiuscula(MESES[m - 1])} de ${a}</p>
        <button class="icone-btn" data-acao="mes" data-passo="1" aria-label="Próximo mês">${icone('direita')}</button>
      </div>
      <div id="visao">${esqueleto(2, 160)}</div>`);
    try {
      const [r, clientes] = await Promise.all([api('resumo', { mes: P.mes }), P.clientes ? P.clientes : api('clientes')]);
      P.clientes = clientes;
      if (P.aba !== 'visao') return;
      const ps = r.porStatus;
      const atend = ps.concluido + ps.confirmado + ps.aguardando;
      const maxSrv = Math.max(1, ...r.topServicos.map((s) => s.qtd));
      const maxDia = Math.max(1, ...r.porDia);
      const ordemDias = [1, 2, 3, 4, 5, 6, 0];
      $('#visao').innerHTML = `
        <div class="kpis">
          <div class="kpi destaque"><span>Faturado</span><strong>${moeda(r.realizado)}</strong><small>${ps.concluido} concluídos de ${atend} reservas no mês</small></div>
          <div class="kpi"><span>A receber</span><strong>${moeda(r.previsto)}</strong><small>${ps.confirmado} confirmadas · ${ps.aguardando} aguardando</small></div>
          <div class="kpi"><span>Sinais recebidos</span><strong>${moeda(r.sinais)}</strong><small>no mês</small></div>
          <div class="kpi"><span>Ticket médio</span><strong>${moeda(r.ticket)}</strong><small>por atendimento</small></div>
          <div class="kpi"><span>Faltas e cancelamentos</span><strong>${ps.faltou + ps.cancelado}</strong><small>${ps.faltou} faltas · ${ps.cancelado} cancelados</small></div>
        </div>
        <div class="visao-grade">
          <section class="painel-bloco">
            <h2>Serviços mais pedidos</h2>
            ${r.topServicos.length ? `<ul class="barras">${r.topServicos.map((s) => `<li><span class="barra-nome">${esc(s.nome)}</span><span class="barra-trilho"><i style="transform:scaleX(${s.qtd / maxSrv})"></i></span><span class="barra-valor">${s.qtd}</span></li>`).join('')}</ul>` : '<p class="dica">Sem atendimentos neste mês.</p>'}
          </section>
          <section class="painel-bloco">
            <h2>Movimento por dia da semana</h2>
            <ul class="barras">${ordemDias.map((d) => `<li><span class="barra-nome">${maiuscula(SEMANA[d])}</span><span class="barra-trilho"><i style="transform:scaleX(${r.porDia[d] / maxDia})"></i></span><span class="barra-valor">${r.porDia[d]}</span></li>`).join('')}</ul>
          </section>
          <section class="painel-bloco">
            <h2>Aniversariantes do mês</h2>
            ${r.aniversariantes.length ? `<ul class="lista-simples">${r.aniversariantes.map((c) => `<li><span>${icone('bolo')}<b>${esc(c.nome)}</b><small>dia ${Number(c.nascimento.slice(8))}</small></span>
              <a class="icone-btn" href="${linkWhats(c.whatsapp, `Olá, ${primeiroNome(c.nome)}! Aqui é do ${st().nome}. Feliz aniversário! Preparamos um mimo para você no seu próximo horário.`)}" target="_blank" rel="noopener" aria-label="Mandar parabéns">${icone('mensagem')}</a></li>`).join('')}</ul>` : '<p class="dica">Nenhuma cliente faz aniversário neste mês, ou a data não foi informada.</p>'}
          </section>
        </div>
        <section class="painel-bloco">
          <div class="bloco-topo"><h2>Clientes</h2><span class="dica">${clientes.length} no total</span></div>
          <input class="entrada busca" type="search" id="busca-clientes" placeholder="Buscar por nome ou WhatsApp" value="${esc(P.filtroClientes)}">
          <ul class="lista-clientes" id="lista-clientes-visao"></ul>
        </section>`;
      pintarClientes();
      $('#busca-clientes').addEventListener('input', (e) => { P.filtroClientes = e.target.value; pintarClientes(); });
      entrarTela($('#visao'), 0);
    } catch (e) {
      if (P.aba === 'visao') $('#visao').innerHTML = erroBloco(e.message);
    }
  }

  function pintarClientes() {
    const q = P.filtroClientes.trim().toLowerCase(), qd = soDigitos(q);
    const lista = P.clientes.filter((c) => !q || c.nome.toLowerCase().includes(q) || (qd && c.whatsapp.includes(qd))).slice(0, 60);
    $('#lista-clientes-visao').innerHTML = lista.length ? lista.map((c) => `
      <li>
        <div><b>${esc(c.nome)}</b><small>${esc(mascaraFone(c.whatsapp))} · ${c.visitas} ${c.visitas === 1 ? 'visita' : 'visitas'}${c.faltas ? ` · ${c.faltas} falta${c.faltas > 1 ? 's' : ''}` : ''}${c.ultima ? ` · última ${dataCurta(c.ultima)}` : ''}</small></div>
        <span class="cliente-gasto">${moeda(c.gasto)}</span>
        <a class="icone-btn" href="${linkWhats(c.whatsapp, `Olá, ${primeiroNome(c.nome)}! Aqui é do ${st().nome}.`)}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(c.nome)}">${icone('mensagem')}</a>
      </li>`).join('') : '<li class="dica">Nenhuma cliente encontrada.</li>';
  }

  // ---------- serviços ----------
  function abaServicos() {
    const lista = P.base.servicos;
    const grupos = [];
    lista.forEach((s, i) => {
      let g = grupos.find((x) => x.nome === s.categoria);
      if (!g) grupos.push(g = { nome: s.categoria, itens: [] });
      g.itens.push(Object.assign({ i }, s));
    });
    pintar(`
      <div class="intro-linha"><p class="intro-aba">O que aparece no app das clientes. Desligue um serviço para escondê-lo sem apagar.</p>
        <button class="btn btn-ouro btn-pequeno" data-acao="editar-servico" data-i="-1">${icone('mais')}Novo serviço</button></div>
      ${grupos.map((g) => `
        <section class="painel-bloco">
          <h2>${esc(g.nome)}</h2>
          <ul class="lista-servicos-adm">${g.itens.map((s) => `
            <li class="${s.ativo ? '' : 'inativo'}">
              <button class="srv-corpo" data-acao="editar-servico" data-i="${s.i}">
                <b>${esc(s.nome)}</b><small>${moeda(s.preco)} · ${duracaoTexto(s.duracao)}</small>
              </button>
              <span class="interruptor" title="${s.ativo ? 'Visível no app' : 'Escondido no app'}"><input type="checkbox" data-alternar-servico="${s.i}" ${s.ativo ? 'checked' : ''} aria-label="Mostrar ${esc(s.nome)} no app"><i></i></span>
            </li>`).join('')}</ul>
        </section>`).join('')}`);
  }

  async function salvarServicos(lista, msg) {
    const anterior = P.base.servicos;
    P.base.servicos = lista;
    try {
      P.base.servicos = await api('salvarServicos', { lista });
      toast(msg || 'Serviços salvos.', 'ok');
      return true;
    } catch (e) {
      P.base.servicos = anterior;
      toast(e.message, 'erro');
      return false;
    } finally {
      if (P.aba === 'servicos') abaServicos();
    }
  }

  function folhaServico(i) {
    const novo = i < 0;
    const s = novo ? { nome: '', categoria: '', descricao: '', preco: '', duracao: 60, ativo: true } : P.base.servicos[i];
    const categorias = [...new Set(P.base.servicos.map((x) => x.categoria))];
    const folha = abrirFolha({
      titulo: novo ? 'Novo serviço' : 'Editar serviço', subtitulo: novo ? '' : s.categoria,
      corpo: `<form class="form-folha" novalidate>
        <label class="campo"><span>Nome</span><input class="entrada" name="nome" maxlength="80" value="${esc(s.nome)}" required></label>
        <label class="campo"><span>Categoria</span><input class="entrada" name="categoria" list="lista-categorias" maxlength="40" value="${esc(s.categoria)}" placeholder="Alongamento, Manutenção..."></label>
        <datalist id="lista-categorias">${categorias.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <label class="campo"><span>Descrição <small>aparece para a cliente</small></span><textarea class="entrada" name="descricao" maxlength="240">${esc(s.descricao)}</textarea></label>
        <div class="grade-2">
          <label class="campo"><span>Valor (R$)</span><input class="entrada" name="preco" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(s.preco)}"></label>
          <label class="campo"><span>Duração (min)</span><input class="entrada" name="duracao" type="number" inputmode="numeric" min="5" max="600" step="5" value="${esc(s.duracao)}"></label>
        </div>
        <label class="linha-interruptor"><span><b>Visível no app</b><small>Desligado, o serviço some do menu das clientes</small></span><span class="interruptor"><input type="checkbox" name="ativo" ${s.ativo ? 'checked' : ''}><i></i></span></label>
        <button class="btn btn-ouro btn-bloco" type="submit">Salvar serviço</button>
        ${novo ? '' : `<div class="grade-2">
          <button class="btn btn-sutil" type="button" data-mover="-1">${icone('cima')}Subir</button>
          <button class="btn btn-sutil" type="button" data-mover="1">${icone('baixo')}Descer</button>
        </div>
        <button class="btn btn-texto texto-perigo" type="button" data-excluir>Excluir serviço</button>`}
      </form>`
    });
    const f = $('form', folha.el);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const item = {
        id: s.id || '', nome: f.nome.value.trim(), categoria: f.categoria.value.trim() || 'Serviços', descricao: f.descricao.value.trim(),
        preco: Number(f.preco.value || 0), duracao: Number(f.duracao.value || 0), ativo: f.ativo.checked
      };
      if (!item.nome) { toast('Dê um nome ao serviço.', 'erro'); return; }
      if (!(item.duracao >= 5)) { toast('Informe a duração em minutos.', 'erro'); return; }
      const lista = P.base.servicos.slice();
      if (novo) {
        // novo serviço entra no fim da sua categoria
        const ultimo = lista.map((x) => x.categoria).lastIndexOf(item.categoria);
        lista.splice(ultimo >= 0 ? ultimo + 1 : lista.length, 0, item);
      } else lista[i] = item;
      comCarga($('button[type=submit]', f), async () => { if (await salvarServicos(lista, 'Serviço salvo.')) folha.fechar(); });
    });
    if (novo) return;
    $$('[data-mover]', f).forEach((b) => b.addEventListener('click', async () => {
      const lista = P.base.servicos.slice(), j = i + Number(b.dataset.mover);
      if (j < 0 || j >= lista.length) return;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      folha.fechar();
      salvarServicos(lista, 'Ordem atualizada.');
    }));
    $('[data-excluir]', f).addEventListener('click', async () => {
      folha.fechar();
      if (!await confirmar({ titulo: `Excluir ${s.nome}?`, texto: 'Reservas antigas continuam com o nome do serviço. Se for só uma pausa, prefira desligar.', ok: 'Excluir', perigo: true })) return;
      salvarServicos(P.base.servicos.filter((_, k) => k !== i), 'Serviço excluído.');
    });
  }

  // ---------- ajustes ----------
  function abaAjustes() {
    const s = st(), hs = P.base.horarios;
    const ordem = [1, 2, 3, 4, 5, 6, 0];
    const campo = (k, rotulo, extra = '', dica = '') => `<label class="campo"><span>${rotulo}${dica ? ` <small>${dica}</small>` : ''}</span><input class="entrada" name="${k}" value="${esc(s[k])}" ${extra}></label>`;
    pintar(`
      <form id="form-ajustes" class="ajustes" novalidate>
        <section class="painel-bloco">
          <h2>Link do app das clientes</h2>
          <p class="dica">Coloque na bio do Instagram e mande para as clientes.</p>
          <div class="link-app"><code>${esc(linkAppBase())}</code></div>
          <div class="grade-2">
            <button class="btn btn-fantasma" type="button" data-acao="copiar-link-app">${icone('copiar')}Copiar</button>
            <button class="btn btn-fantasma" type="button" data-acao="compartilhar-app">${icone('compartilhar')}Compartilhar</button>
          </div>
        </section>

        <section class="painel-bloco">
          <h2>Studio</h2>
          ${campo('nome', 'Nome', 'maxlength="60"')}
          ${campo('slogan', 'Frase abaixo da logo', 'maxlength="80"')}
          <div class="grade-2">
            <label class="campo"><span>WhatsApp do studio</span><input class="entrada" name="whatsapp" type="tel" inputmode="tel" value="${esc(mascaraFone(s.whatsapp))}"></label>
            ${campo('instagram', 'Instagram', 'maxlength="40" placeholder="arcananail"', 'sem @')}
          </div>
          ${campo('endereco', 'Endereço', 'maxlength="160" placeholder="Rua, número, bairro, cidade"', 'opcional')}
          ${campo('mapa', 'Link do Google Maps', 'maxlength="160" placeholder="https://maps.app.goo.gl/..."', 'opcional')}
        </section>

        <section class="painel-bloco">
          <h2>Pix e sinal</h2>
          <div class="grade-2">
            ${campo('pixChave', 'Chave Pix', 'maxlength="80"')}
            <label class="campo"><span>Tipo da chave</span><select class="entrada" name="pixTipo">${Object.entries(TIPOS_PIX).map(([k, v]) => `<option value="${k}" ${s.pixTipo === k ? 'selected' : ''}>${maiuscula(v)}</option>`).join('')}</select></label>
          </div>
          <div class="grade-2">
            ${campo('pixNome', 'Nome do recebedor', 'maxlength="25"', 'até 25 letras')}
            ${campo('pixCidade', 'Cidade do recebedor', 'maxlength="15"')}
          </div>
          <div class="grade-2">
            ${campo('sinalPct', 'Sinal (%)', 'type="number" min="0" max="100" step="1" inputmode="numeric"')}
            ${campo('prazoSinalHoras', 'Prazo para o sinal (h)', 'type="number" min="1" max="168" inputmode="numeric"')}
          </div>
          <p class="dica">O nome e a cidade entram no Pix copia e cola. Use o nome do titular da conta, sem acentos.</p>
        </section>

        <section class="painel-bloco">
          <h2>Agenda</h2>
          <div class="grade-3">
            <label class="campo"><span>Intervalo</span><select class="entrada" name="intervalo">${[15, 20, 30, 45, 60].map((v) => `<option value="${v}" ${Number(s.intervalo) === v ? 'selected' : ''}>${v} min</option>`).join('')}</select></label>
            ${campo('antecedenciaHoras', 'Antecedência (h)', 'type="number" min="0" max="72" inputmode="numeric"')}
            ${campo('diasAgenda', 'Agenda aberta (dias)', 'type="number" min="7" max="120" inputmode="numeric"')}
          </div>
          <div class="horarios-semana">
            <div class="hs-cab"><span>Dia</span><span>Abre</span><span>Fecha</span><span>Pausa</span><span>Volta</span></div>
            ${ordem.map((d) => { const h = hs[d]; return `
              <div class="hs-linha${h.aberto ? '' : ' fechado'}" data-dia="${d}">
                <label class="hs-dia"><span class="interruptor"><input type="checkbox" name="aberto-${d}" ${h.aberto ? 'checked' : ''}><i></i></span>${SEMANA_CURTA[d]}</label>
                <input class="entrada" type="time" name="inicio-${d}" value="${esc(h.inicio)}" aria-label="Abre ${SEMANA[d]}">
                <input class="entrada" type="time" name="fim-${d}" value="${esc(h.fim)}" aria-label="Fecha ${SEMANA[d]}">
                <input class="entrada" type="time" name="pausaInicio-${d}" value="${esc(h.pausaInicio)}" aria-label="Pausa ${SEMANA[d]}">
                <input class="entrada" type="time" name="pausaFim-${d}" value="${esc(h.pausaFim)}" aria-label="Volta da pausa ${SEMANA[d]}">
              </div>`; }).join('')}
          </div>
          <p class="dica">Deixe a pausa em branco se não houver intervalo de almoço.</p>
        </section>

        <section class="painel-bloco">
          <h2>Folgas e feriados</h2>
          <ul class="lista-folgas" id="lista-folgas"></ul>
          <div class="folga-nova">
            <input class="entrada" type="date" id="folga-data" min="${hoje()}" aria-label="Data da folga">
            <input class="entrada" id="folga-motivo" maxlength="80" placeholder="Motivo (opcional)" aria-label="Motivo">
            <button class="btn btn-sutil" type="button" data-acao="add-folga">${icone('mais')}Adicionar</button>
          </div>
        </section>

        <section class="painel-bloco">
          <h2>Textos do app</h2>
          <label class="campo"><span>Apresentação</span><textarea class="entrada" name="boasVindas" maxlength="400">${esc(s.boasVindas)}</textarea></label>
          <label class="campo"><span>Política de sinal e remarcação</span><textarea class="entrada" name="politica" maxlength="1200" rows="6">${esc(s.politica)}</textarea></label>
        </section>

        <div class="salvar-fixo"><button class="btn btn-ouro btn-bloco" type="submit">${icone('check')}Salvar ajustes</button></div>
      </form>

      <section class="painel-bloco">
        <h2>Senha do painel</h2>
        <form id="form-senha" class="form-folha" novalidate>
          <div class="grade-2">
            <label class="campo"><span>Senha atual</span><input class="entrada" type="password" name="atual" autocomplete="current-password"></label>
            <label class="campo"><span>Nova senha</span><input class="entrada" type="password" name="nova" autocomplete="new-password" minlength="6"></label>
          </div>
          <button class="btn btn-fantasma" type="submit">${icone('cadeado')}Trocar senha</button>
        </form>
      </section>
      ${API.demo ? `<section class="painel-bloco"><h2>Demonstração</h2><p class="dica">Apaga as reservas de teste e volta aos dados de exemplo.</p><button class="btn btn-perigo" data-acao="reiniciar-demo">Restaurar dados de exemplo</button></section>` : ''}`);

    P.folgas = P.base.bloqueios.slice();
    pintarFolgas();
    const f = $('#form-ajustes');
    f.whatsapp.addEventListener('input', () => { f.whatsapp.value = mascaraFone(f.whatsapp.value); });
    f.addEventListener('change', (e) => {
      const m = /^aberto-(\d)$/.exec(e.target.name || '');
      if (m) $(`.hs-linha[data-dia="${m[1]}"]`).classList.toggle('fechado', !e.target.checked);
    });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const studio = {};
      ['nome', 'slogan', 'whatsapp', 'instagram', 'endereco', 'mapa', 'pixChave', 'pixTipo', 'pixNome', 'pixCidade', 'sinalPct',
        'prazoSinalHoras', 'intervalo', 'antecedenciaHoras', 'diasAgenda', 'boasVindas', 'politica'].forEach((k) => { studio[k] = f[k].value.trim(); });
      studio.whatsapp = soDigitos(studio.whatsapp);
      const horarios = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        dia: d, aberto: f[`aberto-${d}`].checked, inicio: f[`inicio-${d}`].value, fim: f[`fim-${d}`].value,
        pausaInicio: f[`pausaInicio-${d}`].value, pausaFim: f[`pausaFim-${d}`].value
      }));
      comCarga($('button[type=submit]', f), async () => {
        try {
          P.base = await api('salvarAjustes', { studio, horarios, bloqueios: P.folgas });
          toast('Ajustes salvos.', 'ok');
          $('#topo-sub').textContent = st().nome;
        } catch (err) { toast(err.message, 'erro'); }
      });
    });

    const fs = $('#form-senha');
    fs.addEventListener('submit', (e) => {
      e.preventDefault();
      if (fs.nova.value.length < 6) { toast('A nova senha precisa de pelo menos 6 caracteres.', 'erro'); return; }
      comCarga($('button', fs), async () => {
        try {
          const r = await api('trocarSenha', { atual: fs.atual.value, nova: fs.nova.value });
          P.token = r.token; gravarLocal(CH_TOKEN, r.token);
          fs.reset();
          toast('Senha alterada. Outros aparelhos vão precisar entrar de novo.', 'ok');
        } catch (err) { toast(err.message, 'erro'); }
      });
    });
  }

  function pintarFolgas() {
    const futuras = P.folgas.filter((b) => b.data >= hoje()).sort((a, b) => (a.data < b.data ? -1 : 1));
    $('#lista-folgas').innerHTML = futuras.length ? futuras.map((b) => `
      <li><span><b>${esc(maiuscula(dataLonga(b.data)))}</b>${b.motivo ? `<small>${esc(b.motivo)}</small>` : ''}</span>
        <button class="icone-btn" type="button" data-acao="rem-folga" data-data="${b.data}" aria-label="Remover folga">${icone('lixo')}</button></li>`).join('')
      : '<li class="dica">Nenhuma folga marcada. Os dias aqui ficam fechados no app.</li>';
  }

  // ---------- ações ----------
  function recarregarAba() { irAba(P.aba); }

  const ACOES = {
    aba: (b) => irAba(b.dataset.aba),
    sair,
    reiniciar: iniciar,
    recarregar: recarregarAba,
    'nova-reserva': () => folhaNovaReserva(),
    semana: (b) => { P.dia = somarDias(P.dia, Number(b.dataset.passo)); abaAgenda(); },
    hoje: () => { P.dia = hoje(); abaAgenda(); },
    dia: (b) => {
      P.dia = b.dataset.data;
      $$('.sem-dia').forEach((x) => { const s = x === b; x.classList.toggle('sel', s); x.setAttribute('aria-pressed', String(s)); });
      pintarDia();
    },
    mes: (b) => {
      const [a, m] = P.mes.split('-').map(Number), d = new Date(a, m - 1 + Number(b.dataset.passo), 1);
      P.mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      abaVisao();
    },
    status: (b) => mudarStatus(b.dataset.codigo, b.dataset.status),
    mais: (b) => maisAcoes(b.dataset.codigo),
    'editar-servico': (b) => folhaServico(Number(b.dataset.i)),
    'copiar-link-app': async (b) => { if (await copiar(linkAppBase())) feedbackBotao(b, `${icone('check')}Copiado`); else toast('Não foi possível copiar.', 'erro'); },
    'compartilhar-app': async () => {
      const dados = { title: st().nome, text: `Reserve seu horário no ${st().nome}:`, url: linkAppBase() };
      if (navigator.share) { try { await navigator.share(dados); } catch { /* cancelado */ } } else if (await copiar(linkAppBase())) toast('Link copiado.', 'ok');
    },
    'add-folga': () => {
      const d = $('#folga-data').value;
      if (!d) { toast('Escolha a data da folga.', 'erro'); return; }
      P.folgas = P.folgas.filter((x) => x.data !== d).concat({ data: d, motivo: $('#folga-motivo').value.trim() });
      $('#folga-data').value = ''; $('#folga-motivo').value = '';
      pintarFolgas();
      toast('Folga adicionada. Toque em Salvar ajustes para valer.');
    },
    'rem-folga': (b) => { P.folgas = P.folgas.filter((x) => x.data !== b.dataset.data); pintarFolgas(); },
    'reiniciar-demo': async () => {
      if (!await confirmar({ titulo: 'Restaurar a demonstração?', texto: 'Todas as reservas de teste deste aparelho serão substituídas pelos dados de exemplo.', ok: 'Restaurar', perigo: true })) return;
      window.ArcanaDemo.reiniciar();
      try { localStorage.removeItem('arcana-vitrine'); } catch { /* sem armazenamento */ }
      encerrarSessao();
    }
  };

  raiz.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-acao]');
    if (!alvo || alvo.disabled) return;
    const fn = ACOES[alvo.dataset.acao];
    if (fn) { e.preventDefault(); fn(alvo); }
  });

  raiz.addEventListener('change', (e) => {
    const i = e.target.dataset.alternarServico;
    if (i === undefined) return;
    const lista = P.base.servicos.slice();
    lista[Number(i)] = Object.assign({}, lista[Number(i)], { ativo: e.target.checked });
    salvarServicos(lista, e.target.checked ? 'Serviço visível no app.' : 'Serviço escondido do app.');
  });

  avisoDemo('painel');
  if (P.token) iniciar(); else telaLogin();
})();
