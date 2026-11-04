/* Arcana Nail — painel de quem divulga: cliente que indica e parceira influenciadora. */
const Divulgacao = (() => {
  const linkDe = (codigo) => new URL(`./?i=${encodeURIComponent(codigo)}`, location.href).href;
  const convite = (studioNome, link) => `Conheci o ${studioNome} e recomendo demais. Reserve o seu horário pelo meu link: ${link}`;
  const SITUACAO = {
    aguardando: ['Reservou', 'aguardando'], confirmado: ['Confirmada', 'confirmado'], concluido: ['Atendida', 'concluido'],
    cancelado: ['Cancelou', 'cancelado'], faltou: ['Não veio', 'faltou']
  };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  function html(dados, studioNome) {
    const { perfil, metricas: m, indicadas, desconto } = dados;
    const link = linkDe(perfil.codigo);
    const cliente = perfil.tipo === 'cliente';
    return `
      <section class="div-saudacao">
        <p class="sobretitulo">${cliente ? 'Indique e ganhe' : `Parceira ${esc(studioNome)}`}</p>
        <h2 class="titulo-secao">Olá, <em>${esc(primeiroNome(perfil.nome))}</em></h2>
        <p class="lead">${cliente
          ? `A cada amiga nova que fizer o primeiro atendimento pelo seu link, você ganha ${esc(desconto)}% de desconto no seu próximo serviço.`
          : 'Este é o seu link de divulgação. Cada cliente nova que reservar por ele fica registrada aqui, com o seu nome.'}</p>
      </section>

      ${cliente ? `
      <div class="div-premio${m.descontos ? ' ativo' : ''}">
        ${icone('joia')}
        <div>
          <strong>${m.descontos ? `${plural(m.descontos, 'desconto', 'descontos')} de ${esc(desconto)}%` : 'Nenhum desconto ainda'}</strong>
          <span>${m.descontos ? 'Avise no seu próximo atendimento para usar.' : 'Assim que uma amiga for atendida, ele aparece aqui.'}${m.descontosUsados ? ` Você já usou ${m.descontosUsados}.` : ''}</span>
        </div>
      </div>` : ''}

      <section class="div-link">
        <span class="rotulo">Seu link</span>
        <code class="div-url">${esc(link.replace(/^https?:\/\//, ''))}</code>
        <p class="div-codigo">Código para quem preferir digitar: <b>${esc(perfil.codigo)}</b></p>
        <div class="div-acoes">
          <button class="btn btn-ouro btn-bloco copiar-btn" type="button" data-div="copiar">${icone('copiar')}Copiar link</button>
          <a class="btn btn-fantasma btn-bloco" href="https://wa.me/?text=${encodeURIComponent(convite(studioNome, link))}" target="_blank" rel="noopener">${icone('mensagem')}Enviar no WhatsApp</a>
          <button class="btn btn-sutil btn-bloco" type="button" data-div="compartilhar">${icone('compartilhar')}Compartilhar</button>
        </div>
      </section>

      <div class="div-metricas">
        <div><strong>${m.visitas}</strong><span>${m.visitas === 1 ? 'clique no link' : 'cliques no link'}</span></div>
        <div><strong>${m.reservas}</strong><span>${m.reservas === 1 ? 'reserva' : 'reservas'}</span></div>
        <div><strong>${m.atendimentos}</strong><span>${m.atendimentos === 1 ? 'atendida' : 'atendidas'}</span></div>
      </div>

      <section class="div-lista">
        <h3>Quem veio por você</h3>
        ${indicadas.length ? `<ul>${indicadas.map((i) => {
          const [rotulo, classe] = SITUACAO[i.status] || SITUACAO.aguardando;
          return `<li><span><b>${esc(i.nome)}</b><small>${esc(maiuscula(dataLonga(i.data)))}</small></span><span class="chip chip-${classe}">${esc(rotulo)}</span></li>`;
        }).join('')}</ul>` : '<p class="dica">Assim que alguém reservar pelo seu link, aparece aqui.</p>'}
      </section>
      <p class="dica centro">Os cliques contam uma vez por aparelho. Só contam clientes que ainda não conheciam o studio.</p>`;
  }

  function ligar(el, dados, studioNome) {
    const link = linkDe(dados.perfil.codigo);
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-div]');
      if (!b) return;
      if (b.dataset.div === 'copiar') {
        if (await copiar(link)) feedbackBotao(b, `${icone('check')}Link copiado`);
        else toast('Não deu para copiar. Segure o dedo sobre o link para copiar.', 'erro');
      }
      if (b.dataset.div === 'compartilhar') {
        if (navigator.share) {
          try { await navigator.share({ title: studioNome, text: convite(studioNome, link).replace(link, '').trim(), url: link }); } catch { /* cancelado */ }
        } else if (await copiar(link)) toast('Link copiado. Agora é só colar onde quiser divulgar.', 'ok');
      }
    });
  }

  return { linkDe, html, ligar };
})();
