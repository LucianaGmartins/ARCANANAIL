/* Arcana Nail — conversa com o Apps Script (ou com o servidor de demonstração). */

const API = (() => {
  const URL_API = String((window.ARCANA_CONFIG && window.ARCANA_CONFIG.API_URL) || '').trim();
  const demo = !URL_API;
  let servidorDemo = null;

  function carregarScript(src) {
    return new Promise((ok, falhou) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = falhou;
      document.head.append(s);
    });
  }

  async function obterDemo() {
    if (servidorDemo) return servidorDemo;
    if (typeof criarServidorArcana === 'undefined') await carregarScript('servidor/nucleo.js');
    if (!window.ArcanaDemo) await carregarScript('js/demo.js');
    servidorDemo = window.ArcanaDemo.servidor;
    return servidorDemo;
  }

  function erro(msg, codigo) {
    const e = new Error(msg);
    e.publico = true;
    e.codigo = codigo || '';
    return e;
  }

  function tratar(r) {
    if (r && r.ok) return r.dados;
    throw erro((r && r.erro) || 'Algo saiu errado. Tente de novo.', r && r.codigo);
  }

  async function chamar(acao, dados = {}, token = '') {
    const pacote = { acao, dados, token };
    if (demo) {
      const s = await obterDemo();
      await new Promise((r) => setTimeout(r, 220 + Math.random() * 260)); // imita a latência real
      return tratar(s.processar(JSON.parse(JSON.stringify(pacote))));
    }
    const controle = new AbortController();
    const prazo = setTimeout(() => controle.abort(), 25000);
    try {
      // Corpo em texto puro: o Apps Script aceita sem a checagem prévia de CORS.
      const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify(pacote), signal: controle.signal });
      return tratar(await resp.json());
    } catch (e) {
      if (e && e.publico) throw e;
      throw erro('Sem conexão com a agenda agora. Confira a internet e tente de novo.', 'rede');
    } finally {
      clearTimeout(prazo);
    }
  }

  return { chamar, demo };
})();
