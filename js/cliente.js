/* Arcana Nail — app da cliente */
(() => {
  const app = $('#app');
  const CH = { perfil: 'arcana-perfil', reservas: 'arcana-reservas', vitrine: 'arcana-vitrine' };
  const PADRAO = {
    nome: 'Arcana Nail', slogan: 'Alongamento e unhas alternativas', whatsapp: '88996130002', sinalPct: 20, prazoSinalHoras: 12,
    boasVindas: 'Alongamento, manutenção e unhas alternativas com hora marcada. Escolha o serviço, reserve o horário e garanta a sua vaga com um sinal via Pix.',
    politica: '', instagram: '', endereco: '', mapa: '', pixChave: '', pixTipo: 'telefone'
  };
  const S = {
    vitrine: lerLocal(CH.vitrine), pedidoVitrine: null,
    carrinho: [], agenda: null, agendaChave: '', agendaEm: 0, dia: '', hora: '',
    passo: 1, dados: null, aceite: false, reservas: {}, recem: '', rotaAnterior: ''
  };
  let introFeita = false;
  try { introFeita = sessionStorage.getItem('arcana-intro') === '1'; } catch { /* sem sessão */ }

  const studio = () => Object.assign({}, PADRAO, S.vitrine && S.vitrine.studio);
  const servicoPorId = (id) => S.vitrine && S.vitrine.servicos.find((s) => s.id === id);
  const perfil = () => lerLocal(CH.perfil, {});
  const minhasReservas = () => lerLocal(CH.reservas, []);
  const hoje = () => isoLocal();
  const horaAgora = () => new Date().toTimeString().slice(0, 5);

  function lembrarReserva(r) {
    const lista = minhasReservas().filter((x) => x.codigo !== r.codigo);
    lista.unshift({ codigo: r.codigo, whatsapp: r.whatsapp });
    gravarLocal(CH.reservas, lista.slice(0, 20));
  }

  function garantirVitrine(forcar) {
    if (!S.pedidoVitrine || forcar) {
      S.pedidoVitrine = API.chamar('vitrine').then((v) => {
        S.vitrine = v;
        gravarLocal(CH.vitrine, v);
        return v;
      }).catch((e) => { S.pedidoVitrine = null; throw e; });
    }
    return S.pedidoVitrine;
  }

  function agrupar(lista) {
    const m = new Map();
    lista.forEach((s) => { if (!m.has(s.categoria)) m.set(s.categoria, []); m.get(s.categoria).push(s); });
    return [...m].map(([nome, itens]) => ({ nome, itens }));
  }

  function totais() {
    const lista = S.carrinho.map(servicoPorId).filter(Boolean);
    const total = lista.reduce((a, s) => a + s.preco, 0);
    const duracao = lista.reduce((a, s) => a + s.duracao, 0);
    return { lista, total, duracao, sinal: Math.round(total * studio().sinalPct) / 100 };
  }

  function erroBloco(msg, acao) {
    return `<div class="vazio">${icone('alerta')}<h3>Não carregou</h3><p>${esc(msg)}</p>
      <button class="btn btn-fantasma" data-acao="${acao}">${icone('atualizar')}Tentar de novo</button></div>`;
  }

  // ---------- rotas ----------
  const ORDEM = { inicio: 0, meus: 1, reservar: 2, reserva: 3 };
  function rota() {
    const [nome, arg] = location.hash.replace(/^#\/?/, '').split('/');
    return { nome: ORDEM[nome] !== undefined ? nome : 'inicio', arg: decodeURIComponent(arg || '') };
  }

  function navegar() {
    const { nome, arg } = rota();
    const mesmaTela = nome === 'reservar' && S.rotaAnterior === 'reservar' && $('.tela-reserva', app);
    const dir = Math.sign((ORDEM[nome] || 0) - (ORDEM[S.rotaAnterior] || 0));
    S.rotaAnterior = nome;
    if (!mesmaTela) {
      document.body.classList.remove('com-barra');
      window.scrollTo(0, 0);
    }
    ({ inicio: telaInicio, reservar: telaReservar, reserva: telaReserva, meus: telaMeus })[nome](arg, dir);
  }

  // ---------- início ----------
  function htmlMenu() {
    if (!S.vitrine) return Array.from({ length: 6 }, () => '<div class="esqueleto" style="height:76px"></div>').join('');
    return agrupar(S.vitrine.servicos).map((c, i) => `
      <div class="arcano surgir">
        <header class="arcano-topo"><span class="numeral">${romano(i + 1)}</span><h3>${esc(c.nome)}</h3></header>
        <ul class="menu-lista">${c.itens.map((s) => `
          <li><button class="menu-item" data-acao="escolher" data-id="${esc(s.id)}">
            <span class="menu-linha"><span class="menu-nome">${esc(s.nome)}</span><span class="pontilhado" aria-hidden="true"></span><span class="menu-preco">${moeda(s.preco)}</span></span>
            <span class="menu-desc">${esc(s.descricao)}</span>
            <span class="menu-rodape"><span class="menu-tempo">${icone('relogio')}${duracaoTexto(s.duracao)}</span><span class="menu-add">Reservar${icone('direita')}</span></span>
          </button></li>`).join('')}
        </ul>
      </div>`).join('');
  }

  function htmlContato() {
    const st = studio();
    return `
      <a class="btn btn-fantasma btn-bloco" href="${linkWhats(st.whatsapp, `Olá, ${st.nome}! Tenho uma dúvida sobre os serviços.`)}" target="_blank" rel="noopener">${icone('mensagem')}Chamar no WhatsApp</a>
      ${st.instagram ? `<a class="btn btn-sutil btn-bloco" href="https://instagram.com/${encodeURIComponent(st.instagram)}" target="_blank" rel="noopener">${icone('instagram')}@${esc(st.instagram)}</a>` : ''}
      ${st.endereco ? `<a class="btn btn-sutil btn-bloco endereco" href="${esc(st.mapa || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(st.endereco))}" target="_blank" rel="noopener">${icone('local')}<span>${esc(st.endereco)}</span></a>` : ''}`;
  }

  function telaInicio(_, dir) {
    const st = studio();
    const intro = !introFeita && !REDUZIR_MOVIMENTO;
    introFeita = true;
    try { sessionStorage.setItem('arcana-intro', '1'); } catch { /* sem sessão */ }

    app.innerHTML = `
    <div class="tela tela-inicio${intro ? ' com-intro' : ''}">
      <header class="topo-inicio">
        <button class="pilula" data-acao="ir" data-destino="meus">${icone('calendario')}Meus horários</button>
      </header>

      <section class="hero">
        <div class="selo" role="img" aria-label="${esc(st.nome)}">
          <div class="sol-halo"></div>
          <img class="sol" src="assets/sol.webp" alt="" width="900" height="469" decoding="async" fetchpriority="high">
          <div class="marca">
            <img src="assets/letreiro.webp" alt="" width="1400" height="428" decoding="async" fetchpriority="high">
            <span class="reflexo" aria-hidden="true"><i></i></span>
          </div>
        </div>
        <p class="sobretitulo revelar" data-campo="slogan">${esc(st.slogan)}</p>
        <h1 class="manchete revelar">Unhas feitas para <em>serem lembradas.</em></h1>
        <p class="lead revelar" data-campo="boasVindas">${esc(st.boasVindas)}</p>
        <div class="acoes-hero revelar" id="acoes-hero">
          <button class="btn btn-ouro btn-bloco" data-acao="reservar">${icone('brilho')}Reservar meu horário</button>
          <button class="btn btn-fantasma btn-bloco" data-acao="rolar" data-alvo="servicos">Ver serviços e valores</button>
        </div>
      </section>

      <section class="secao" id="como">
        <div class="surgir">
          <p class="sobretitulo">Como funciona</p>
          <h2 class="titulo-secao">Três passos até <em>o seu horário</em></h2>
        </div>
        <ol class="passos">
          <li class="surgir"><span class="numeral">I</span><div><h3>Escolha</h3><p>Monte o atendimento com um ou mais serviços. O valor e o tempo aparecem na hora.</p></div></li>
          <li class="surgir"><span class="numeral">II</span><div><h3>Reserve</h3><p>Veja só os horários livres de verdade e fique com o que cabe na sua rotina.</p></div></li>
          <li class="surgir"><span class="numeral">III</span><div><h3>Garanta</h3><p>Pague o sinal de <span data-pct>${st.sinalPct}</span>% via Pix e envie o comprovante pelo WhatsApp. A confirmação chega em seguida.</p></div></li>
        </ol>
      </section>

      <section class="secao" id="servicos">
        <div class="surgir">
          <p class="sobretitulo">O menu</p>
          <h2 class="titulo-secao">Serviços e <em>valores</em></h2>
          <p class="lead">Toque em um serviço para começar a sua reserva.</p>
        </div>
        <div class="menu" id="menu">${htmlMenu()}</div>
      </section>

      <section class="secao" id="politica">
        <details class="politica surgir">
          <summary><span>${icone('bilhete')}Sobre o sinal e remarcações</span>${icone('baixo')}</summary>
          <p id="politica-texto">${esc(st.politica)}</p>
        </details>
      </section>

      <section class="secao contato" id="contato">
        <div class="surgir">
          <p class="sobretitulo">Fale com o studio</p>
          <h2 class="titulo-secao">Na dúvida sobre <em>formato, cor ou arte?</em></h2>
          <p class="lead">Mande a sua referência pelo WhatsApp e a gente indica o serviço certo para você.</p>
        </div>
        <div class="contato-acoes surgir" id="contato-acoes">${htmlContato()}</div>
      </section>

      <footer class="rodape">
        <div class="ornamento">${icone('brilho')}</div>
        <p>${esc(st.nome)} &middot; ${new Date().getFullYear()}</p>
        <a href="painel.html">Área do studio</a>
      </footer>
    </div>
    <div class="cta-flutuante" id="cta-flutuante" aria-hidden="true">
      <button class="btn btn-ouro" data-acao="reservar" tabindex="-1">${icone('brilho')}Reservar horário</button>
    </div>`;

    if (!intro) entrarTela(app.firstElementChild, dir);
    observarSurgimento();
    observarCta();
  }

  function atualizarInicio() {
    if (!$('.tela-inicio', app)) return;
    const st = studio();
    $$('[data-campo]', app).forEach((el) => { el.textContent = st[el.dataset.campo] || ''; });
    $$('[data-pct]', app).forEach((el) => { el.textContent = st.sinalPct; });
    $('#politica-texto').textContent = st.politica;
    $('#contato-acoes').innerHTML = htmlContato();
    $('#menu').innerHTML = htmlMenu();
    observarSurgimento();
  }

  let observadorSurgir = null;
  function observarSurgimento() {
    if (!('IntersectionObserver' in window) || REDUZIR_MOVIMENTO) { $$('.surgir').forEach((el) => el.classList.add('visivel')); return; }
    observadorSurgir = observadorSurgir || new IntersectionObserver((itens) => {
      itens.forEach((i) => { if (i.isIntersecting) { i.target.classList.add('visivel'); observadorSurgir.unobserve(i.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.surgir:not(.visivel)').forEach((el) => observadorSurgir.observe(el));
  }

  function observarCta() {
    const alvo = $('#acoes-hero'), cta = $('#cta-flutuante');
    if (!alvo || !cta || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([i]) => {
      const mostrar = !i.isIntersecting && i.boundingClientRect.top < 0;
      cta.classList.toggle('visivel', mostrar);
      cta.setAttribute('aria-hidden', String(!mostrar));
      $('button', cta).tabIndex = mostrar ? 0 : -1;
    }).observe(alvo);
  }

  // ---------- reserva em 4 passos ----------
  const PASSOS = {
    1: { titulo: 'Escolha seus serviços', html: passoServicos },
    2: { titulo: 'Dia e horário', html: () => '<div id="agenda"></div>', montar: carregarAgenda },
    3: { titulo: 'Seus dados', html: passoDados, montar: montarDados },
    4: { titulo: 'Confira e reserve', html: passoRevisao }
  };

  function telaReservar(arg, dir) {
    if (!S.vitrine) {
      app.innerHTML = `<div class="tela"><div class="carregando-tela"><div class="esqueleto" style="height:64px"></div><div class="esqueleto" style="height:120px"></div><div class="esqueleto" style="height:120px"></div></div></div>`;
      garantirVitrine().then(() => { if (rota().nome === 'reservar') telaReservar(arg, 0); })
        .catch((e) => { app.innerHTML = `<div class="tela">${erroBloco(e.message, 'recarregar')}</div>`; });
      return;
    }
    S.carrinho = S.carrinho.filter((id) => servicoPorId(id));
    let n = Math.min(4, Math.max(1, parseInt(arg, 10) || 1));
    if (n >= 2 && !S.carrinho.length) n = 1;
    if (n >= 3 && !(S.dia && S.hora)) n = 2;
    if (n >= 4 && !S.dados) n = 3;
    if (arg && String(n) !== arg) history.replaceState(null, '', `#/reservar/${n}`);

    if (!$('.tela-reserva', app)) {
      app.innerHTML = `
      <div class="tela tela-reserva">
        <header class="passo-topo">
          <button class="icone-btn" data-acao="voltar-passo" aria-label="Voltar">${icone('voltar')}</button>
          <div class="passo-titulos"><p class="sobretitulo" id="passo-num"></p><h1 id="passo-titulo"></h1></div>
        </header>
        <div class="progresso" aria-hidden="true"><i id="progresso"></i></div>
        <div id="passo" class="passo"></div>
      </div>
      <div class="barra" id="barra">
        <div class="barra-info"><span class="barra-total" id="barra-total"></span><span class="barra-detalhe" id="barra-detalhe"></span></div>
        <button class="btn btn-ouro" id="barra-btn" data-acao="avancar"></button>
      </div>`;
      entrarTela(app.firstElementChild, dir);
      S.passo = n;
      mostrarPasso(n, 0);
    } else {
      const d = Math.sign(n - S.passo);
      mostrarPasso(n, d);
      window.scrollTo(0, 0);
    }
  }

  function mostrarPasso(n, dir) {
    S.passo = n;
    const p = PASSOS[n];
    $('#passo-num').textContent = `Passo ${romano(n)} de IV`;
    $('#passo-titulo').textContent = p.titulo;
    $('#progresso').style.transform = `scaleX(${n / 4})`;
    const el = $('#passo');
    el.innerHTML = p.html();
    if (p.montar) p.montar();
    if (dir) entrarTela(el, dir);
    atualizarBarra();
  }

  function irPasso(n) { location.hash = `#/reservar/${n}`; }

  function passoServicos() {
    return agrupar(S.vitrine.servicos).map((c, i) => `
      <section class="grupo">
        <header class="grupo-topo"><span class="numeral">${romano(i + 1)}</span><h2>${esc(c.nome)}</h2></header>
        <div class="lista-servicos">${c.itens.map((s) => {
          const sel = S.carrinho.includes(s.id);
          return `<button class="servico${sel ? ' sel' : ''}" data-acao="alternar" data-id="${esc(s.id)}" aria-pressed="${sel}">
            <span class="servico-info">
              <span class="servico-nome">${esc(s.nome)}</span>
              <span class="servico-desc">${esc(s.descricao)}</span>
              <span class="servico-meta">${icone('relogio')}${duracaoTexto(s.duracao)}</span>
            </span>
            <span class="servico-lado"><span class="servico-preco">${moeda(s.preco)}</span><span class="selo-check">${icone('check')}</span></span>
          </button>`;
        }).join('')}</div>
      </section>`).join('') +
      '<p class="dica centro">Pode escolher mais de um serviço. O tempo e o valor somam sozinhos.</p>';
  }

  function alternarServico(btn) {
    const id = btn.dataset.id, i = S.carrinho.indexOf(id);
    if (i >= 0) S.carrinho.splice(i, 1); else S.carrinho.push(id);
    const sel = i < 0;
    btn.classList.toggle('sel', sel);
    btn.setAttribute('aria-pressed', String(sel));
    S.hora = '';
    atualizarBarra(true);
  }

  // Passo II
  function esqueletoAgenda() {
    return `<div class="dias">${Array.from({ length: 6 }, () => '<div class="esqueleto dia-esq"></div>').join('')}</div>
      <div class="horarios" style="margin-top:28px">${Array.from({ length: 8 }, () => '<div class="esqueleto" style="height:48px"></div>').join('')}</div>`;
  }

  async function carregarAgenda(forcar) {
    const chave = S.carrinho.slice().sort().join(',');
    if (!forcar && S.agenda && S.agendaChave === chave && Date.now() - S.agendaEm < 90000) return pintarAgenda();
    $('#agenda').innerHTML = esqueletoAgenda();
    try {
      const a = await API.chamar('agenda', { servicoIds: S.carrinho });
      S.agenda = a; S.agendaChave = chave; S.agendaEm = Date.now();
      const atual = a.dias.find((d) => d.data === S.dia);
      if (!atual || !atual.livres.includes(S.hora)) S.hora = '';
      if (!atual || !atual.livres.length) S.dia = (a.dias.find((d) => d.livres.length) || {}).data || '';
      if (S.passo === 2 && $('#agenda')) pintarAgenda();
    } catch (e) {
      if (S.passo === 2 && $('#agenda')) $('#agenda').innerHTML = erroBloco(e.message, 'recarregar-agenda');
    }
  }

  function pintarAgenda() {
    const st = studio(), dias = S.agenda.dias, livres = dias.filter((d) => d.livres.length);
    if (!livres.length) {
      $('#agenda').innerHTML = `<div class="vazio">${icone('lua')}<h3>Agenda cheia por enquanto</h3>
        <p>Os horários para esse atendimento já foram todos reservados. Chame no WhatsApp que a gente tenta um encaixe.</p>
        <a class="btn btn-fantasma" href="${linkWhats(st.whatsapp, 'Olá! Não encontrei horário livre no app. Tem algum encaixe?')}" target="_blank" rel="noopener">${icone('mensagem')}Pedir encaixe</a></div>`;
      atualizarBarra();
      return;
    }
    let mesAnterior = -1;
    const fitas = dias.map((d) => {
      const x = paraData(d.data), n = d.livres.length;
      let marcador = '';
      if (x.getMonth() !== mesAnterior) { marcador = `<span class="dia-mes" aria-hidden="true">${MESES[x.getMonth()].slice(0, 3)}</span>`; mesAnterior = x.getMonth(); }
      const estado = n ? (n <= 2 ? 'últimas' : 'livre') : d.fechado ? 'folga' : 'lotado';
      return `${marcador}<button class="dia${d.data === S.dia ? ' sel' : ''}${n ? '' : ' indisponivel'}${n && n <= 2 ? ' poucas' : ''}" data-acao="dia" data-data="${d.data}" ${n ? '' : 'disabled'}
        aria-pressed="${d.data === S.dia}" aria-label="${esc(maiuscula(dataLonga(d.data)))}: ${n ? n + ' horários livres' : estado}">
        <span class="dia-semana">${SEMANA_CURTA[x.getDay()]}</span><span class="dia-numero">${x.getDate()}</span><span class="dia-estado">${estado}</span></button>`;
    }).join('');
    $('#agenda').innerHTML = `
      <div class="dias-cabecalho"><span class="rotulo">Escolha o dia</span><span class="dica">${livres.length} dias com horário livre</span></div>
      <div class="dias" id="dias">${fitas}</div>
      <div id="horarios"></div>`;
    pintarHorarios(false);
    const ativo = $('.dia.sel', app);
    if (ativo) ativo.scrollIntoView({ block: 'nearest', inline: 'center' });
    window.scrollTo(0, 0);
  }

  function pintarHorarios(animar = true) {
    const d = S.agenda.dias.find((x) => x.data === S.dia);
    const alvo = $('#horarios');
    if (!d || !alvo) return;
    const grupos = { Manhã: [], Tarde: [], Noite: [] };
    d.livres.forEach((h) => { const hh = Number(h.slice(0, 2)); (hh < 12 ? grupos.Manhã : hh < 18 ? grupos.Tarde : grupos.Noite).push(h); });
    alvo.innerHTML = `<p class="dia-escolhido">${esc(maiuscula(dataLonga(d.data)))}</p>` +
      Object.entries(grupos).filter(([, l]) => l.length).map(([nome, l]) => `
        <div class="turno">
          <p class="rotulo">${icone(nome === 'Noite' ? 'lua' : 'sol')}${nome}</p>
          <div class="horarios">${l.map((h) => `<button class="hora${h === S.hora ? ' sel' : ''}" data-acao="hora" data-hora="${h}" aria-pressed="${h === S.hora}">${h}</button>`).join('')}</div>
        </div>`).join('') +
      `<p class="dica">Atendimento de ${duracaoTexto(S.agenda.duracao)}. Só aparecem horários em que ele cabe inteiro.</p>`;
    if (animar) entrarTela(alvo, 0);
  }

  function escolherDia(btn) {
    S.dia = btn.dataset.data;
    S.hora = '';
    $$('.dia', app).forEach((b) => { const s = b === btn; b.classList.toggle('sel', s); b.setAttribute('aria-pressed', String(s)); });
    btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUZIR_MOVIMENTO ? 'auto' : 'smooth' });
    pintarHorarios();
    atualizarBarra();
  }

  function escolherHora(btn) {
    S.hora = btn.dataset.hora;
    $$('.hora', app).forEach((b) => { const s = b === btn; b.classList.toggle('sel', s); b.setAttribute('aria-pressed', String(s)); });
    atualizarBarra();
  }

  // Passo III
  function passoDados() {
    const p = Object.assign({}, perfil(), S.dados);
    return `<form id="form-dados" class="form-dados" novalidate>
      <label class="campo"><span>Nome completo</span>
        <input class="entrada" name="nome" autocomplete="name" maxlength="60" value="${esc(p.nome || '')}" placeholder="Seu nome e sobrenome"></label>
      <p class="erro-campo" data-erro="nome"></p>
      <label class="campo"><span>WhatsApp</span>
        <input class="entrada" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" value="${esc(mascaraFone(p.whatsapp || ''))}" placeholder="(88) 99999-9999"></label>
      <p class="erro-campo" data-erro="whatsapp"></p>
      <label class="campo"><span>Data de nascimento <small>opcional, para um mimo no seu aniversário</small></span>
        <input class="entrada" name="nascimento" type="date" value="${esc(p.nascimento || '')}" max="${hoje()}"></label>
      <label class="campo"><span>Alguma referência? <small>opcional</small></span>
        <textarea class="entrada" name="obs" maxlength="300" placeholder="Formato, cor, comprimento ou a arte que você tem em mente">${esc(p.obs || '')}</textarea></label>
      <p class="dica">${icone('cadeado', 'ic-inline')}Seus dados ficam só com o studio e servem para confirmar a reserva.</p>
      <button type="submit" hidden></button>
    </form>`;
  }

  function montarDados() {
    const f = $('#form-dados');
    f.whatsapp.addEventListener('input', () => { f.whatsapp.value = mascaraFone(f.whatsapp.value); });
    f.addEventListener('submit', (e) => { e.preventDefault(); avancar(); });
  }

  function validarDados() {
    const f = $('#form-dados');
    const nome = f.nome.value.trim().replace(/\s+/g, ' '), whatsapp = soDigitos(f.whatsapp.value);
    const erros = {
      nome: nome.length < 2 ? 'Informe o seu nome.' : '',
      whatsapp: !foneValido(whatsapp) ? 'Informe um WhatsApp com DDD, só números.' : ''
    };
    Object.entries(erros).forEach(([k, msg]) => {
      $(`[data-erro="${k}"]`, f).textContent = msg;
      f[k].setAttribute('aria-invalid', String(!!msg));
    });
    const primeiro = Object.keys(erros).find((k) => erros[k]);
    if (primeiro) { f[primeiro].focus(); return false; }
    S.dados = { nome, whatsapp, nascimento: f.nascimento.value, obs: f.obs.value.trim() };
    gravarLocal(CH.perfil, { nome, whatsapp, nascimento: f.nascimento.value });
    return true;
  }

  // Passo IV
  function passoRevisao() {
    const t = totais(), st = studio(), d = S.dados;
    return `
      <article class="bilhete">
        <dl class="bilhete-dados">
          <div><dt>${icone('calendario')}Dia</dt><dd>${esc(maiuscula(dataLonga(S.dia)))}</dd></div>
          <div><dt>${icone('relogio')}Horário</dt><dd>${S.hora} às ${horaFim(S.hora, t.duracao)}</dd></div>
          <div><dt>${icone('usuario')}Cliente</dt><dd>${esc(d.nome)}<small>${esc(mascaraFone(d.whatsapp))}</small></dd></div>
        </dl>
        <div class="bilhete-corte" aria-hidden="true"></div>
        <ul class="bilhete-itens">${t.lista.map((s) => `<li><span>${esc(s.nome)}</span><span>${moeda(s.preco)}</span></li>`).join('')}</ul>
        <div class="bilhete-total"><span>Total</span><strong>${moeda(t.total)}</strong></div>
        <div class="bilhete-sinal">
          <div><span class="rotulo">Sinal para garantir · ${st.sinalPct}%</span><strong>${moeda(t.sinal)}</strong></div>
          <p>Restante no dia: ${moeda(t.total - t.sinal)}</p>
        </div>
        <div class="bilhete-editar">
          <button class="btn-texto" data-acao="ir-passo" data-passo="1">Alterar serviços</button>
          <button class="btn-texto" data-acao="ir-passo" data-passo="2">Alterar horário</button>
        </div>
      </article>
      <div class="politica-caixa">
        <p class="rotulo">Política de sinal</p>
        <p>${esc(st.politica)}</p>
        <label class="marcar"><input type="checkbox" id="aceite" ${S.aceite ? 'checked' : ''}><span class="caixa">${icone('check')}</span>
          <span>Li e concordo com a política de sinal e remarcação.</span></label>
      </div>`;
  }

  function atualizarBarra(pulsar) {
    const barra = $('#barra');
    if (!barra) return;
    const t = totais();
    let visivel = true, rotulo = 'Continuar', pronto = true;
    if (S.passo === 1) { visivel = t.lista.length > 0; }
    if (S.passo === 2) { pronto = !!(S.dia && S.hora); }
    if (S.passo === 3) { rotulo = 'Revisar'; }
    if (S.passo === 4) { rotulo = 'Reservar'; pronto = S.aceite; }
    $('#barra-total').textContent = moeda(t.total);
    $('#barra-detalhe').textContent = S.passo === 2 && S.hora
      ? `${maiuscula(SEMANA_CURTA[paraData(S.dia).getDay()])}, ${dataCurta(S.dia).slice(0, 5)} às ${S.hora}`
      : `${duracaoTexto(t.duracao)} · sinal ${moeda(t.sinal)}`;
    const btn = $('#barra-btn');
    btn.innerHTML = `${esc(rotulo)}${icone('direita')}`;
    btn.disabled = !pronto;
    barra.classList.toggle('visivel', visivel);
    document.body.classList.toggle('com-barra', visivel);
    if (pulsar && !REDUZIR_MOVIMENTO && t.lista.length) {
      $('#barra-total').animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }

  function avancar(btn) {
    if (S.passo === 1 && S.carrinho.length) irPasso(2);
    else if (S.passo === 2 && S.dia && S.hora) irPasso(3);
    else if (S.passo === 3 && validarDados()) irPasso(4);
    else if (S.passo === 4) finalizar(btn || $('#barra-btn'));
  }

  function voltarPasso() {
    if (S.passo > 1) location.replace(`#/reservar/${S.passo - 1}`);
    else location.hash = '#/';
  }

  function finalizar(btn) {
    if (!S.aceite) { toast('Marque que leu a política de sinal para continuar.'); return; }
    comCarga(btn, async () => {
      try {
        const r = await API.chamar('reservar', Object.assign({}, S.dados, { servicoIds: S.carrinho, data: S.dia, hora: S.hora }));
        lembrarReserva(r);
        S.reservas[r.codigo] = r;
        S.recem = r.codigo;
        Object.assign(S, { carrinho: [], agenda: null, dia: '', hora: '', aceite: false, dados: null, passo: 1 });
        location.hash = `#/reserva/${r.codigo}`;
      } catch (e) {
        toast(e.message, 'erro');
        if (e.codigo === 'ocupado') { S.agenda = null; S.hora = ''; irPasso(2); }
      }
    });
  }

  // ---------- reserva criada ----------
  const CABECALHOS = {
    aguardando: ['Seu horário está reservado', 'Falta só o sinal. Assim que o comprovante for conferido, a sua reserva fica confirmada.'],
    confirmado: ['Tudo certo. Até breve!', 'Recebemos o seu sinal e o horário está confirmado.'],
    concluido: ['Atendimento concluído', 'Obrigada pela visita. Esperamos você de volta.'],
    cancelado: ['Reserva cancelada', 'Se quiser, é só fazer uma nova reserva.'],
    faltou: ['Reserva encerrada', 'Esse horário passou sem atendimento. Fale com o studio para remarcar.']
  };

  async function telaReserva(arg, dir) {
    const codigo = String(arg || '').toUpperCase();
    app.innerHTML = `
      <div class="tela tela-ticket">
        <header class="passo-topo">
          <button class="icone-btn" data-acao="ir" data-destino="" aria-label="Voltar ao início">${icone('voltar')}</button>
          <div class="passo-titulos"><p class="sobretitulo">Reserva ${esc(codigo)}</p><h1>Sua reserva</h1></div>
        </header>
        <div id="conteudo-reserva"><div class="esqueleto" style="height:180px"></div><div class="esqueleto" style="height:260px;margin-top:16px"></div></div>
      </div>`;
    entrarTela(app.firstElementChild, dir);
    let r = S.reservas[codigo];
    if (!r) {
      const salvo = minhasReservas().find((x) => x.codigo === codigo);
      if (!salvo) { pintarVerificacao(codigo); return; }
      try {
        r = (await API.chamar('consultar', { itens: [salvo] }))[0];
        if (!r) { pintarVerificacao(codigo); return; }
        S.reservas[codigo] = r;
      } catch (e) {
        $('#conteudo-reserva').innerHTML = erroBloco(e.message, 'recarregar');
        return;
      }
    }
    await garantirVitrine().catch(() => null);
    if (rota().nome === 'reserva' && rota().arg.toUpperCase() === codigo) pintarReserva(r);
  }

  function pintarReserva(r) {
    const st = studio();
    const futura = r.data > hoje() || (r.data === hoje() && r.hora > horaAgora());
    const [titulo, sub] = CABECALHOS[r.status] || CABECALHOS.aguardando;
    const celebrar = S.recem === r.codigo;
    S.recem = '';
    const pct = Math.round(r.total ? (r.sinal / r.total) * 100 : st.sinalPct);
    $('#conteudo-reserva').innerHTML = `
      <div class="anuncio${celebrar ? ' celebrar' : ''}">
        <div class="anuncio-sol"><img src="assets/sol.webp" alt="" width="900" height="469"></div>
        <h2>${esc(titulo)}</h2>
        <p>${esc(sub)}</p>
      </div>

      <article class="bilhete">
        <div class="bilhete-cabeca"><span class="bilhete-codigo">${icone('bilhete')}${esc(r.codigo)}</span>${chipStatus(r.status)}</div>
        <dl class="bilhete-dados">
          <div><dt>${icone('calendario')}Dia</dt><dd>${esc(maiuscula(dataLonga(r.data)))}</dd></div>
          <div><dt>${icone('relogio')}Horário</dt><dd>${esc(r.hora)} às ${horaFim(r.hora, r.duracao)}</dd></div>
          <div><dt>${icone('brilho')}Serviços</dt><dd>${esc(r.servicos)}</dd></div>
        </dl>
        <div class="bilhete-corte" aria-hidden="true"></div>
        <div class="bilhete-total"><span>Total</span><strong>${moeda(r.total)}</strong></div>
        <div class="bilhete-linhas">
          <p><span>Sinal (${pct}%)</span><span>${moeda(r.sinal)}</span></p>
          <p><span>Restante no dia</span><span>${moeda(r.total - r.sinal)}</span></p>
        </div>
      </article>

      ${r.status === 'aguardando' ? `
      <section class="pix">
        <div class="pix-cabeca">${icone('dinheiro')}<div><p class="sobretitulo">Sinal via Pix</p><h3>Garanta o seu horário</h3></div></div>
        <div class="pix-valor"><span>Valor do sinal</span><strong>${moeda(r.sinal)}</strong></div>
        <div class="pix-chave">
          <div><span class="rotulo">Chave Pix · ${esc(TIPOS_PIX[st.pixTipo] || 'chave')}</span><code>${esc(st.pixChave)}</code></div>
          <button class="btn btn-fantasma btn-bloco copiar-btn" data-acao="copiar-chave">${icone('copiar')}Copiar chave Pix</button>
        </div>
        <button class="btn btn-sutil btn-bloco copiar-btn" data-acao="copiar-pix" data-codigo="${esc(r.codigo)}">${icone('copiar')}Copiar Pix copia e cola</button>
        <ol class="mini-passos">
          <li><span>1</span>Copie a chave ou o Pix copia e cola</li>
          <li><span>2</span>Pague ${moeda(r.sinal)} no app do seu banco</li>
          <li><span>3</span>Envie o comprovante pelo WhatsApp</li>
        </ol>
        <a class="btn btn-ouro btn-bloco" href="${linkWhats(st.whatsapp, msgComprovante(r, st))}" target="_blank" rel="noopener">${icone('mensagem')}Enviar comprovante</a>
        <p class="dica centro">Envie o sinal em até ${esc(st.prazoSinalHoras)} horas. Depois disso o horário pode ser liberado para outra cliente.</p>
      </section>` : ''}

      <div class="acoes-reserva">
        ${(r.status === 'aguardando' || r.status === 'confirmado') && futura ? `<a class="btn btn-fantasma btn-bloco" href="${linkAgendaGoogle(r, st)}" target="_blank" rel="noopener">${icone('calendario')}Salvar na minha agenda</a>` : ''}
        ${st.endereco && r.status === 'confirmado' ? `<a class="btn btn-sutil btn-bloco" href="${esc(st.mapa || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(st.endereco))}" target="_blank" rel="noopener">${icone('local')}Como chegar</a>` : ''}
        <a class="btn btn-sutil btn-bloco" href="${linkWhats(st.whatsapp, `Olá! Tenho uma dúvida sobre a minha reserva ${r.codigo}.`)}" target="_blank" rel="noopener">${icone('mensagem')}Falar com o studio</a>
        <button class="btn btn-texto" data-acao="ir" data-destino="meus">Ver todas as minhas reservas</button>
        ${(r.status === 'aguardando' || r.status === 'confirmado') && futura ? `<button class="btn btn-texto texto-perigo" data-acao="cancelar" data-codigo="${esc(r.codigo)}">Preciso cancelar</button>` : ''}
      </div>`;
    if (celebrar) celebrarReserva($('.anuncio-sol', app));
  }

  // Faíscas douradas saindo do sol, uma vez, quando a reserva acaba de ser feita.
  function celebrarReserva(alvo) {
    if (REDUZIR_MOVIMENTO || !alvo || !alvo.animate) return;
    const quantidade = 22;
    for (let i = 0; i < quantidade; i++) {
      const f = document.createElement('i');
      f.className = 'faisca';
      alvo.append(f);
      const angulo = Math.PI + (Math.PI * i) / (quantidade - 1) + (Math.random() - 0.5) * 0.2;
      const dist = 70 + Math.random() * 70;
      const x = Math.cos(angulo) * dist, y = Math.sin(angulo) * dist;
      f.animate([
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`, opacity: 0 }
      ], { duration: 900 + Math.random() * 500, delay: 250 + Math.random() * 120, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'both' })
        .finished.then(() => f.remove());
    }
  }

  function pintarVerificacao(codigo) {
    $('#conteudo-reserva').innerHTML = `
      <div class="cartao moldura verificar">
        <h2 class="titulo-secao">Confirme que é <em>você</em></h2>
        <p class="dica">Para proteger os seus dados, digite o WhatsApp usado na reserva ${esc(codigo)}.</p>
        <form id="form-verificar" class="form-dados" novalidate>
          <label class="campo"><span>WhatsApp</span><input class="entrada" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(88) 99999-9999" value="${esc(mascaraFone(perfil().whatsapp || ''))}"></label>
          <button class="btn btn-ouro btn-bloco" type="submit">Ver reserva</button>
        </form>
      </div>`;
    const f = $('#form-verificar');
    f.whatsapp.addEventListener('input', () => { f.whatsapp.value = mascaraFone(f.whatsapp.value); });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const whatsapp = soDigitos(f.whatsapp.value);
      if (!foneValido(whatsapp)) { toast('Digite o WhatsApp com DDD.', 'erro'); return; }
      comCarga($('button[type=submit]', f), async () => {
        try {
          const r = (await API.chamar('consultar', { itens: [{ codigo, whatsapp }] }))[0];
          if (!r) { toast('Não encontramos essa reserva com esse WhatsApp.', 'erro'); return; }
          lembrarReserva(r);
          S.reservas[r.codigo] = r;
          await garantirVitrine().catch(() => null);
          pintarReserva(r);
        } catch (err) { toast(err.message, 'erro'); }
      });
    });
  }

  async function cancelarReserva(btn) {
    const r = S.reservas[btn.dataset.codigo];
    if (!r) return;
    const ok = await confirmar({
      titulo: 'Cancelar esta reserva?',
      texto: `O horário de ${dataLonga(r.data)} às ${r.hora} será liberado para outra cliente.` + (r.status === 'confirmado' ? ' Sobre o sinal já pago, vale a política do studio.' : ''),
      ok: 'Cancelar reserva', cancelar: 'Manter reserva', perigo: true
    });
    if (!ok) return;
    try {
      const novo = await API.chamar('cancelar', { codigo: r.codigo, whatsapp: r.whatsapp });
      S.reservas[r.codigo] = novo;
      toast('Reserva cancelada.', 'ok');
      pintarReserva(novo);
    } catch (e) { toast(e.message, 'erro'); }
  }

  // ---------- meus horários ----------
  async function telaMeus(_, dir) {
    app.innerHTML = `
      <div class="tela tela-meus">
        <header class="passo-topo">
          <button class="icone-btn" data-acao="ir" data-destino="" aria-label="Voltar ao início">${icone('voltar')}</button>
          <div class="passo-titulos"><p class="sobretitulo">${esc(studio().nome)}</p><h1>Meus horários</h1></div>
        </header>
        <div id="lista-minhas"></div>
        <section class="cartao moldura buscar">
          <h2>Encontrar uma reserva</h2>
          <p class="dica">Use o código que aparece na mensagem da sua reserva, como AN-7K2Q.</p>
          <form id="form-buscar" class="form-dados" novalidate>
            <div class="grade-2">
              <label class="campo"><span>Código</span><input class="entrada" name="codigo" autocapitalize="characters" maxlength="7" placeholder="AN-0000"></label>
              <label class="campo"><span>WhatsApp</span><input class="entrada" name="whatsapp" type="tel" inputmode="tel" placeholder="(88) 9..." value="${esc(mascaraFone(perfil().whatsapp || ''))}"></label>
            </div>
            <button class="btn btn-fantasma btn-bloco" type="submit">${icone('bilhete')}Buscar reserva</button>
          </form>
        </section>
      </div>`;
    entrarTela(app.firstElementChild, dir);

    const f = $('#form-buscar');
    f.whatsapp.addEventListener('input', () => { f.whatsapp.value = mascaraFone(f.whatsapp.value); });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const codigo = f.codigo.value.trim().toUpperCase(), whatsapp = soDigitos(f.whatsapp.value);
      if (codigo.replace(/[^A-Z0-9]/g, '').length < 4 || !foneValido(whatsapp)) { toast('Preencha o código e o WhatsApp com DDD.', 'erro'); return; }
      comCarga($('button[type=submit]', f), async () => {
        try {
          const r = (await API.chamar('consultar', { itens: [{ codigo, whatsapp }] }))[0];
          if (!r) { toast('Não encontramos essa reserva com esse WhatsApp.', 'erro'); return; }
          lembrarReserva(r);
          S.reservas[r.codigo] = r;
          location.hash = `#/reserva/${r.codigo}`;
        } catch (err) { toast(err.message, 'erro'); }
      });
    });

    const salvas = minhasReservas(), lista = $('#lista-minhas');
    if (!salvas.length) {
      lista.innerHTML = `<div class="vazio">${icone('calendario')}<h3>Nenhuma reserva neste aparelho</h3>
        <p>Quando você reservar pelo app, os seus horários aparecem aqui.</p>
        <button class="btn btn-ouro" data-acao="reservar">${icone('brilho')}Reservar meu horário</button></div>`;
      return;
    }
    lista.innerHTML = Array.from({ length: Math.min(3, salvas.length) }, () => '<div class="esqueleto" style="height:92px;margin-bottom:12px"></div>').join('');
    try {
      const reservas = await API.chamar('consultar', { itens: salvas });
      reservas.forEach((r) => { S.reservas[r.codigo] = r; });
      const h = hoje();
      const ativas = (r) => (r.status === 'aguardando' || r.status === 'confirmado') && r.data >= h;
      const proximas = reservas.filter(ativas).sort((a, b) => (a.data + a.hora < b.data + b.hora ? -1 : 1));
      const anteriores = reservas.filter((r) => !ativas(r)).sort((a, b) => (a.data + a.hora > b.data + b.hora ? -1 : 1));
      const cartao = (r) => {
        const x = paraData(r.data);
        return `<button class="cartao-reserva" data-acao="abrir-reserva" data-codigo="${esc(r.codigo)}">
          <span class="cr-data"><span class="cr-dia">${x.getDate()}</span><span class="cr-mes">${MESES[x.getMonth()].slice(0, 3)}</span></span>
          <span class="cr-info"><span class="cr-titulo">${esc(r.servicos)}</span><span class="cr-sub">${esc(maiuscula(SEMANA[x.getDay()]))} às ${esc(r.hora)} · ${esc(r.codigo)}</span>${chipStatus(r.status)}</span>
          ${icone('direita')}
        </button>`;
      };
      lista.innerHTML = (proximas.length ? `<p class="rotulo lista-titulo">Próximos</p>${proximas.map(cartao).join('')}` : '') +
        (anteriores.length ? `<p class="rotulo lista-titulo">Anteriores</p>${anteriores.map(cartao).join('')}` : '') ||
        `<div class="vazio">${icone('calendario')}<h3>Nada por aqui</h3><p>Não encontramos as reservas salvas neste aparelho.</p></div>`;
    } catch (e) {
      lista.innerHTML = erroBloco(e.message, 'recarregar');
    }
  }

  // ---------- ações ----------
  const ACOES = {
    ir: (b) => { location.hash = `#/${b.dataset.destino || ''}`; },
    reservar: () => { location.hash = '#/reservar/1'; },
    escolher: (b) => { if (!S.carrinho.includes(b.dataset.id)) S.carrinho.push(b.dataset.id); S.hora = ''; location.hash = '#/reservar/1'; },
    rolar: (b) => { const el = document.getElementById(b.dataset.alvo); if (el) el.scrollIntoView({ behavior: REDUZIR_MOVIMENTO ? 'auto' : 'smooth' }); },
    alternar: alternarServico,
    dia: escolherDia,
    hora: escolherHora,
    avancar,
    'voltar-passo': voltarPasso,
    'ir-passo': (b) => irPasso(Number(b.dataset.passo)),
    'recarregar-agenda': () => carregarAgenda(true),
    recarregar: () => { garantirVitrine(true).then(atualizarInicio).catch(() => null); navegar(); },
    'abrir-reserva': (b) => { location.hash = `#/reserva/${b.dataset.codigo}`; },
    'copiar-chave': async (b) => {
      if (await copiar(studio().pixChave)) feedbackBotao(b, `${icone('check')}Copiada`);
      else toast('Não deu para copiar. Segure o dedo sobre a chave para copiar.', 'erro');
    },
    'copiar-pix': async (b) => {
      const r = S.reservas[b.dataset.codigo];
      if (r && await copiar(pixCopiaECola(studio(), r.sinal, r.codigo))) {
        feedbackBotao(b, `${icone('check')}Pix copia e cola copiado`);
        toast('Agora é só colar na opção "Pix copia e cola" do seu banco.', 'ok');
      }
    },
    cancelar: cancelarReserva
  };

  app.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-acao]');
    if (!alvo || !app.contains(alvo) || alvo.disabled) return;
    const fn = ACOES[alvo.dataset.acao];
    if (fn) { e.preventDefault(); fn(alvo); }
  });
  app.addEventListener('change', (e) => {
    if (e.target.id === 'aceite') { S.aceite = e.target.checked; atualizarBarra(); }
  });

  // ---------- partida ----------
  const codigoLink = new URLSearchParams(location.search).get('c');
  if (codigoLink) history.replaceState(null, '', `${location.pathname}#/reserva/${encodeURIComponent(codigoLink)}`);
  window.addEventListener('hashchange', navegar);
  avisoDemo('cliente');
  navegar();
  garantirVitrine().then(atualizarInicio).catch((e) => {
    if (!S.vitrine && $('#menu')) $('#menu').innerHTML = erroBloco(e.message, 'recarregar');
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => null));
  }
})();
