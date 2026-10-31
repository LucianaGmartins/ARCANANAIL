/*
 * Arcana Nail — banco de demonstração.
 * Só é carregado quando js/config.js está sem API_URL.
 * Usa o mesmo núcleo do servidor real, com os dados guardados no localStorage.
 */
(function () {
  var CHAVE = 'arcana-demo-v1';

  function hojeMais(n) { var d = new Date(); d.setDate(d.getDate() + n); return isoLocal(d); }
  function agoraIso() { var d = new Date(); return isoLocal(d) + 'T' + d.toTimeString().slice(0, 8); }

  // Hash simples e síncrono: serve só para a demonstração (o servidor real usa SHA-256).
  function hashDemo(s) {
    var h1 = 0x811c9dc5, h2 = 0x01000193;
    for (var i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619);
      h2 = Math.imul(h2 ^ s.charCodeAt(i), 2246822519);
    }
    return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  var banco;
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(banco)); } catch (e) { /* sem espaço */ } }

  var db = {
    listar: function (t) { return banco[t].map(function (o) { return Object.assign({}, o); }); },
    inserir: function (t, o) { banco[t].push(Object.assign({}, o)); salvar(); },
    atualizar: function (t, campo, valor, patch) {
      var r = banco[t].filter(function (x) { return String(x[campo]) === String(valor); })[0];
      if (!r) return false;
      Object.assign(r, patch); salvar(); return true;
    },
    substituirTudo: function (t, linhas) { banco[t] = linhas.map(function (o) { return Object.assign({}, o); }); salvar(); },
    lerConfig: function () { return Object.assign({}, banco.config); },
    salvarConfig: function (o) { Object.assign(banco.config, o); salvar(); },
    segredo: function (k, v) {
      if (v === undefined) return banco.segredos[k] === undefined ? null : banco.segredos[k];
      banco.segredos[k] = String(v); salvar();
    },
    apagarSegredo: function (k) { delete banco.segredos[k]; salvar(); },
    relogio: function () { var d = new Date(); return { data: isoLocal(d), minutos: d.getHours() * 60 + d.getMinutes(), iso: agoraIso() }; },
    hash: hashDemo,
    uuid: uuid,
    comTrava: function (fn) { return fn(); },
    log: function (e) { console.error(e); }
  };

  function semear() {
    banco = { versao: 1, config: Object.assign({}, CONFIG_PADRAO, { instagram: 'arcananail' }), servicos: [], horarios: [], bloqueios: [], agendamentos: [], clientes: [], segredos: {} };
    banco.servicos = SERVICOS_PADRAO.map(function (s, i) {
      return { id: 's' + (i + 1), categoria: s[0], nome: s[1], descricao: s[2], preco: s[3], duracao: s[4], ativo: 'sim', ordem: i + 1 };
    });
    banco.horarios = HORARIOS_PADRAO.map(function (h) {
      return { dia: h[0], nome: NOMES_DIAS[h[0]], aberto: h[1] ? 'sim' : 'não', inicio: h[2], fim: h[3], pausaInicio: h[4], pausaFim: h[5] };
    });
    banco.bloqueios = [{ data: hojeMais(12), motivo: 'Curso de aperfeiçoamento' }];

    var clientes = [
      ['Ana Luiza Bezerra', '88990001101', '1997-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-18'],
      ['Beatriz Moura', '88990001102', '1995-03-02'],
      ['Camila Arraes', '88990001103', ''],
      ['Larissa Feitosa', '88990001104', '2000-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-27'],
      ['Maria Clara Sampaio', '88990001105', '1999-11-09'],
      ['Júlia Teles', '88990001106', ''],
      ['Fernanda Brito', '88990001107', '1993-07-21'],
      ['Rafaela Cordeiro', '88990001108', '']
    ];
    var s = function (id) { return banco.servicos.filter(function (x) { return x.id === id; })[0]; };
    var combos = [['s1'], ['s4', 's7'], ['s14'], ['s2', 's9'], ['s4'], ['s12'], ['s3', 's6'], ['s13'], ['s5'], ['s4', 's10']];
    var semente = 7;
    var sorte = function () { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };

    for (var d = -24; d <= 9; d++) {
      var data = hojeMais(d), dia = paraData(data).getDay();
      if (dia === 0 || banco.bloqueios.some(function (b) { return b.data === data; })) continue;
      var turnos = dia === 6 ? ['08:00', '10:30'] : ['08:00', '13:00', '15:30'];
      turnos.forEach(function (hora, t) {
        if (d === 1 && t !== 1) return; // amanhã com vagas para testar a reserva
        if (sorte() < (d > 0 ? 0.45 : 0.2)) return;
        var c = clientes[Math.floor(sorte() * clientes.length)];
        var ids = combos[Math.floor(sorte() * combos.length)];
        var lista = ids.map(s);
        var dur = lista.reduce(function (a, x) { return a + x.duracao; }, 0);
        var limite = hora === '08:00' ? (dia === 6 ? 150 : 240) : hora === '10:30' ? 210 : hora === '13:00' ? 150 : 150;
        if (dur > limite) { lista = [s('s14')]; ids = ['s14']; dur = 45; }
        var total = lista.reduce(function (a, x) { return a + x.preco; }, 0);
        var status = d < 0 ? (sorte() < 0.08 ? 'faltou' : sorte() < 0.06 ? 'cancelado' : 'concluido')
          : d === 0 ? 'confirmado' : (sorte() < 0.35 ? 'aguardando' : 'confirmado');
        var criado = hojeMais(Math.min(d, 0) - 3) + 'T1' + Math.floor(sorte() * 9) + ':2' + Math.floor(sorte() * 9) + ':00';
        if (status === 'aguardando') criado = agoraIso().slice(0, 11) + String(Math.max(0, new Date().getHours() - 1 - Math.floor(sorte() * 14))).padStart(2, '0') + ':10:00';
        banco.agendamentos.push({
          codigo: 'AN-' + 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'.charAt(Math.floor(sorte() * 31)) + String(100 + banco.agendamentos.length).slice(-3),
          criadoEm: criado, data: data, hora: hora, duracao: dur, cliente: c[0], whatsapp: c[1], nascimento: c[2],
          servicos: lista.map(function (x) { return x.nome; }).join(' + '), servicoIds: ids.join(','),
          total: total, sinal: Math.round(total * 20) / 100, status: status, origem: sorte() < 0.7 ? 'app' : 'studio',
          obs: sorte() < 0.25 ? 'Quer formato amendoado, tom nude rosado.' : '', atualizadoEm: criado
        });
      });
    }
    banco.clientes = clientes.map(function (c) { return { whatsapp: c[1], nome: c[0], nascimento: c[2], criadoEm: hojeMais(-60), atualizadoEm: hojeMais(-60) }; });
    criarServidorArcana(db).definirSenha('arcana');
    salvar();
  }

  try {
    var salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (salvo && salvo.versao === 1) banco = salvo; else semear();
  } catch (e) { semear(); }

  window.ArcanaDemo = {
    servidor: criarServidorArcana(db),
    reiniciar: function () { localStorage.removeItem(CHAVE); semear(); }
  };
})();
