/* ==========================================================================
   moldura.js — a única interatividade do design/: barra A|B · tema · tela +
   delegação de tabs, modais, print e toast via data-*. Vanilla clássico
   (file:// não roda módulos): um IIFE, sem fetch, sem innerHTML de dados,
   sem dependência dos tokens dos conceitos.
   Estado: ?conceito / ?tema / ?frame VENCEM localStorage; clique persiste.
   ========================================================================== */
(function () {
  var doc = document;
  var raiz = doc.documentElement;
  var ATR = { conceito: 'conceito', tema: 'theme', frame: 'frame' };
  var OPCOES = { conceito: ['b', 'a'], tema: ['dark', 'light'], frame: ['desktop', 'mobile'] };
  var CHAVES = { conceito: 'sesi.showcase.conceito', tema: 'sesi.showcase.tema', frame: 'sesi.showcase.frame' };
  var estado = {};
  var barra = null;
  var grupoTema = null;
  var toastTimer = null;

  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado: ignora */ } }

  /* 1) estado — roda no topo do IIFE, antes de qualquer paint útil da barra.
     Precedência: URL > dataset (anti-FOUC/default da tela) > localStorage > padrão. */
  function normalizar(nome) {
    var vals = OPCOES[nome];
    var v = null;
    try { v = new URLSearchParams(doc.location.search).get(nome); } catch (e) { v = null; }
    if (!v || vals.indexOf(v) < 0) v = null;
    if (!v) { var d = raiz.dataset[ATR[nome]]; v = (d && vals.indexOf(d) >= 0) ? d : null; }
    if (!v) { var s = ler(CHAVES[nome]); v = (s && vals.indexOf(s) >= 0) ? s : null; }
    if (!v) v = vals[0];
    raiz.dataset[ATR[nome]] = v;
    return v;
  }
  estado.conceito = normalizar('conceito'); estado.tema = normalizar('tema'); estado.frame = normalizar('frame');

  /* 2) barra fixa — injetada pelo JS; as telas nunca escrevem esse markup */
  function montarBarra() {
    if (barra || doc.querySelector('.barra-showcase')) return;
    if (!doc.body) { doc.addEventListener('DOMContentLoaded', montarBarra); return; }
    var n = doc.createElement('nav');
    n.className = 'barra-showcase';
    n.setAttribute('aria-label', 'Controles do showcase');
    n.innerHTML =
      '<div class="mf-grupo" role="group" aria-label="Conceito">' +
        '<span class="mf-rotulo">Conceito</span>' +
        '<button type="button" class="mf-segmento" data-mf="conceito" data-valor="a">A</button>' +
        '<button type="button" class="mf-segmento" data-mf="conceito" data-valor="b">B</button>' +
      '</div>' +
      '<div class="mf-grupo" id="mf-tema" role="group" aria-label="Tema">' +
        '<span class="mf-rotulo">Tema</span>' +
        '<button type="button" class="mf-segmento" data-mf="tema" data-valor="light">Claro</button>' +
        '<button type="button" class="mf-segmento" data-mf="tema" data-valor="dark">Escuro</button>' +
      '</div>' +
      '<div class="mf-grupo" role="group" aria-label="Tela">' +
        '<span class="mf-rotulo">Tela</span>' +
        '<button type="button" class="mf-segmento" data-mf="frame" data-valor="desktop">Desktop</button>' +
        '<button type="button" class="mf-segmento" data-mf="frame" data-valor="mobile">390px</button>' +
      '</div>' +
      '<a class="mf-link" href="../index.html">← index</a>';
    doc.body.appendChild(n);
    barra = n;
    grupoTema = n.querySelector('#mf-tema');
    pintarBarra();
    n.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('.mf-segmento') : null;
      if (!b) return;
      var nome = b.getAttribute('data-mf');
      var valor = b.getAttribute('data-valor');
      if (!nome || !OPCOES[nome] || OPCOES[nome].indexOf(valor) < 0) return;
      estado[nome] = valor;
      raiz.dataset[ATR[nome]] = valor; // clique persiste; query só vence, não persiste
      gravar(CHAVES[nome], valor);
      pintarBarra();
    });
  }

  function pintarBarra() {
    var bots = barra.querySelectorAll('.mf-segmento');
    for (var i = 0; i < bots.length; i++) {
      var b = bots[i];
      var ativo = estado[b.getAttribute('data-mf')] === b.getAttribute('data-valor');
      b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    }
    grupoTema.hidden = estado.conceito === 'a'; // o A não tem tema
  }

  /* 3) tabs: [data-aba-group] + botões [data-aba] + painéis .painel-aba[data-aba] */
  function trocarAba(botao) {
    var grupo = botao.closest('[data-aba-group]');
    var escopo = grupo || doc;
    var nome = botao.getAttribute('data-aba');
    var bs = escopo.querySelectorAll('button[data-aba]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-selected', bs[i] === botao ? 'true' : 'false');
    var ps = escopo.querySelectorAll('.painel-aba[data-aba]');
    for (var j = 0; j < ps.length; j++) ps[j].hidden = ps[j].getAttribute('data-aba') !== nome;
  }

  function abrirModal(seletor) {
    var alvo = null;
    try { alvo = seletor ? doc.querySelector(seletor) : null; } catch (e) { alvo = null; }
    if (alvo) alvo.classList.add('modal-aberto');
  }
  function fecharTodosModais() {
    var abertos = doc.querySelectorAll('.modal.modal-aberto');
    for (var i = 0; i < abertos.length; i++) abertos[i].classList.remove('modal-aberto');
  }

  function mostrarToast(texto) {
    var velho = doc.getElementById('mf-toast');
    if (velho && velho.parentNode) velho.parentNode.removeChild(velho);
    var t = doc.createElement('div');
    t.id = 'mf-toast';
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = texto || ''; // autor via data-toast — nunca innerHTML
    doc.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  /* delegação única no documento */
  doc.addEventListener('click', function (e) {
    var alvo = e.target;
    if (!alvo || typeof alvo.closest !== 'function') return;
    var botao = alvo.closest('button[data-aba]');
    if (botao) { trocarAba(botao); return; }
    var abre = alvo.closest('[data-abre]');
    if (abre) { abrirModal(abre.getAttribute('data-abre')); return; }
    var fecha = alvo.closest('[data-fecha]');
    if (fecha) {
      var m = fecha.closest('.modal');
      if (m) m.classList.remove('modal-aberto'); else fecharTodosModais();
      return;
    }
    if (alvo.closest('[data-print]')) { try { window.print(); } catch (e2) { /* sem print */ } return; }
    var gatilho = alvo.closest('[data-toast]');
    if (gatilho) mostrarToast(gatilho.getAttribute('data-toast'));
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fecharTodosModais();
  });

  /* estado inicial das tabs: respeita aria-selected da tela; senão, a primeira */
  function iniciarTabs() {
    var grupos = doc.querySelectorAll('[data-aba-group]');
    for (var i = 0; i < grupos.length; i++) {
      var sel = grupos[i].querySelector('button[data-aba][aria-selected="true"]') ||
                grupos[i].querySelector('button[data-aba]');
      if (sel) trocarAba(sel);
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', function () { montarBarra(); iniciarTabs(); });
  } else { montarBarra(); iniciarTabs(); }
})();
