/* Arcana Nail — área de parceiras (influenciadoras que divulgam com link próprio). */
(() => {
  const raiz = $('#parceiras');
  const CH_TOKEN = 'arcana-parceira-token';
  const nomeStudio = () => ((lerLocal('arcana-vitrine') || {}).studio || {}).nome || 'Arcana Nail';

  const marca = `<a class="parc-marca" href="./" aria-label="${esc(nomeStudio())}">
    <img src="assets/sol.webp" alt="" width="760" height="400"><img src="assets/letreiro.webp" alt="" width="1200" height="369"></a>`;

  function telaAcesso(aba = 'entrar') {
    raiz.innerHTML = `
      <div class="parc-tela">
        ${marca}
        <p class="sobretitulo">Área de parceiras</p>
        <h1 class="titulo-secao">Divulgue e <em>acompanhe</em></h1>
        <p class="lead">Ganhe um link exclusivo do ${esc(nomeStudio())} e veja quantas clientes chegaram por você.</p>
        <div class="parc-abas" role="tablist">
          <button role="tab" aria-selected="${aba === 'entrar'}" data-aba="entrar">Entrar</button>
          <button role="tab" aria-selected="${aba === 'criar'}" data-aba="criar">Criar conta</button>
        </div>
        <section class="cartao moldura parc-cartao">
          ${aba === 'entrar' ? `
          <form id="form-parc" class="form-dados" novalidate>
            <label class="campo"><span>WhatsApp</span><input class="entrada" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(88) 99999-9999"></label>
            <label class="campo"><span>Senha</span><input class="entrada" name="senha" type="password" autocomplete="current-password"></label>
            <button class="btn btn-ouro btn-bloco" type="submit">${icone('cadeado')}Entrar</button>
            <p class="dica">Esqueceu a senha? Fale com o studio pelo WhatsApp.</p>
          </form>` : `
          <form id="form-parc" class="form-dados" novalidate>
            <label class="campo"><span>Nome</span><input class="entrada" name="nome" autocomplete="name" maxlength="60" placeholder="Nome e sobrenome"></label>
            <label class="campo"><span>WhatsApp</span><input class="entrada" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(88) 99999-9999"></label>
            <label class="campo"><span>Instagram <small>opcional, sem @</small></span><input class="entrada" name="instagram" autocapitalize="none" maxlength="40" placeholder="seuperfil"></label>
            <label class="campo"><span>Senha <small>mínimo de 6 caracteres</small></span><input class="entrada" name="senha" type="password" autocomplete="new-password" minlength="6"></label>
            <button class="btn btn-ouro btn-bloco" type="submit">${icone('brilho')}Criar minha conta</button>
            <p class="dica">O seu link fica pronto na hora. O studio acompanha os resultados de todas as parceiras.</p>
          </form>`}
        </section>
        <a class="btn-texto" href="./">Ir para o app de reservas</a>
      </div>`;
    entrarTela($('.parc-tela'), 0);

    $$('[data-aba]').forEach((b) => b.addEventListener('click', () => telaAcesso(b.dataset.aba)));
    const f = $('#form-parc');
    f.whatsapp.addEventListener('input', () => { f.whatsapp.value = mascaraFone(f.whatsapp.value); });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const whatsapp = soDigitos(f.whatsapp.value);
      if (!foneValido(whatsapp)) { toast('Informe o WhatsApp com DDD.', 'erro'); return; }
      if (aba === 'criar' && f.nome.value.trim().length < 2) { toast('Informe o seu nome.', 'erro'); return; }
      if (f.senha.value.length < (aba === 'criar' ? 6 : 1)) { toast(aba === 'criar' ? 'A senha precisa ter pelo menos 6 caracteres.' : 'Digite a sua senha.', 'erro'); return; }
      comCarga($('button[type=submit]', f), async () => {
        try {
          const r = aba === 'criar'
            ? await API.chamar('divCadastrar', { nome: f.nome.value, whatsapp, instagram: f.instagram.value, senha: f.senha.value })
            : await API.chamar('divEntrar', { whatsapp, senha: f.senha.value });
          gravarLocal(CH_TOKEN, r.token);
          if (aba === 'criar') toast('Conta criada. Este é o seu link.', 'ok');
          telaPainel(r.painel);
        } catch (err) { toast(err.message, 'erro'); }
      });
    });
  }

  function telaPainel(dados) {
    raiz.innerHTML = `
      <div class="parc-tela parc-painel">
        <header class="parc-topo">
          <a class="parc-marca-mini" href="./" aria-label="${esc(nomeStudio())}"><img src="assets/letreiro.webp" alt="" width="1200" height="369"></a>
          <div class="parc-topo-acoes">
            <button class="icone-btn" data-acao="atualizar" aria-label="Atualizar números">${icone('atualizar')}</button>
            <button class="icone-btn" data-acao="sair" aria-label="Sair">${icone('sair')}</button>
          </div>
        </header>
        <div class="painel-div" id="parc-corpo">${Divulgacao.html(dados, nomeStudio())}</div>
      </div>`;
    Divulgacao.ligar($('#parc-corpo'), dados, nomeStudio());
    entrarTela($('.parc-tela'), 0);
    $('[data-acao=sair]').addEventListener('click', async () => {
      if (!await confirmar({ titulo: 'Sair da área de parceiras?', ok: 'Sair', cancelar: 'Ficar' })) return;
      try { localStorage.removeItem(CH_TOKEN); } catch { /* sem armazenamento */ }
      telaAcesso('entrar');
    });
    $('[data-acao=atualizar]').addEventListener('click', (e) => comCarga(e.currentTarget, carregar));
  }

  async function carregar() {
    const token = lerLocal(CH_TOKEN);
    if (!token) { telaAcesso('entrar'); return; }
    try {
      telaPainel(await API.chamar('divPainel', { token }));
    } catch (e) {
      if (e.codigo === 'auth') { try { localStorage.removeItem(CH_TOKEN); } catch { /* sem armazenamento */ } telaAcesso('entrar'); }
      toast(e.message, 'erro');
      if (e.codigo !== 'auth' && !$('.parc-tela')) raiz.innerHTML = `<div class="parc-tela"><p>${esc(e.message)}</p></div>`;
    }
  }

  avisoDemo('parceiras');
  if (lerLocal(CH_TOKEN)) {
    raiz.innerHTML = `<div class="parc-tela"><div class="esqueleto" style="height:160px"></div><div class="esqueleto" style="height:260px"></div></div>`;
    carregar();
  } else telaAcesso(new URLSearchParams(location.search).get('criar') !== null ? 'criar' : 'entrar');
})();
