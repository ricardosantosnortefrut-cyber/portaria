const ui = {
  sectionsSelector: ".section",
  vehicleSubsections: ["listaVeiculosContent", "agendamentoVeiculosContent"]
};

const dashboardState = {
  slides: [],
  activeIndex: 0,
  timerId: null
};

const THEME_STORAGE_KEY = "nortefrut-theme";

function atualizarBotaoTema() {
  const botao = getById("themeToggle");
  if (!botao) return;

  const escuroAtivo = document.body.classList.contains("theme-dark");
  botao.innerHTML = escuroAtivo
    ? '<i data-lucide="sun-medium"></i>'
    : '<i data-lucide="moon-star"></i>';
  botao.setAttribute("aria-label", escuroAtivo ? "Voltar para modo claro" : "Ativar modo noturno");
  botao.setAttribute("title", escuroAtivo ? "Modo claro" : "Modo noturno");
  refreshLucideIcons();
}

function aplicarTema(modo) {
  const usarEscuro = modo === "dark";
  document.body.classList.toggle("theme-dark", usarEscuro);
  localStorage.setItem(THEME_STORAGE_KEY, usarEscuro ? "dark" : "light");
  aplicarContrasteCamposTema(usarEscuro);
  atualizarBotaoTema();
}

function alternarTema() {
  aplicarTema(document.body.classList.contains("theme-dark") ? "light" : "dark");
}

function inicializarTema() {
  const salvo = localStorage.getItem(THEME_STORAGE_KEY);
  aplicarTema(salvo === "dark" ? "dark" : "light");
}

function aplicarContrasteCamposTema(escuroAtivo = document.body.classList.contains("theme-dark")) {
  const alvos = document.querySelectorAll([
    ".section input:not([type='radio']):not([type='checkbox']):not([type='hidden'])",
    ".section select",
    ".section textarea",
    ".readonly-field",
    "#v_placa",
    "#ch_num",
    "#vd_valor_unitario",
    "#vd_valor_item",
    "#vd_valor_total",
    "#pm_numero",
    "#pm_status_display",
    "#pm_reboque1",
    "#pm_reboque2",
    "#pm_km_inicial",
    "#pm_km_final",
    "#pm_km_percorrido",
    "#pm_peso_declarado",
    "#pm_usuario_primeira",
    "#pm_usuario_segunda",
    "#postoMovContador"
  ].join(", "));

  alvos.forEach(campo => {
    if (!escuroAtivo) {
      campo.style.removeProperty("color");
      campo.style.removeProperty("-webkit-text-fill-color");
      campo.style.removeProperty("background");
      campo.style.removeProperty("border-color");
      campo.style.removeProperty("opacity");
      return;
    }

    campo.style.setProperty("color", "#111111", "important");
    campo.style.setProperty("-webkit-text-fill-color", "#111111", "important");
    campo.style.setProperty("background", "#f4f7fb", "important");
    campo.style.setProperty("border-color", "rgba(21, 101, 192, 0.22)", "important");
    campo.style.setProperty("caret-color", "#111111", "important");
    campo.style.setProperty("opacity", "1", "important");
  });

  ["postoContadorS10", "postoContadorS500", "postoContadorArla"].forEach(id => {
    const el = getById(id);
    if (!el) return;
    if (!escuroAtivo) {
      el.style.removeProperty("color");
      el.style.removeProperty("-webkit-text-fill-color");
      el.style.removeProperty("opacity");
      return;
    }
    el.style.setProperty("color", "#111111", "important");
    el.style.setProperty("-webkit-text-fill-color", "#111111", "important");
    el.style.setProperty("opacity", "1", "important");
  });
}

function getById(id) {
  return document.getElementById(id);
}

function mostrarElemento(id) {
  const element = typeof id === "string" ? getById(id) : id;
  if (element) {
    element.classList.remove("is-hidden");
  }
}

function ocultarElemento(id) {
  const element = typeof id === "string" ? getById(id) : id;
  if (element) {
    element.classList.add("is-hidden");
  }
}

function alternarVisibilidadeElemento(id, mostrar) {
  if (mostrar) {
    mostrarElemento(id);
    return;
  }
  ocultarElemento(id);
}

function ocultarSecoes() {
  document.querySelectorAll(ui.sectionsSelector).forEach(secao => {
    secao.classList.remove("section-active");
    secao.style.display = "none";
  });
}

function adicionarAtalhoHomeSecoes() {
  document.querySelectorAll(".section").forEach(secao => {
    if (secao.id === "inicio") return;
    if (secao.querySelector(".section-home-link")) return;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "section-home-link";
    botao.dataset.nav = "inicio";
    botao.setAttribute("aria-label", "Voltar para a Home");
    botao.setAttribute("title", "Home");
    botao.appendChild(criarIconeLucide("house"));

    secao.prepend(botao);
  });
}

function vincularAcoesDeclarativas() {
  const exportHandlers = {
    "veiculos-semanal": exportarRelatorioVeiculosSemanal,
    "agendamentos-mensal": exportarRelatorioAgendamentosMensal,
    "empilhadeiras-mensal": exportarRelatorioEmpilhadeirasMensal,
    "chaves-mensal": exportarRelatorioChavesMensal,
    "guarda-mensal": exportarRelatorioGuardaMensal,
    "jogos-mensal": exportarRelatorioJogosMensal
  };

  const actionHandlers = {
    "fechar-subveiculos": fecharSubVeiculos,
    "abrir-agendamento": abrirFormAgendamento,
    "salvar-agendamento": salvarAgendamento,
    "fechar-agendamento": fecharFormAgendamento,
    "processar-veiculo": processarVeiculo,
    "voltar-veiculos": voltarVeiculos,
    "abrir-chave": abrirFormChave,
    "salvar-chave": salvarChave,
    "cancelar-chave": cancelarFormChave,
    "abrir-guarda": abrirFormGuarda,
    "salvar-guarda": salvarGuarda,
    "fechar-guarda": fecharFormGuarda,
    "abrir-jogo": abrirFormJogo,
    "salvar-jogo": salvarJogo,
    "fechar-jogo": fecharFormJogo,
    "adicionar-item-venda": adicionarItemVenda,
    "salvar-venda": salvarVenda,
    "copiar-cupom-venda": copiarCupomVenda,
    "imprimir-cupom-venda": imprimirCupomVenda,
    "nova-venda": limparFormVenda,
    "ocultar-preview-venda": ocultarPreviewVenda,
    "abrir-empilhadeira": abrirFormEmpilhadeira,
    "salvar-empilhadeira": salvarAbastecimento,
    "cancelar-empilhadeira": cancelarFormEmpilhadeira,
    "abrir-posto-abastecimento": () => abrirFormPostoMovimentacao("abastecimento"),
    "abrir-posto-recebimento": () => abrirFormPostoMovimentacao("recebimento"),
    "cancelar-posto-movimentacao": cancelarFormPostoMovimentacao,
    "salvar-posto-movimentacao": salvarMovimentacaoPosto,
    "abrir-posto-plantao-resumo": abrirResumoPlantaoPosto,
    "abrir-posto-plantao-abertura": abrirFormPostoPlantaoAbertura,
    "abrir-posto-plantao-fechamento": abrirFormPostoPlantaoFechamento,
    "cancelar-posto-plantao": cancelarFormPostoPlantao,
    "salvar-posto-plantao": salvarPlantaoPosto,
    "abrir-relatorio-posto": abrirRelatorioPosto,
    "voltar-relatorio-posto": fecharRelatorioPosto,
    "imprimir-relatorio-posto": imprimirRelatorioPosto,
    "aplicar-filtros-posto-relatorio": aplicarFiltrosRelatorioPosto,
    "exportar-posto-filtrado": exportarRelatorioPostoFiltrado,
    "salvar-pesagem-manual": salvarPesagemManual,
    "nova-pesagem-manual": limparFormularioPesagemManual,
    "editar-pesagem-manual": editarPesagemManualSelecionada,
    "voltar-lista-pesagem-manual": voltarListaPesagemManual,
    "gerar-ticket-pesagem-manual": gerarTicketPesagemManual,
    "imprimir-ticket-pesagem-manual": () => imprimirTicketPesagemManual(),
    "enviar-relatorio-pesagem-manual": enviarRelatorioPesagemManual,
    "preencher-primeira-pesagem-agora": () => preencherDataHoraPesagemManual("primeira"),
    "preencher-segunda-pesagem-agora": () => preencherDataHoraPesagemManual("segunda"),
    "aplicar-filtros-veiculos-relatorio": aplicarFiltrosRelatorioVeiculos,
    "exportar-veiculos-filtrado": exportarRelatorioVeiculosFiltrado,
    "aplicar-filtros-agendamentos-relatorio": aplicarFiltrosRelatorioAgendamentos,
    "exportar-agendamentos-filtrado": exportarRelatorioAgendamentosFiltrado,
    "aplicar-filtros-vendas-relatorio": aplicarFiltrosRelatorioVendas,
    "exportar-vendas-filtrado": exportarRelatorioVendasFiltrado,
    "aplicar-filtros-empilhadeiras-relatorio": aplicarFiltrosRelatorioEmpilhadeiras,
    "exportar-empilhadeiras-filtrado": exportarRelatorioEmpilhadeirasFiltrado,
    "aplicar-filtros-chaves-relatorio": aplicarFiltrosRelatorioChaves,
    "exportar-chaves-filtrado": exportarRelatorioChavesFiltrado,
    "aplicar-filtros-guardas-relatorio": aplicarFiltrosRelatorioGuardas,
    "exportar-guardas-filtrado": exportarRelatorioGuardasFiltrado,
    "aplicar-filtros-jogos-relatorio": aplicarFiltrosRelatorioJogos,
    "exportar-jogos-filtrado": exportarRelatorioJogosFiltrado
  };

  const itemHandlers = {
    "abrir-veiculo": trigger => prepararForm(trigger.dataset.placa),
    "finalizar-agendamento": trigger => finalizarAgendamento(trigger.dataset.id),
    "devolver-chave": trigger => devolverChave(trigger.dataset.id),
    "devolver-jogo": trigger => devolverJogo(trigger.dataset.id),
    "devolver-guarda": trigger => devolverGuarda(trigger.dataset.id),
    "abrir-venda": trigger => abrirCupomVenda(trigger.dataset.id),
    "remover-item-venda": trigger => removerItemVenda(trigger.dataset.id),
    "abrir-pesagem-manual": trigger => abrirPesagemManualPorId(trigger.dataset.id),
    "ticket-pesagem-manual": trigger => visualizarTicketPesagemManual(trigger.dataset.id),
    "imprimir-pesagem-manual": trigger => imprimirTicketPesagemManual(trigger.dataset.id)
  };

  document.addEventListener("click", event => {
    const menuToggle = event.target.closest("[data-menu-toggle]");
    if (menuToggle) {
      const menu = menuToggle.closest(".menu");
      if (!menu) return;
      const isOpen = menu.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      return;
    }

    const trigger = event.target.closest("[data-nav], [data-subveiculos], [data-action], [data-export], [data-item-action]");
    if (!trigger) return;
    if (trigger.dataset.nav) return void abrir(trigger.dataset.nav);
    if (trigger.dataset.subveiculos) return void exibirSubVeiculos(trigger.dataset.subveiculos);
    if (trigger.dataset.action) return void actionHandlers[trigger.dataset.action]?.(trigger);
    if (trigger.dataset.export) return void exportHandlers[trigger.dataset.export]?.(Number(trigger.dataset.offset || 0));
    if (trigger.dataset.itemAction) return void itemHandlers[trigger.dataset.itemAction]?.(trigger);
  });

  document.addEventListener("click", event => {
    document.querySelectorAll(".menu.is-open").forEach(menu => {
      if (menu.contains(event.target)) return;
      menu.classList.remove("is-open");
      const toggle = menu.querySelector("[data-menu-toggle]");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("keydown", event => {
    const trigger = event.target.closest("[data-nav]");
    if (!trigger) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    abrir(trigger.dataset.nav);
  });
}

function criarBotaoAcaoItem(texto, itemAction, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "botao devolver";
  button.textContent = texto;
  button.dataset.itemAction = itemAction;
  button.dataset.id = id;
  return button;
}

function criarIconeLucide(nome, classes = "") {
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", nome);
  icon.setAttribute("aria-hidden", "true");
  icon.className = classes.trim();
  return icon;
}

function criarParagrafoVazio(texto) {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-state";
  paragraph.textContent = texto;
  return paragraph;
}

function criarLinhaCard(conteudo, tag = "small") {
  const linha = document.createElement(tag);
  linha.className = "card-line";
  if (typeof conteudo === "string") {
    linha.textContent = conteudo;
    return linha;
  }

  if (conteudo?.icon) {
    linha.appendChild(criarIconeLucide(conteudo.icon, "card-line-icon"));
  }

  const texto = document.createElement("span");
  texto.textContent = conteudo?.text || "";
  linha.appendChild(texto);
  return linha;
}

function criarCardRegistro({ classes = "", titulo, linhas = [], actionText, actionName, actionId, color = "" }) {
  const card = criarCardBase(classes);
  if (color) card.style.color = color;

  const tituloEl = document.createElement("b");
  tituloEl.textContent = titulo;
  card.appendChild(tituloEl);

  linhas.forEach(linha => {
    card.appendChild(criarLinhaCard(linha));
  });

  if (actionText && actionName && actionId) {
    card.classList.add("card-actionable");
    card.dataset.itemAction = actionName;
    card.dataset.id = actionId;
    card.setAttribute("role", "button");
    card.tabIndex = 0;

    const actionHint = document.createElement("span");
    actionHint.className = "card-action-hint";
    actionHint.textContent = actionText.toLowerCase().includes("devol")
      ? "Devolver"
      : actionText.toLowerCase().includes("finalizar")
        ? "Finalizar"
        : actionText;
    card.appendChild(actionHint);

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
  }

  return card;
}

function avisoValidacao(texto) {
  mostrarAviso(texto, "warning", "triangle-alert");
}

function avisoSucesso(texto, icone = "check-circle-2") {
  mostrarAviso(texto, "success", icone);
}

function avisoInfo(texto, icone = "info") {
  mostrarAviso(texto, "info", icone);
}

function avisoErro(texto = "Não foi possível concluir a ação.") {
  mostrarAviso(texto, "error", "triangle-alert");
}

function validarPorteiroAutorizado(nome) {
  return porteirosAutorizados.includes(nome);
}

function validarNumeroPositivo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0;
}

function normalizarTexto(valor) {
  return valor.trim().toUpperCase();
}

function formatarDataISOParaBR(dataIso) {
  return dataIso ? dataIso.split("-").reverse().join("/") : "";
}


function configurarCamposMaiusculos() {
  document.querySelectorAll("[data-uppercase]").forEach(campo => {
    campo.addEventListener("input", () => {
      const inicio = campo.selectionStart;
      const fim = campo.selectionEnd;
      campo.value = campo.value.toUpperCase();
      if (typeof inicio === "number" && typeof fim === "number") {
        campo.setSelectionRange(inicio, fim);
      }
    });
  });
}

function criarCardBase(classes = "") {
  const card = document.createElement("div");
  card.className = classes.trim();
  return card;
}

function limparConteudoElemento(idOuElemento) {
  const element = typeof idOuElemento === "string" ? getById(idOuElemento) : idOuElemento;
  if (element) {
    element.replaceChildren();
  }
}

function ocultarListaAutocomplete(lista) {
  if (!lista) return;
  lista.style.display = "none";
  lista.dataset.activeIndex = "-1";
  lista.querySelectorAll(".autocomplete-item").forEach(item => item.classList.remove("is-active"));
}

function mostrarListaAutocomplete(lista) {
  if (lista) lista.style.display = "block";
}

function criarItemAutocomplete(texto, onSelect, destaque = null) {
  const item = document.createElement("div");
  item.className = "autocomplete-item";
  if (destaque) {
    const strong = document.createElement("b");
    strong.textContent = destaque;
    item.append(strong, document.createTextNode(` ${texto}`));
  } else {
    item.textContent = texto;
  }
  item.addEventListener("click", onSelect);
  return item;
}

function preencherAutocompleteLista(lista, itens) {
  limparConteudoElemento(lista);
  lista.dataset.activeIndex = "-1";
  itens.forEach(item => lista.appendChild(item));
}

function atualizarAutocompleteAtivo(lista, indice) {
  if (!lista) return;
  const itens = Array.from(lista.querySelectorAll(".autocomplete-item"));
  if (!itens.length) {
    lista.dataset.activeIndex = "-1";
    return;
  }

  const limite = itens.length - 1;
  const proximoIndice = Math.max(0, Math.min(indice, limite));
  lista.dataset.activeIndex = String(proximoIndice);

  itens.forEach((item, index) => {
    item.classList.toggle("is-active", index === proximoIndice);
  });

  itens[proximoIndice].scrollIntoView({ block: "nearest" });
}

function habilitarTecladoAutocomplete(input, lista) {
  if (!input || !lista || input.dataset.keyboardAutocompleteReady === "true") return;

  input.addEventListener("keydown", event => {
    const itens = Array.from(lista.querySelectorAll(".autocomplete-item"));
    const visivel = lista.style.display === "block" && itens.length > 0;
    const indiceAtual = Number(lista.dataset.activeIndex || "-1");

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!visivel) {
        mostrarListaAutocomplete(lista);
      }
      atualizarAutocompleteAtivo(lista, indiceAtual + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!visivel) {
        mostrarListaAutocomplete(lista);
      }
      atualizarAutocompleteAtivo(lista, indiceAtual <= 0 ? 0 : indiceAtual - 1);
      return;
    }

    if (event.key === "Enter" && visivel) {
      const itemAtivo = itens[indiceAtual] || itens[0];
      if (itemAtivo) {
        event.preventDefault();
        itemAtivo.click();
      }
      return;
    }

    if (event.key === "Escape" && visivel) {
      event.preventDefault();
      ocultarListaAutocomplete(lista);
    }
  });

  input.dataset.keyboardAutocompleteReady = "true";
}

function atualizarNavegacaoAtiva(sectionId) {
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.nav === sectionId);
  });
}

function atualizarIndicador(id, valor) {
  const el = getById(id);
  if (el) el.textContent = String(valor);
}

function calcularPendenciasEmpilhadeiras(registros = {}) {
  const diaSemana = new Date().getDay();
  const diasComAbastecimento = [1, 3, 5];
  if (!diasComAbastecimento.includes(diaSemana)) return 0;

  const hoje = new Date().toLocaleDateString("pt-BR");
  const ultimosPorNumero = new Map();

  Object.values(registros).forEach(item => {
    if (!item?.num) return;
    ultimosPorNumero.set(String(item.num), item.data || "");
  });

  if (ultimosPorNumero.size === 0) return 0;

  let pendentes = 0;
  ultimosPorNumero.forEach(data => {
    if (data !== hoje) pendentes += 1;
  });

  return pendentes;
}

function construirSlidesOperacionais(dados) {
  const agendamentos = Object.values(dados.agendamentos || {});
  const hojeIso = new Date().toISOString().slice(0, 10);
  const agendadosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const diaSemana = new Date().getDay();
  const diasComAbastecimento = [1, 3, 5];
  const mostrarSlideEmpilhadeiras = diasComAbastecimento.includes(diaSemana);
  const empilhadeirasPendentes = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;

  const slides = [
    {
      title: "Agendamentos do dia",
      text: agendadosHoje.length
        ? `${agendadosHoje.length} veículo(s) programado(s) para hoje. Próximo destino: ${agendadosHoje[0].local || "a definir"}.`
        : "Nenhum veículo agendado para hoje. A agenda da frota está livre no momento."
    },
    {
      title: "Painel do turno",
      text: `${veiculosRua} veículo(s) na rua, ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) em uso agora.`
    }
  ];

  if (mostrarSlideEmpilhadeiras) {
    slides.splice(1, 0, {
      title: "Empilhadeiras",
      text: empilhadeirasPendentes
        ? `${empilhadeirasPendentes} empilhadeira(s) estão sem abastecimento de hoje e pedem atenção operacional.`
        : "As empilhadeiras monitoradas já têm abastecimento registrado hoje."
    });
  }

  return slides;
}

function renderListaAtencao(dados) {
  const container = getById("attentionList");
  if (!container) return;
  limparConteudoElemento(container);

  const itens = [];
  const agendamentosHoje = Object.values(dados.agendamentos || {}).filter(item => item?.data === new Date().toISOString().slice(0, 10));
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const pendentesEmp = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});

  if (agendamentosHoje.length) itens.push({ icon: "calendar-days", text: `${agendamentosHoje.length} agendamento(s) previsto(s) para hoje.` });
  if (veiculosRua) itens.push({ icon: "car-front", text: `${veiculosRua} veículo(s) seguem na rua neste momento.` });
  if (chavesUso || jogosUso || guardasUso) itens.push({ icon: "clipboard-list", text: `${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) em uso.` });
  if (pendentesEmp) itens.push({ icon: "forklift", text: `${pendentesEmp} empilhadeira(s) pedem abastecimento hoje.` });

  if (!itens.length) {
    const vazio = document.createElement("p");
    vazio.className = "attention-empty";
    vazio.textContent = "Nenhuma pendência crítica no momento.";
    container.appendChild(vazio);
    return;
  }

  itens.slice(0, 3).forEach(item => {
    const linha = document.createElement("div");
    linha.className = "attention-item";
    linha.appendChild(criarIconeLucide(item.icon));
    const texto = document.createElement("span");
    texto.textContent = item.text;
    linha.appendChild(texto);
    container.appendChild(linha);
  });
}

function renderListaAtencao(dados) {
  const container = getById("attentionList");
  const primary = getById("attentionPrimary");
  const next = getById("attentionNext");
  if (!container || !primary || !next) return;

  limparConteudoElemento(container);
  limparConteudoElemento(primary);
  limparConteudoElemento(next);

  const hojeIso = new Date().toISOString().slice(0, 10);
  const agendamentosHoje = Object.values(dados.agendamentos || {}).filter(item => item?.data === hojeIso);
  const proximosAgendamentos = Object.values(dados.agendamentos || {})
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`));
  const proximoAgendamento = proximosAgendamentos[0];
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const pendentesEmp = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const totalAbertos = veiculosRua + chavesUso + jogosUso + guardasUso;
  const itens = [];

  const primaryKicker = document.createElement("span");
  primaryKicker.className = "attention-kicker";
  primaryKicker.textContent = "Em uso agora";
  const primaryTitle = document.createElement("strong");
  primaryTitle.textContent = `${totalAbertos} movimentação(ões) aberta(s)`;
  const primaryText = document.createElement("p");
  primaryText.textContent = `${veiculosRua} veículo(s), ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) em andamento.`;
  primary.append(primaryKicker, primaryTitle, primaryText);

  const nextKicker = document.createElement("span");
  nextKicker.className = "attention-kicker";
  nextKicker.textContent = "Próximo agendamento";
  const nextTitle = document.createElement("strong");
  const nextText = document.createElement("p");

  if (proximoAgendamento) {
    nextTitle.textContent = `${proximoAgendamento.veiculo || "Veículo"} às ${proximoAgendamento.hora || "--:--"}`;
    nextText.textContent = `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`;
  } else {
    nextTitle.textContent = "Agenda livre";
    nextText.textContent = "Nenhum agendamento futuro cadastrado no momento.";
  }

  next.append(nextKicker, nextTitle, nextText);

  if (agendamentosHoje.length) itens.push({ icon: "calendar-days", text: `${agendamentosHoje.length} agendamento(s) previsto(s) para hoje.` });
  if (veiculosRua) itens.push({ icon: "car-front", text: `${veiculosRua} veículo(s) seguem na rua neste momento.` });
  if (chavesUso || jogosUso || guardasUso) itens.push({ icon: "clipboard-list", text: `${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) em uso.` });
  if (pendentesEmp) itens.push({ icon: "forklift", text: `${pendentesEmp} empilhadeira(s) pedem abastecimento hoje.` });

  if (!itens.length) {
    const vazio = document.createElement("p");
    vazio.className = "attention-empty";
    vazio.textContent = "Nenhuma pendência crítica no momento.";
    container.appendChild(vazio);
    return;
  }

  itens.slice(0, 3).forEach(item => {
    const linha = document.createElement("div");
    linha.className = "attention-item";
    linha.appendChild(criarIconeLucide(item.icon));
    const texto = document.createElement("span");
    texto.textContent = item.text;
    linha.appendChild(texto);
    container.appendChild(linha);
  });

  refreshLucideIcons();
}

function construirSlidesOperacionais(dados) {
  const agendamentos = Object.values(dados.agendamentos || {});
  const hojeIso = new Date().toISOString().slice(0, 10);
  const agendadosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const diaSemana = new Date().getDay();
  const diasComAbastecimento = [1, 3, 5];
  const mostrarSlideEmpilhadeiras = diasComAbastecimento.includes(diaSemana);
  const empilhadeirasPendentes = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;

  const slides = [
    {
      title: "Agenda e circulacao do dia",
      text: agendadosHoje.length
        ? `${agendadosHoje.length} veiculo(s) programado(s) para hoje. Proximo destino: ${agendadosHoje[0].local || "a definir"}.`
        : "Nenhum veiculo agendado para hoje. A agenda da frota esta livre neste momento."
    },
    {
      title: "Visao geral do turno",
      text: `${veiculosRua} veiculo(s) na rua, ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) em uso agora.`
    }
  ];

  if (mostrarSlideEmpilhadeiras) {
    slides.splice(1, 0, {
      title: "Empilhadeiras",
      text: empilhadeirasPendentes
        ? `${empilhadeirasPendentes} empilhadeira(s) estao sem abastecimento de hoje e pedem atencao operacional.`
        : "As empilhadeiras monitoradas ja tem abastecimento registrado hoje."
    });
  }

  return slides;
}

function renderSlideOperacional() {
  const title = getById("operationalTitle");
  const text = getById("operationalText");
  const dotsContainer = document.querySelector(".operational-dots");
  if (!title || !text || dashboardState.slides.length === 0) return;

  const atual = dashboardState.slides[dashboardState.activeIndex] || dashboardState.slides[0];
  title.textContent = atual.title;
  text.textContent = atual.text;

  if (dotsContainer) {
    dotsContainer.replaceChildren();
    dashboardState.slides.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.className = "operational-dot";
      dot.classList.toggle("active", index === dashboardState.activeIndex);
      dotsContainer.appendChild(dot);
    });
  }
}

function renderAgendaHome(dados) {
  const lista = getById("homeScheduleList");
  if (!lista) return;

  lista.replaceChildren();

  const hojeIso = obterDataIsoLocal();
  const agendamentos = Object.values(dados.agendamentos || {})
    .filter(item => item?.data)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))
    .filter(item => item.data >= hojeIso)
    .slice(0, 5);

  if (!agendamentos.length) {
    const vazio = document.createElement("div");
    vazio.className = "home-schedule-empty";
    vazio.textContent = "Nenhum agendamento cadastrado para hoje ou para os próximos dias.";
    lista.appendChild(vazio);
    return;
  }

  agendamentos.forEach(item => {
    const card = document.createElement("div");
    card.className = "home-schedule-item";

    const tempo = document.createElement("div");
    tempo.className = "home-schedule-time";
    const hora = document.createElement("strong");
    hora.textContent = formatarDataISOParaBR(item.data) || "-";
    const data = document.createElement("span");
    data.textContent = item.hora || "--:--";
    tempo.append(hora, data);

    const conteudo = document.createElement("div");
    conteudo.className = "home-schedule-content";
    const titulo = document.createElement("strong");
    titulo.textContent = item.veiculo || "Veiculo";
    const meta = document.createElement("div");
    meta.className = "home-schedule-meta";
    meta.textContent = item.local || "Destino a definir";
    const detalhe = document.createElement("div");
    detalhe.className = "home-schedule-detail";
    detalhe.textContent = item.quem || "Condutor a definir";
    conteudo.append(titulo, meta, detalhe);

    card.append(tempo, conteudo);
    lista.appendChild(card);
  });
}

function renderListaAtencao(dados) {
  const now = getById("attentionNow");
  const next = getById("attentionNext");
  const alert = getById("attentionAlert");
  if (!now || !next || !alert) return;

  limparConteudoElemento(now);
  limparConteudoElemento(next);
  limparConteudoElemento(alert);

  const agora = new Date();
  const horaAtual = agora.getHours();
  const hojeIso = agora.toISOString().slice(0, 10);
  const agendamentos = Object.values(dados.agendamentos || {});
  const agendamentosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const proximoAgendamento = agendamentos
    .filter(item => item?.data && new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))[0];

  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const pendentesEmp = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const movimentosAbertos = veiculosRua + chavesUso + jogosUso + guardasUso;

  function preencherLinha(container, iconName, kicker, title, text, primary = false) {
    container.className = primary ? "attention-row attention-row-primary" : "attention-row";

    const iconWrap = document.createElement("div");
    iconWrap.className = "attention-row-icon";
    iconWrap.appendChild(criarIconeLucide(iconName));

    const content = document.createElement("div");
    content.className = "attention-row-content";

    const kickerEl = document.createElement("span");
    kickerEl.className = "attention-kicker";
    kickerEl.textContent = kicker;

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;

    const textEl = document.createElement("p");
    textEl.textContent = text;

    content.append(kickerEl, titleEl, textEl);
    container.append(iconWrap, content);
  }

  if (pendentesEmp) {
    preencherLinha(now, "shield-alert", "Agora", `${pendentesEmp} pendencia(s) de empilhadeira`, "Conferir os abastecimentos previstos para hoje antes da virada do turno.", true);
  } else if (movimentosAbertos) {
    preencherLinha(now, "shield-alert", "Agora", `${movimentosAbertos} movimentacao(oes) aberta(s)`, `${veiculosRua} veiculo(s), ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) ainda em andamento.`, true);
  } else {
    preencherLinha(now, "shield-check", "Agora", "Turno sob controle", "Sem pendencias criticas e com a operacao estavel neste momento.", true);
  }

  if (proximoAgendamento) {
    preencherLinha(next, "arrow-right-circle", "Proximo", `${proximoAgendamento.veiculo || "Veiculo"} as ${proximoAgendamento.hora || "--:--"}`, `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`);
  } else if (horaAtual < 6 || horaAtual >= 18) {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Acompanhar passagem de plantao", "Conferir os registros do posto e a rotina de troca de turno.");
  } else {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Monitorar rotina operacional", "Seguir com acessos, agenda, emprestimos e movimentacoes da portaria.");
  }

  if (agendamentosHoje.length >= 4) {
    preencherLinha(alert, "siren", "Atencao", `${agendamentosHoje.length} agendamentos concentrados hoje`, "Vale acompanhar a agenda para evitar conflito de horarios e veiculos.");
  } else if (veiculosRua >= 3) {
    preencherLinha(alert, "siren", "Atencao", `${veiculosRua} veiculo(s) seguem em operacao`, "Acompanhe os retornos para evitar virada de turno com pendencia.");
  } else if (movimentosAbertos >= 4) {
    preencherLinha(alert, "siren", "Atencao", `${movimentosAbertos} itens seguem abertos`, "O volume do turno esta alto e merece conferencia mais proxima.");
  } else {
    preencherLinha(alert, "siren", "Atencao", "Sem alerta operacional", "Nada fora do normal exigindo acao imediata.");
  }

  refreshLucideIcons();
}

function solicitarSenhaAcesso({
  titulo = "Acesso protegido",
  mensagem = "Digite a senha para continuar.",
  detalhe = "",
  placeholder = "Digite a senha",
  confirmarTexto = "Entrar",
  cancelarTexto = "Cancelar",
  icone = "lock-keyhole"
} = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const modal = document.createElement("div");
    modal.className = "confirm-modal password-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "passwordModalTitle");

    const iconWrap = document.createElement("div");
    iconWrap.className = "confirm-icon password-modal-icon";
    iconWrap.appendChild(criarIconeLucide(icone));

    const content = document.createElement("div");
    content.className = "confirm-content";

    const titleEl = document.createElement("strong");
    titleEl.id = "passwordModalTitle";
    titleEl.textContent = titulo;

    const messageEl = document.createElement("p");
    messageEl.textContent = mensagem;
    content.append(titleEl, messageEl);

    if (detalhe) {
      const detailEl = document.createElement("span");
      detailEl.className = "confirm-detail";
      detailEl.textContent = detalhe;
      content.appendChild(detailEl);
    }

    const fieldWrap = document.createElement("label");
    fieldWrap.className = "password-field";

    const fieldLabel = document.createElement("span");
    fieldLabel.className = "password-field-label";
    fieldLabel.textContent = "Senha";

    const inputWrap = document.createElement("div");
    inputWrap.className = "password-input-wrap";

    const input = document.createElement("input");
    input.type = "password";
    input.className = "password-input";
    input.placeholder = placeholder;
    input.autocomplete = "off";
    input.inputMode = "numeric";
    input.maxLength = 20;

    inputWrap.appendChild(input);
    fieldWrap.append(fieldLabel, inputWrap);

    const feedback = document.createElement("span");
    feedback.className = "password-feedback";

    const actions = document.createElement("div");
    actions.className = "confirm-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "confirm-btn confirm-btn-cancel";
    cancel.textContent = cancelarTexto;

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "confirm-btn confirm-btn-primary";
    confirm.textContent = confirmarTexto;

    let encerrado = false;

    const close = result => {
      if (encerrado) return;
      encerrado = true;
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
      resolve(result);
    };

    const validar = texto => {
      feedback.textContent = texto;
      input.classList.add("is-invalid");
      input.focus();
      input.select();
    };

    const submit = () => {
      const senha = String(input.value || "").trim();
      if (!senha) {
        validar("Digite a senha para continuar.");
        return;
      }
      close(senha);
    };

    const onKeydown = event => {
      if (!document.body.contains(overlay)) return;
      if (event.key === "Escape") close(null);
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    };

    input.addEventListener("input", () => {
      feedback.textContent = "";
      input.classList.remove("is-invalid");
    });
    cancel.addEventListener("click", () => close(null));
    confirm.addEventListener("click", submit);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close(null);
    });
    document.addEventListener("keydown", onKeydown);

    actions.append(cancel, confirm);
    modal.append(iconWrap, content, fieldWrap, feedback, actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    refreshLucideIcons();
    setTimeout(() => input.focus(), 0);
  });
}

function atualizarPainelPendencias() {
  return Promise.all([
    db.ref("status_veiculos").once("value"),
    db.ref("chaves_em_uso").once("value"),
    db.ref("jogos_em_uso").once("value"),
    db.ref("guardachuvas_em_uso").once("value"),
    db.ref("agendamentos_veiculos").once("value"),
    db.ref("abastecimentos").once("value"),
    db.ref("pesagens_manuais").once("value")
  ]).then(([veiculosSnap, chavesSnap, jogosSnap, guardasSnap, agendamentosSnap, abastecimentosSnap, pesagensSnap]) => {
    const dados = {
      veiculos: veiculosSnap.val() || {},
      chaves: chavesSnap.val() || {},
      jogos: jogosSnap.val() || {},
      guardas: guardasSnap.val() || {},
      agendamentos: agendamentosSnap.val() || {},
      abastecimentos: abastecimentosSnap.val() || {},
      pesagens: pesagensSnap.val() || {}
    };

    const veiculosRua = Object.values(dados.veiculos).filter(item => item?.emUso).length;
    const chavesUso = Object.keys(dados.chaves).length;
    const jogosUso = Object.keys(dados.jogos).length;
    const guardasUso = Object.keys(dados.guardas).length;
    const agendamentosHoje = Object.values(dados.agendamentos).filter(item => item?.data === new Date().toISOString().slice(0, 10)).length;
    const empilhadeirasPendentes = calcularPendenciasEmpilhadeiras(dados.abastecimentos);
    const pesagensAbertas = Object.values(dados.pesagens).filter(item => String(item?.statusPesagem || "AB") !== "FE").length;
    const movimentosAbertos = veiculosRua + chavesUso + jogosUso + guardasUso;

    atualizarIndicador("statVeiculosRua", veiculosRua);
    atualizarIndicador("statChavesUso", chavesUso);
    atualizarIndicador("statJogosUso", jogosUso);
    atualizarIndicador("statGuardasUso", guardasUso);
    atualizarIndicador("statAgendamentos", agendamentosHoje);
    atualizarIndicador("statEmpilhadeirasPendentes", empilhadeirasPendentes);
    atualizarIndicador("statPesagensAbertas", pesagensAbertas);
    atualizarIndicador("statMovimentosAbertos", movimentosAbertos);

    dashboardState.slides = construirSlidesOperacionais(dados);
    dashboardState.activeIndex = 0;
    renderSlideOperacional();
    renderResumoHome(dados);
    renderListaAtencao(dados);
    renderAgendaHome(dados);
    iniciarRotacaoPainel();
  }).catch(() => undefined);
}

function renderCentralAvisosHome(dados) {
  const lista = getById("homeAlertsList");
  if (!lista) return;

  lista.replaceChildren();

  const avisosCadastrados = Object.values(dados.avisosCadastro || {})
    .filter(item => item && item.ativo !== false)
    .sort((a, b) => Number(b.atualizadoEmTs || b.criadoEmTs || 0) - Number(a.atualizadoEmTs || a.criadoEmTs || 0));

  if (!avisosCadastrados.length) {
    const vazio = document.createElement("div");
    vazio.className = "home-alert-empty";
    vazio.textContent = "Nenhum aviso cadastrado no momento.";
    lista.appendChild(vazio);
    return;
  }

  avisosCadastrados.slice(0, 3).forEach(item => {
    const card = document.createElement("div");
    card.className = "home-alert-item";

    const iconWrap = document.createElement("div");
    iconWrap.className = "home-alert-icon";
    iconWrap.appendChild(criarIconeLucide(item.icone || "message-square"));

    const content = document.createElement("div");
    content.className = "home-alert-content";

    const title = document.createElement("strong");
    title.textContent = item.nome || "Aviso";

    const text = document.createElement("p");
    text.textContent = item.mensagem || "";

    content.append(title, text);
    card.append(iconWrap, content);
    lista.appendChild(card);
  });

  refreshLucideIcons();
}

function renderCentralAvisosHome(dados) {
  const lista = getById("homeAlertsList");
  if (!lista) return;

  lista.replaceChildren();

  const avisosCadastrados = Object.values(dados.avisosCadastro || {})
    .filter(item => item && item.ativo !== false)
    .sort((a, b) => Number(b.atualizadoEmTs || b.criadoEmTs || 0) - Number(a.atualizadoEmTs || a.criadoEmTs || 0));

  if (!avisosCadastrados.length) {
    const vazio = document.createElement("div");
    vazio.className = "home-alert-empty";
    vazio.textContent = "Nenhum aviso cadastrado no momento.";
    lista.appendChild(vazio);
    return;
  }

  avisosCadastrados.slice(0, 3).forEach(item => {
    const card = document.createElement("div");
    card.className = "home-alert-item";

    const iconWrap = document.createElement("div");
    iconWrap.className = "home-alert-icon";
    iconWrap.appendChild(criarIconeLucide(item.icone || "message-square"));

    const content = document.createElement("div");
    content.className = "home-alert-content";

    const title = document.createElement("strong");
    title.textContent = item.nome || "Aviso";

    const text = document.createElement("p");
    text.textContent = item.mensagem || "";

    content.append(title, text);
    card.append(iconWrap, content);
    lista.appendChild(card);
  });

  refreshLucideIcons();
}

function renderCentralAvisosHome(dados) {
  const lista = getById("homeAlertsList");
  if (!lista) return;

  lista.replaceChildren();

  const agora = new Date();
  const hojeIso = agora.toISOString().slice(0, 10);
  const agendamentosHoje = Object.values(dados.agendamentos || {}).filter(item => item?.data === hojeIso);
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const pendentesEmp = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const pesagensAbertas = Object.values(dados.pesagens || {}).filter(item => String(item?.statusPesagem || "AB") !== "FE").length;
  const avisosCadastrados = Object.values(dados.avisosCadastro || {})
    .filter(item => item && item.ativo !== false)
    .sort((a, b) => Number(b.atualizadoEmTs || b.criadoEmTs || 0) - Number(a.atualizadoEmTs || a.criadoEmTs || 0));

  const avisos = [];

  avisosCadastrados.forEach(item => {
    avisos.push({
      icon: "message-square",
      kicker: "Manual",
      title: item.nome || "Aviso",
      text: item.mensagem || ""
    });
  });

  if (pendentesEmp) {
    avisos.push({
      icon: "forklift",
      kicker: "Prioridade",
      title: `${pendentesEmp} empilhadeira(s) pendente(s)`,
      text: "Conferir os abastecimentos previstos para hoje."
    });
  }

  if (veiculosRua || chavesUso || jogosUso || guardasUso) {
    avisos.push({
      icon: "clipboard-list",
      kicker: "Em aberto",
      title: `${veiculosRua + chavesUso + jogosUso + guardasUso} movimentação(ões) em andamento`,
      text: `${veiculosRua} veículo(s), ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s).`
    });
  }

  if (pesagensAbertas) {
    avisos.push({
      icon: "truck",
      kicker: "Balança",
      title: `${pesagensAbertas} pesagem(ns) aberta(s)`,
      text: "Existem tickets aguardando fechamento ou segunda pesagem."
    });
  }

  if (agendamentosHoje.length >= 3) {
    avisos.push({
      icon: "calendar-days",
      kicker: "Agenda",
      title: `${agendamentosHoje.length} agendamento(s) hoje`,
      text: "Dia com agenda mais carregada e que merece acompanhamento."
    });
  }

  if (!avisos.length) {
    const vazio = document.createElement("div");
    vazio.className = "home-alert-empty";
    vazio.textContent = "Nenhum aviso importante no momento.";
    lista.appendChild(vazio);
    return;
  }

  avisos.slice(0, 3).forEach(item => {
    const card = document.createElement("div");
    card.className = "home-alert-item";

    const iconWrap = document.createElement("div");
    iconWrap.className = "home-alert-icon";
    iconWrap.appendChild(criarIconeLucide(item.icon));

    const content = document.createElement("div");
    content.className = "home-alert-content";

    const kicker = document.createElement("span");
    kicker.textContent = item.kicker;
    const title = document.createElement("strong");
    title.textContent = item.title;
    const text = document.createElement("p");
    text.textContent = item.text;

    content.append(kicker, title, text);
    card.append(iconWrap, content);
    lista.appendChild(card);
  });

  refreshLucideIcons();
}

function atualizarPainelPendencias() {
  return Promise.all([
    db.ref("status_veiculos").once("value"),
    db.ref("chaves_em_uso").once("value"),
    db.ref("jogos_em_uso").once("value"),
    db.ref("guardachuvas_em_uso").once("value"),
    db.ref("agendamentos_veiculos").once("value"),
    db.ref("abastecimentos").once("value"),
    db.ref("pesagens_manuais").once("value")
  ]).then(([veiculosSnap, chavesSnap, jogosSnap, guardasSnap, agendamentosSnap, abastecimentosSnap, pesagensSnap]) => {
    const dados = {
      veiculos: veiculosSnap.val() || {},
      chaves: chavesSnap.val() || {},
      jogos: jogosSnap.val() || {},
      guardas: guardasSnap.val() || {},
      agendamentos: agendamentosSnap.val() || {},
      abastecimentos: abastecimentosSnap.val() || {},
      pesagens: pesagensSnap.val() || {}
    };

    const hojeIsoLocal = obterDataIsoLocal();
    const pesagensAbertas = Object.values(dados.pesagens).filter(item => String(item?.statusPesagem || "AB") !== "FE").length;

    atualizarIndicador("statVeiculosRua", Object.values(dados.veiculos).filter(item => item?.emUso).length);
    atualizarIndicador("statChavesUso", Object.keys(dados.chaves).length);
    atualizarIndicador("statJogosUso", Object.keys(dados.jogos).length);
    atualizarIndicador("statGuardasUso", Object.keys(dados.guardas).length);
    atualizarIndicador("statAgendamentos", Object.values(dados.agendamentos).filter(item => item?.data === hojeIsoLocal).length);
    atualizarIndicador("statEmpilhadeirasPendentes", calcularPendenciasEmpilhadeiras(dados.abastecimentos));
    atualizarIndicador("statPesagensAbertas", pesagensAbertas);
    renderResumoHome(dados);
    renderCentralAvisosHome(dados);
    renderAgendaHome(dados);
  }).catch(() => undefined);
}

function obterDataIsoLocal() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function renderResumoHome(dados) {
  const pesagensAbertas = Object.values(dados.pesagens || {}).filter(item => String(item?.statusPesagem || "AB") !== "FE").length;
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const movimentosAbertos = veiculosRua + chavesUso + jogosUso + guardasUso;

  atualizarIndicador("statPesagensAbertas", pesagensAbertas);
  atualizarIndicador("statMovimentosAbertos", movimentosAbertos);
}

function atualizarPainelPendencias() {
  return Promise.all([
    db.ref("status_veiculos").once("value"),
    db.ref("chaves_em_uso").once("value"),
    db.ref("jogos_em_uso").once("value"),
    db.ref("guardachuvas_em_uso").once("value"),
    db.ref("agendamentos_veiculos").once("value"),
    db.ref("abastecimentos").once("value"),
    db.ref("pesagens_manuais").once("value")
  ]).then(([veiculosSnap, chavesSnap, jogosSnap, guardasSnap, agendamentosSnap, abastecimentosSnap, pesagensSnap]) => {
    const dados = {
      veiculos: veiculosSnap.val() || {},
      chaves: chavesSnap.val() || {},
      jogos: jogosSnap.val() || {},
      guardas: guardasSnap.val() || {},
      agendamentos: agendamentosSnap.val() || {},
      abastecimentos: abastecimentosSnap.val() || {},
      pesagens: pesagensSnap.val() || {}
    };

    atualizarIndicador("statVeiculosRua", Object.values(dados.veiculos).filter(item => item?.emUso).length);
    atualizarIndicador("statChavesUso", Object.keys(dados.chaves).length);
    atualizarIndicador("statJogosUso", Object.keys(dados.jogos).length);
    atualizarIndicador("statGuardasUso", Object.keys(dados.guardas).length);
    atualizarIndicador("statAgendamentos", Object.values(dados.agendamentos).filter(item => item?.data === hojeIsoLocal).length);
    atualizarIndicador("statEmpilhadeirasPendentes", calcularPendenciasEmpilhadeiras(dados.abastecimentos));

    dashboardState.slides = construirSlidesOperacionais(dados);
    dashboardState.activeIndex = 0;
    renderSlideOperacional();
    renderResumoHome(dados);
    renderAgendaHome(dados);
    iniciarRotacaoPainel();
  }).catch(() => undefined);
}

function obterResumoTurnoHome() {
  const hora = new Date().getHours();
  if (hora >= 6 && hora < 18) {
    return { nome: "1º turno", janela: "06:00 às 18:00" };
  }
  return { nome: "2º turno", janela: "18:00 às 06:00" };
}

function renderResumoHome(dados) {
  const shiftName = getById("homeShiftName");
  const shiftWindow = getById("homeShiftWindow");
  const openTotal = getById("homeOpenTotal");
  const openDetail = getById("homeOpenDetail");
  const weightsOpen = getById("homeWeightsOpen");
  const weightsDetail = getById("homeWeightsDetail");
  const nextHighlight = getById("homeNextAgendaHighlight");
  const nextDetail = getById("homeNextAgendaDetail");
  if (!shiftName || !shiftWindow || !openTotal || !openDetail || !weightsOpen || !weightsDetail || !nextHighlight || !nextDetail) return;

  const turno = obterResumoTurnoHome();
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const movimentosAbertos = veiculosRua + chavesUso + jogosUso + guardasUso;
  const pesagensAbertas = Object.values(dados.pesagens || {}).filter(item => String(item?.statusPesagem || "AB") !== "FE").length;
  const agora = new Date();
  const proximoAgendamento = Object.values(dados.agendamentos || {})
    .filter(item => item?.data && new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))[0];

  shiftName.textContent = turno.nome;
  shiftWindow.textContent = turno.janela;
  openTotal.textContent = String(movimentosAbertos);
  openDetail.textContent = movimentosAbertos
    ? `${veiculosRua} veículo(s), ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) em aberto.`
    : "Sem veículos, chaves ou empréstimos em aberto agora.";
  weightsOpen.textContent = String(pesagensAbertas);
  weightsDetail.textContent = pesagensAbertas
    ? `${pesagensAbertas} ticket(s) aguardando a segunda pesagem ou fechamento.`
    : "Nenhuma pesagem pendente neste momento.";
  nextHighlight.textContent = proximoAgendamento
    ? `${proximoAgendamento.veiculo || "Veículo"} às ${proximoAgendamento.hora || "--:--"}`
    : "Agenda livre";
  nextDetail.textContent = proximoAgendamento
    ? `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`
    : "Nenhum agendamento futuro cadastrado.";
}

function atualizarPainelPendencias() {
  return Promise.all([
    db.ref("status_veiculos").once("value"),
    db.ref("chaves_em_uso").once("value"),
    db.ref("jogos_em_uso").once("value"),
    db.ref("guardachuvas_em_uso").once("value"),
    db.ref("agendamentos_veiculos").once("value"),
    db.ref("abastecimentos").once("value"),
    db.ref("pesagens_manuais").once("value")
  ]).then(([veiculosSnap, chavesSnap, jogosSnap, guardasSnap, agendamentosSnap, abastecimentosSnap, pesagensSnap]) => {
    const dados = {
      veiculos: veiculosSnap.val() || {},
      chaves: chavesSnap.val() || {},
      jogos: jogosSnap.val() || {},
      guardas: guardasSnap.val() || {},
      agendamentos: agendamentosSnap.val() || {},
      abastecimentos: abastecimentosSnap.val() || {},
      pesagens: pesagensSnap.val() || {}
    };

    const veiculosRua = Object.values(dados.veiculos).filter(item => item?.emUso).length;
    const chavesUso = Object.keys(dados.chaves).length;
    const jogosUso = Object.keys(dados.jogos).length;
    const guardasUso = Object.keys(dados.guardas).length;
    const agendamentosHoje = Object.values(dados.agendamentos).filter(item => item?.data === new Date().toISOString().slice(0, 10)).length;
    const empilhadeirasPendentes = calcularPendenciasEmpilhadeiras(dados.abastecimentos);
    const pesagensAbertas = Object.values(dados.pesagens).filter(item => String(item?.statusPesagem || "AB") !== "FE").length;
    const movimentosAbertos = veiculosRua + chavesUso + jogosUso + guardasUso;

    atualizarIndicador("statVeiculosRua", veiculosRua);
    atualizarIndicador("statChavesUso", chavesUso);
    atualizarIndicador("statJogosUso", jogosUso);
    atualizarIndicador("statGuardasUso", guardasUso);
    atualizarIndicador("statAgendamentos", agendamentosHoje);
    atualizarIndicador("statEmpilhadeirasPendentes", empilhadeirasPendentes);
    atualizarIndicador("statPesagensAbertas", pesagensAbertas);
    atualizarIndicador("statMovimentosAbertos", movimentosAbertos);

    dashboardState.slides = construirSlidesOperacionais(dados);
    dashboardState.activeIndex = 0;
    renderSlideOperacional();
    renderResumoHome(dados);
    renderListaAtencao(dados);
    renderAgendaHome(dados);
    iniciarRotacaoPainel();
  }).catch(() => undefined);
}

function obterResumoTurnoHome() {
  const hora = new Date().getHours();
  if (hora >= 6 && hora < 18) {
    return {
      nome: "1º turno",
      janela: "06:00 às 18:00"
    };
  }

  return {
    nome: "2º turno",
    janela: "18:00 às 06:00"
  };
}

function renderResumoHome(dados) {
  const shiftName = getById("homeShiftName");
  const shiftWindow = getById("homeShiftWindow");
  const openTotal = getById("homeOpenTotal");
  const openDetail = getById("homeOpenDetail");
  const weightsOpen = getById("homeWeightsOpen");
  const weightsDetail = getById("homeWeightsDetail");
  const nextHighlight = getById("homeNextAgendaHighlight");
  const nextDetail = getById("homeNextAgendaDetail");

  if (!shiftName || !shiftWindow || !openTotal || !openDetail || !weightsOpen || !weightsDetail || !nextHighlight || !nextDetail) {
    return;
  }

  const turno = obterResumoTurnoHome();
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const movimentosAbertos = veiculosRua + chavesUso + jogosUso + guardasUso;
  const pesagensAbertas = Object.values(dados.pesagens || {}).filter(item => String(item?.statusPesagem || "AB") !== "FE").length;
  const agora = new Date();
  const proximoAgendamento = Object.values(dados.agendamentos || {})
    .filter(item => item?.data && new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))[0];

  shiftName.textContent = turno.nome;
  shiftWindow.textContent = turno.janela;
  openTotal.textContent = String(movimentosAbertos);
  openDetail.textContent = movimentosAbertos
    ? `${veiculosRua} veículo(s), ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) em aberto.`
    : "Sem veículos, chaves ou empréstimos em aberto agora.";
  weightsOpen.textContent = String(pesagensAbertas);
  weightsDetail.textContent = pesagensAbertas
    ? `${pesagensAbertas} ticket(s) aguardando a segunda pesagem ou fechamento.`
    : "Nenhuma pesagem pendente neste momento.";
  nextHighlight.textContent = proximoAgendamento
    ? `${proximoAgendamento.veiculo || "Veículo"} às ${proximoAgendamento.hora || "--:--"}`
    : "Agenda livre";
  nextDetail.textContent = proximoAgendamento
    ? `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`
    : "Nenhum agendamento futuro cadastrado.";
}

function construirSlidesOperacionais(dados) {
  const agendamentos = Object.values(dados.agendamentos || {});
  const hojeIso = new Date().toISOString().slice(0, 10);
  const agendadosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const diaSemana = new Date().getDay();
  const diasComAbastecimento = [1, 3, 5];
  const mostrarSlideEmpilhadeiras = diasComAbastecimento.includes(diaSemana);
  const empilhadeirasPendentes = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;

  const slides = [
    {
      title: "Agenda e circulacao do dia",
      text: agendadosHoje.length
        ? `${agendadosHoje.length} veiculo(s) programado(s) para hoje. Proximo destino: ${agendadosHoje[0].local || "a definir"}.`
        : "Nenhum veiculo agendado para hoje. A agenda da frota esta livre neste momento."
    },
    {
      title: "Visao geral do turno",
      text: `${veiculosRua} veiculo(s) na rua, ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) em uso agora.`
    }
  ];

  if (mostrarSlideEmpilhadeiras) {
    slides.splice(1, 0, {
      title: "Empilhadeiras",
      text: empilhadeirasPendentes
        ? `${empilhadeirasPendentes} empilhadeira(s) estao sem abastecimento de hoje e pedem atencao operacional.`
        : "As empilhadeiras monitoradas ja tem abastecimento registrado hoje."
    });
  }

  return slides;
}

function renderSlideOperacional() {
  const title = getById("operationalTitle");
  const text = getById("operationalText");
  const dotsContainer = document.querySelector(".operational-dots");
  if (!title || !text || dashboardState.slides.length === 0) return;

  const atual = dashboardState.slides[dashboardState.activeIndex] || dashboardState.slides[0];
  title.textContent = atual.title;
  text.textContent = atual.text;

  if (dotsContainer) {
    dotsContainer.replaceChildren();
    dashboardState.slides.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.className = "operational-dot";
      dot.classList.toggle("active", index === dashboardState.activeIndex);
      dotsContainer.appendChild(dot);
    });
  }
}

function renderAgendaHome(dados) {
  const lista = getById("homeScheduleList");
  if (!lista) return;

  lista.replaceChildren();

  const agora = new Date();
  const agendamentos = Object.values(dados.agendamentos || {})
    .filter(item => item?.data)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))
    .filter(item => new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .slice(0, 4);

  if (!agendamentos.length) {
    const vazio = document.createElement("div");
    vazio.className = "home-schedule-empty";
    vazio.textContent = "Nenhum agendamento futuro cadastrado no momento.";
    lista.appendChild(vazio);
    return;
  }

  agendamentos.forEach(item => {
    const card = document.createElement("div");
    card.className = "home-schedule-item";

    const tempo = document.createElement("div");
    tempo.className = "home-schedule-time";
    const hora = document.createElement("strong");
    hora.textContent = item.hora || "--:--";
    const data = document.createElement("span");
    data.textContent = formatarDataISOParaBR(item.data) || "-";
    tempo.append(hora, data);

    const conteudo = document.createElement("div");
    conteudo.className = "home-schedule-content";
    const titulo = document.createElement("strong");
    titulo.textContent = item.veiculo || "Veiculo";
    const meta = document.createElement("div");
    meta.className = "home-schedule-meta";
    meta.textContent = item.local || "Destino a definir";
    const detalhe = document.createElement("div");
    detalhe.className = "home-schedule-detail";
    detalhe.textContent = item.quem || "Condutor a definir";
    conteudo.append(titulo, meta, detalhe);

    card.append(tempo, conteudo);
    lista.appendChild(card);
  });
}

function renderListaAtencao(dados) {
  const now = getById("attentionNow");
  const next = getById("attentionNext");
  const alert = getById("attentionAlert");
  if (!now || !next || !alert) return;

  limparConteudoElemento(now);
  limparConteudoElemento(next);
  limparConteudoElemento(alert);

  const agora = new Date();
  const horaAtual = agora.getHours();
  const hojeIso = agora.toISOString().slice(0, 10);
  const agendamentos = Object.values(dados.agendamentos || {});
  const agendamentosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const proximoAgendamento = agendamentos
    .filter(item => item?.data && new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))[0];

  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const pendentesEmp = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const movimentosAbertos = veiculosRua + chavesUso + jogosUso + guardasUso;

  function preencherLinha(container, iconName, kicker, title, text, primary = false) {
    container.className = primary ? "attention-row attention-row-primary" : "attention-row";

    const iconWrap = document.createElement("div");
    iconWrap.className = "attention-row-icon";
    iconWrap.appendChild(criarIconeLucide(iconName));

    const content = document.createElement("div");
    content.className = "attention-row-content";

    const kickerEl = document.createElement("span");
    kickerEl.className = "attention-kicker";
    kickerEl.textContent = kicker;

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;

    const textEl = document.createElement("p");
    textEl.textContent = text;

    content.append(kickerEl, titleEl, textEl);
    container.append(iconWrap, content);
  }

  if (pendentesEmp) {
    preencherLinha(now, "shield-alert", "Agora", `${pendentesEmp} pendencia(s) de empilhadeira`, "Conferir os abastecimentos previstos para hoje antes da virada do turno.", true);
  } else if (movimentosAbertos) {
    preencherLinha(now, "shield-alert", "Agora", `${movimentosAbertos} movimentacao(oes) aberta(s)`, `${veiculosRua} veiculo(s), ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) ainda em andamento.`, true);
  } else {
    preencherLinha(now, "shield-check", "Agora", "Turno sob controle", "Sem pendencias criticas e com a operacao estavel neste momento.", true);
  }

  if (proximoAgendamento) {
    preencherLinha(next, "arrow-right-circle", "Proximo", `${proximoAgendamento.veiculo || "Veiculo"} as ${proximoAgendamento.hora || "--:--"}`, `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`);
  } else if (horaAtual < 6 || horaAtual >= 18) {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Acompanhar passagem de plantao", "Conferir os registros do posto e a rotina de troca de turno.");
  } else {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Monitorar rotina operacional", "Seguir com acessos, agenda, emprestimos e movimentacoes da portaria.");
  }

  if (agendamentosHoje.length >= 4) {
    preencherLinha(alert, "siren", "Atencao", `${agendamentosHoje.length} agendamentos concentrados hoje`, "Vale acompanhar a agenda para evitar conflito de horarios e veiculos.");
  } else if (veiculosRua >= 3) {
    preencherLinha(alert, "siren", "Atencao", `${veiculosRua} veiculo(s) seguem em operacao`, "Acompanhe os retornos para evitar virada de turno com pendencia.");
  } else if (movimentosAbertos >= 4) {
    preencherLinha(alert, "siren", "Atencao", `${movimentosAbertos} itens seguem abertos`, "O volume do turno esta alto e merece conferencia mais proxima.");
  } else {
    preencherLinha(alert, "siren", "Atencao", "Sem alerta operacional", "Nada fora do normal exigindo acao imediata.");
  }

  refreshLucideIcons();
}

function atualizarPainelPendencias() {
  return Promise.all([
    db.ref("status_veiculos").once("value"),
    db.ref("chaves_em_uso").once("value"),
    db.ref("jogos_em_uso").once("value"),
    db.ref("guardachuvas_em_uso").once("value"),
    db.ref("agendamentos_veiculos").once("value"),
    db.ref("abastecimentos").once("value"),
    db.ref("pesagens_manuais").once("value"),
    db.ref("cadastros/avisos").once("value")
  ]).then(([veiculosSnap, chavesSnap, jogosSnap, guardasSnap, agendamentosSnap, abastecimentosSnap, pesagensSnap, avisosSnap]) => {
    const dados = {
      veiculos: veiculosSnap.val() || {},
      chaves: chavesSnap.val() || {},
      jogos: jogosSnap.val() || {},
      guardas: guardasSnap.val() || {},
      agendamentos: agendamentosSnap.val() || {},
      abastecimentos: abastecimentosSnap.val() || {},
      pesagens: pesagensSnap.val() || {},
      avisosCadastro: avisosSnap.val() || {}
    };

    atualizarIndicador("statVeiculosRua", Object.values(dados.veiculos).filter(item => item?.emUso).length);
    atualizarIndicador("statChavesUso", Object.keys(dados.chaves).length);
    atualizarIndicador("statJogosUso", Object.keys(dados.jogos).length);
    atualizarIndicador("statGuardasUso", Object.keys(dados.guardas).length);
    atualizarIndicador("statAgendamentos", Object.values(dados.agendamentos).filter(item => item?.data === new Date().toISOString().slice(0, 10)).length);
    atualizarIndicador("statEmpilhadeirasPendentes", calcularPendenciasEmpilhadeiras(dados.abastecimentos));
    renderResumoHome(dados);

    dashboardState.slides = construirSlidesOperacionais(dados);
    dashboardState.activeIndex = 0;
    renderSlideOperacional();
    renderListaAtencao(dados);
    renderCentralAvisosHomeManual(dados);
    renderAgendaHome(dados);
    iniciarRotacaoPainel();
  }).catch(() => undefined);
}

function renderCentralAvisosHomeManual(dados) {
  const lista = getById("homeAlertsList");
  if (!lista) return;

  lista.replaceChildren();

  const avisosCadastrados = Object.values(dados.avisosCadastro || {})
    .filter(item => item && item.ativo !== false)
    .sort((a, b) => Number(b.atualizadoEmTs || b.criadoEmTs || 0) - Number(a.atualizadoEmTs || a.criadoEmTs || 0));

  if (!avisosCadastrados.length) {
    const vazio = document.createElement("div");
    vazio.className = "home-alert-empty";
    vazio.textContent = "Nenhum aviso cadastrado no momento.";
    lista.appendChild(vazio);
    return;
  }

  avisosCadastrados.slice(0, 3).forEach(item => {
    const card = document.createElement("div");
    card.className = "home-alert-item";

    const iconWrap = document.createElement("div");
    iconWrap.className = "home-alert-icon";
    iconWrap.appendChild(criarIconeLucide(item.icone || "message-square"));

    const content = document.createElement("div");
    content.className = "home-alert-content";

    const title = document.createElement("strong");
    title.textContent = item.nome || "Aviso";

    const text = document.createElement("p");
    text.textContent = item.mensagem || "";

    content.append(title, text);
    card.append(iconWrap, content);
    lista.appendChild(card);
  });

  refreshLucideIcons();
}

function renderSlideOperacional() {
  const title = getById("operationalTitle");
  const text = getById("operationalText");
  if (!title || !text || dashboardState.slides.length === 0) return;

  const atual = dashboardState.slides[dashboardState.activeIndex] || dashboardState.slides[0];
  title.textContent = atual.title;
  text.textContent = atual.text;

  document.querySelectorAll(".operational-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === dashboardState.activeIndex);
  });
}

function renderListaAtencao(dados) {
  const container = getById("attentionList");
  const primary = getById("attentionPrimary");
  const next = getById("attentionNext");
  if (!container || !primary || !next) return;

  limparConteudoElemento(container);
  limparConteudoElemento(primary);
  limparConteudoElemento(next);

  const hojeIso = new Date().toISOString().slice(0, 10);
  const agendamentosHoje = Object.values(dados.agendamentos || {}).filter(item => item?.data === hojeIso);
  const proximosAgendamentos = Object.values(dados.agendamentos || {})
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`));
  const proximoAgendamento = proximosAgendamentos[0];
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const pendentesEmp = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const itens = [];

  const primaryKicker = document.createElement("span");
  primaryKicker.className = "attention-kicker";
  primaryKicker.textContent = "Situacao do turno";
  const primaryTitle = document.createElement("strong");
  const primaryText = document.createElement("p");

  if (pendentesEmp) {
    primaryTitle.textContent = `${pendentesEmp} ponto(s) de atencao`;
    primaryText.textContent = `As empilhadeiras ainda precisam de ${pendentesEmp} registro(s) de abastecimento hoje.`;
  } else if (agendamentosHoje.length) {
    primaryTitle.textContent = `${agendamentosHoje.length} agendamento(s) hoje`;
    primaryText.textContent = "A agenda do turno esta preenchida e sem pendencia critica no momento.";
  } else {
    primaryTitle.textContent = "Turno sob controle";
    primaryText.textContent = "Sem pendencias criticas e com a operacao estavel neste momento.";
  }

  primary.append(primaryKicker, primaryTitle, primaryText);

  const nextKicker = document.createElement("span");
  nextKicker.className = "attention-kicker";
  nextKicker.textContent = "Proximo agendamento";
  const nextTitle = document.createElement("strong");
  const nextText = document.createElement("p");

  if (proximoAgendamento) {
    nextTitle.textContent = `${proximoAgendamento.veiculo || "Veiculo"} as ${proximoAgendamento.hora || "--:--"}`;
    nextText.textContent = `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`;
  } else {
    nextTitle.textContent = "Agenda livre";
    nextText.textContent = "Nenhum agendamento futuro cadastrado no momento.";
  }

  next.append(nextKicker, nextTitle, nextText);

  if (pendentesEmp) itens.push({ icon: "forklift", text: `${pendentesEmp} empilhadeira(s) pedem abastecimento hoje.` });
  if (agendamentosHoje.length >= 3) itens.push({ icon: "calendar-days", text: `${agendamentosHoje.length} agendamento(s) concentrados no dia de hoje.` });
  if (veiculosRua >= 3) itens.push({ icon: "car-front", text: `${veiculosRua} veiculo(s) seguem na rua neste momento.` });

  const emprestimosAbertos = chavesUso + jogosUso + guardasUso;
  if (emprestimosAbertos >= 4) itens.push({ icon: "clipboard-list", text: `${emprestimosAbertos} item(ns) seguem emprestados no turno.` });

  if (!itens.length) {
    const vazio = document.createElement("p");
    vazio.className = "attention-empty";
    vazio.textContent = "Nenhuma pendencia critica no momento.";
    container.appendChild(vazio);
    return;
  }

  itens.slice(0, 3).forEach(item => {
    const linha = document.createElement("div");
    linha.className = "attention-item";
    linha.appendChild(criarIconeLucide(item.icon));
    const texto = document.createElement("span");
    texto.textContent = item.text;
    linha.appendChild(texto);
    container.appendChild(linha);
  });

  refreshLucideIcons();
}

function iniciarRotacaoPainel() {
  if (dashboardState.timerId) clearInterval(dashboardState.timerId);
  if (dashboardState.slides.length <= 1) return;

  dashboardState.timerId = setInterval(() => {
    dashboardState.activeIndex = (dashboardState.activeIndex + 1) % dashboardState.slides.length;
    renderSlideOperacional();
  }, 4200);
}

function renderListaAtencao(dados) {
  const now = getById("attentionNow");
  const next = getById("attentionNext");
  const alert = getById("attentionAlert");
  if (!now || !next || !alert) return;

  limparConteudoElemento(now);
  limparConteudoElemento(next);
  limparConteudoElemento(alert);

  const agora = new Date();
  const hora = agora.getHours();
  const hojeIso = agora.toISOString().slice(0, 10);
  const agendamentos = Object.values(dados.agendamentos || {});
  const agendamentosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const proximoAgendamento = agendamentos
    .filter(item => item?.data && new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))[0];

  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const pendentesEmp = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});

  const pendencias = [];
  const alertas = [];

  if (pendentesEmp) pendencias.push(`${pendentesEmp} empilhadeira(s) sem abastecimento hoje`);
  if (veiculosRua) pendencias.push(`${veiculosRua} veículo(s) na rua aguardando retorno`);
  if (chavesUso) pendencias.push(`${chavesUso} chave(s) ainda abertas`);
  if (guardasUso >= 3) pendencias.push(`${guardasUso} guarda-chuva(s) emprestados no momento`);

  if (veiculosRua >= 3) alertas.push({ icon: "car-front", text: `${veiculosRua} veículo(s) seguem em operação externa.` });
  if (chavesUso + jogosUso + guardasUso >= 4) alertas.push({ icon: "clipboard-list", text: `${chavesUso + jogosUso + guardasUso} item(ns) continuam sob controle da portaria.` });
  if (agendamentosHoje.length >= 3) alertas.push({ icon: "calendar-days", text: `${agendamentosHoje.length} agendamento(s) estão concentrados no dia de hoje.` });
  if (pendentesEmp) alertas.push({ icon: "forklift", text: `${pendentesEmp} abastecimento(s) de empilhadeira pedem atenção.` });

  function preencherLinha(container, iconName, kicker, title, text, primary = false) {
    container.className = primary ? "attention-row attention-row-primary" : "attention-row";

    const iconWrap = document.createElement("div");
    iconWrap.className = "attention-row-icon";
    iconWrap.appendChild(criarIconeLucide(iconName));

    const content = document.createElement("div");
    content.className = "attention-row-content";

    const kickerEl = document.createElement("span");
    kickerEl.className = "attention-kicker";
    kickerEl.textContent = kicker;

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;

    const textEl = document.createElement("p");
    textEl.textContent = text;

    content.append(kickerEl, titleEl, textEl);
    container.append(iconWrap, content);
  }

  if (pendencias.length) {
    preencherLinha(
      now,
      "shield-alert",
      "Agora",
      `${pendencias.length} ponto(s) para acompanhar`,
      pendencias.slice(0, 2).join(" • "),
      true
    );
  } else {
    preencherLinha(
      now,
      "shield-check",
      "Agora",
      "Sem pendências críticas",
      "Fluxo de portaria dentro do esperado neste momento.",
      true
    );
  }

  if (hora >= 23) {
    preencherLinha(next, "arrow-right-circle", "Próximo", "Encerrar apoio do caminhoneiro", "Às 00:00, desligar o ar-condicionado e trancar a sala do apoio.");
  } else if (hora < 6) {
    preencherLinha(next, "arrow-right-circle", "Próximo", "Preparar passagem de turno", "Conferir ATA, protocolo e pendências para o próximo porteiro.");
  } else if (hora < 8) {
    preencherLinha(next, "arrow-right-circle", "Próximo", "Conferir início do expediente", "Validar acessos, ocorrências e a movimentação programada da manhã.");
  } else if (proximoAgendamento) {
    preencherLinha(next, "arrow-right-circle", "Próximo", `${proximoAgendamento.veiculo || "Veículo"} às ${proximoAgendamento.hora || "--:--"}`, `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`);
  } else {
    preencherLinha(next, "arrow-right-circle", "Próximo", "Monitorar rotina operacional", "Manter conferência de acessos, registros e movimentações do turno.");
  }

  if (!alertas.length) {
    preencherLinha(alert, "siren", "Atenção", "Nenhum alerta operacional", "Nada fora do normal exigindo ação imediata.");
    return;
  }

  preencherLinha(alert, "siren", "Atenção", alertas[0].text, alertas[1]?.text || "Acompanhe o painel para novos desvios operacionais.");

  refreshLucideIcons();
}

function renderListaAtencao(dados) {
  const now = getById("attentionNow");
  const next = getById("attentionNext");
  const alert = getById("attentionAlert");
  if (!now || !next || !alert) return;

  limparConteudoElemento(now);
  limparConteudoElemento(next);
  limparConteudoElemento(alert);

  function preencherLinha(container, iconName, kicker, title, text, primary = false) {
    container.className = primary ? "attention-row attention-row-primary" : "attention-row";

    const iconWrap = document.createElement("div");
    iconWrap.className = "attention-row-icon";
    iconWrap.appendChild(criarIconeLucide(iconName));

    const content = document.createElement("div");
    content.className = "attention-row-content";

    const kickerEl = document.createElement("span");
    kickerEl.className = "attention-kicker";
    kickerEl.textContent = kicker;

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;

    const textEl = document.createElement("p");
    textEl.textContent = text;

    content.append(kickerEl, titleEl, textEl);
    container.append(iconWrap, content);
  }

  preencherLinha(now, "shield-alert", "Agora", "1 chave aberta desde o turno anterior", "Conferir a devolucao e registrar a situacao antes da passagem.", true);
  preencherLinha(next, "arrow-right-circle", "Proximo", "Registrar passagem de turno as 06:00", "Conferir ATA, protocolo e pendencias para o proximo porteiro.");
  preencherLinha(alert, "siren", "Atencao", "Empilhadeira 03 sem abastecimento hoje", "Verificar o registro e alinhar a pendencia ainda neste turno.");

  refreshLucideIcons();
}


function renderListaAtencao(dados) {
  const now = getById("attentionNow");
  const next = getById("attentionNext");
  const alert = getById("attentionAlert");
  if (!now || !next || !alert) return;

  limparConteudoElemento(now);
  limparConteudoElemento(next);
  limparConteudoElemento(alert);

  const agora = new Date();
  const hora = agora.getHours();
  const hojeIso = agora.toISOString().slice(0, 10);
  const hojeBR = agora.toLocaleDateString("pt-BR");
  const agendamentos = Object.values(dados.agendamentos || {});
  const agendamentosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const proximoAgendamento = agendamentos
    .filter(item => item?.data && new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))[0];

  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;

  const ultimosPorNumero = new Map();
  Object.values(dados.abastecimentos || {}).forEach(item => {
    if (!item?.num) return;
    ultimosPorNumero.set(String(item.num), item.data || "");
  });

  const empilhadeirasPendentes = [];
  ultimosPorNumero.forEach((data, numero) => {
    if (data !== hojeBR) empilhadeirasPendentes.push(numero);
  });

  function preencherLinha(container, iconName, kicker, title, text, primary = false) {
    container.className = primary ? "attention-row attention-row-primary" : "attention-row";

    const iconWrap = document.createElement("div");
    iconWrap.className = "attention-row-icon";
    iconWrap.appendChild(criarIconeLucide(iconName));

    const content = document.createElement("div");
    content.className = "attention-row-content";

    const kickerEl = document.createElement("span");
    kickerEl.className = "attention-kicker";
    kickerEl.textContent = kicker;

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;

    const textEl = document.createElement("p");
    textEl.textContent = text;

    content.append(kickerEl, titleEl, textEl);
    container.append(iconWrap, content);
  }

  if (chavesUso === 1) {
    preencherLinha(now, "shield-alert", "Agora", "1 chave aberta no momento", "Verificar se a devolucao sera feita ainda neste turno.", true);
  } else if (chavesUso > 1) {
    preencherLinha(now, "shield-alert", "Agora", `${chavesUso} chaves abertas no momento`, "Conferir quem esta com cada retirada em aberto.", true);
  } else if (veiculosRua === 1) {
    preencherLinha(now, "shield-alert", "Agora", "1 veiculo na rua", "Acompanhar retorno e checklist de entrada.", true);
  } else if (veiculosRua > 1) {
    preencherLinha(now, "shield-alert", "Agora", `${veiculosRua} veiculos na rua`, "Acompanhar retorno dos veiculos que ainda estao em operacao.", true);
  } else if (empilhadeirasPendentes.length) {
    preencherLinha(now, "shield-alert", "Agora", `${empilhadeirasPendentes.length} empilhadeira(s) pendente(s)`, "Conferir abastecimento previsto para hoje.", true);
  } else {
    preencherLinha(now, "shield-check", "Agora", "Sem pendencias criticas", "Fluxo de portaria dentro do esperado neste momento.", true);
  }

  if (hora < 6) {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Registrar passagem de turno as 06:00", "Conferir ATA, protocolo e pendencias para o proximo porteiro.");
  } else if (hora >= 23) {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Encerrar apoio do caminhoneiro", "As 00:00, desligar o ar-condicionado e trancar a sala do apoio.");
  } else if (proximoAgendamento) {
    preencherLinha(next, "arrow-right-circle", "Proximo", `${proximoAgendamento.veiculo || "Veiculo"} as ${proximoAgendamento.hora || "--:--"}`, `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`);
  } else {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Monitorar rotina operacional", "Manter conferencia de acessos, registros e movimentacoes do turno.");
  }

  if (empilhadeirasPendentes.length === 1) {
    preencherLinha(alert, "siren", "Atencao", `Empilhadeira ${empilhadeirasPendentes[0]} sem abastecimento hoje`, "Conferir se o registro sera feito ainda neste turno.");
  } else if (empilhadeirasPendentes.length > 1) {
    preencherLinha(alert, "siren", "Atencao", `${empilhadeirasPendentes.length} empilhadeiras sem abastecimento hoje`, `Pendentes: ${empilhadeirasPendentes.slice(0, 3).join(", ")}`);
  } else if (veiculosRua && chavesUso) {
    preencherLinha(alert, "siren", "Atencao", "Veiculo e chave em aberto no mesmo turno", "Validar se os registros estao coerentes antes da passagem.");
  } else if (agendamentosHoje.length >= 3) {
    preencherLinha(alert, "siren", "Atencao", `${agendamentosHoje.length} agendamentos hoje`, "Conferir se a programacao ja foi repassada em ATA.");
  } else {
    preencherLinha(alert, "siren", "Atencao", "Nenhum alerta operacional", "Nada fora do normal exigindo acao imediata.");
  }

  refreshLucideIcons();
}

function refreshLucideIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function alternarBotaoCarregando(botao, carregando, textoPadrao = "Salvar") {
  if (!botao || botao.tagName !== "BUTTON") return;
  if (carregando) {
    if (!botao.dataset.originalText) botao.dataset.originalText = botao.innerHTML;
    botao.disabled = true;
    botao.style.opacity = "0.75";
    botao.style.cursor = "wait";
    botao.innerHTML = "Processando...";
    return;
  }
  botao.disabled = false;
  botao.style.opacity = "";
  botao.style.cursor = "";
  botao.innerHTML = botao.dataset.originalText || textoPadrao;
  delete botao.dataset.originalText;
}

function confirmarAcao({ titulo = "Confirmar ação", mensagem = "", detalhe = "", confirmarTexto = "Confirmar", cancelarTexto = "Cancelar" } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const iconWrap = document.createElement("div");
    iconWrap.className = "confirm-icon";
    iconWrap.appendChild(criarIconeLucide("trash-2"));

    const content = document.createElement("div");
    content.className = "confirm-content";

    const titleEl = document.createElement("strong");
    titleEl.textContent = titulo;

    const messageEl = document.createElement("p");
    messageEl.textContent = mensagem;

    content.append(titleEl, messageEl);

    if (detalhe) {
      const detailEl = document.createElement("span");
      detailEl.className = "confirm-detail";
      detailEl.textContent = detalhe;
      content.appendChild(detailEl);
    }

    const actions = document.createElement("div");
    actions.className = "confirm-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "confirm-btn confirm-btn-cancel";
    cancel.textContent = cancelarTexto;

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "confirm-btn confirm-btn-danger";
    confirm.textContent = confirmarTexto;

    const close = result => {
      overlay.remove();
      resolve(result);
    };

    cancel.addEventListener("click", () => close(false));
    confirm.addEventListener("click", () => close(true));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close(false);
    });
    document.addEventListener("keydown", function onKeydown(event) {
      if (!document.body.contains(overlay)) {
        document.removeEventListener("keydown", onKeydown);
        return;
      }
      if (event.key === "Escape") {
        document.removeEventListener("keydown", onKeydown);
        close(false);
      }
    });

    actions.append(cancel, confirm);
    modal.append(iconWrap, content, actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    refreshLucideIcons();
    confirm.focus();
  });
}

function atualizarPainelPendencias() {
  return Promise.all([
    db.ref("status_veiculos").once("value"),
    db.ref("chaves_em_uso").once("value"),
    db.ref("jogos_em_uso").once("value"),
    db.ref("guardachuvas_em_uso").once("value"),
    db.ref("agendamentos_veiculos").once("value"),
    db.ref("abastecimentos").once("value")
  ]).then(([veiculosSnap, chavesSnap, jogosSnap, guardasSnap, agendamentosSnap, abastecimentosSnap]) => {
    const dados = {
      veiculos: veiculosSnap.val() || {},
      chaves: chavesSnap.val() || {},
      jogos: jogosSnap.val() || {},
      guardas: guardasSnap.val() || {},
      agendamentos: agendamentosSnap.val() || {},
      abastecimentos: abastecimentosSnap.val() || {}
    };

    atualizarIndicador("statVeiculosRua", Object.values(dados.veiculos).filter(item => item && item.emUso).length);
    atualizarIndicador("statChavesUso", Object.keys(dados.chaves).length);
    atualizarIndicador("statJogosUso", Object.keys(dados.jogos).length);
    atualizarIndicador("statGuardasUso", Object.keys(dados.guardas).length);
    atualizarIndicador("statAgendamentos", Object.keys(dados.agendamentos).length);
    atualizarIndicador("statEmpilhadeirasPendentes", calcularPendenciasEmpilhadeiras(dados.abastecimentos));

    dashboardState.slides = construirSlidesOperacionais(dados);
    dashboardState.activeIndex = 0;
    renderSlideOperacional();
    renderListaAtencao(dados);
    iniciarRotacaoPainel();
  }).catch(() => undefined);
}

window.addEventListener("DOMContentLoaded", () => {
  const fields = document.querySelectorAll("input, textarea, select");
  inicializarTema();
  vincularAcoesDeclarativas();
  configurarCamposMaiusculos();
  configurarAutocomplete("v_condutor", "lista_condutores", condutoresAutorizados);
  configurarAutocomplete("v_porteiro_retorno", "lista_porteiros_retorno", porteirosAutorizados);
  configurarAutocomplete("postoPlantaoPorteiro", "lista_posto_porteiros", porteirosAutorizados);
  configurarAutocomplete("postoMovSetor", "lista_posto_setores", setoresPosto);
  configurarAutocompleteChaves();
  configurarAutocompletePorteiroChaves();

  fields.forEach(el => {
    el.setAttribute("autocomplete", "off");
    el.setAttribute("autocorrect", "off");
    el.setAttribute("autocapitalize", "off");
    el.setAttribute("spellcheck", "false");
    if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && !el.hasAttribute("readonly")) {
      if ([
        "v_condutor",
        "v_porteiro_retorno",
        "postoPlantaoPorteiro",
        "postoMovSetor",
        "ch_sala",
        "ch_porteiro",
        "cadastroPorteiroNome",
        "cadastroCondutorNome",
        "cadastroSetorNome",
        "cadastroPostoSetorNome",
        "cadastroJogoNome",
        "cadastroChaveNumero",
        "cadastroChaveSala",
        "cadastroEmpilhadeiraNumero",
        "cadastroEmpilhadeiraNome",
        "cadastroGuardaNumero",
        "cadastroGuardaNome",
        "cadastroVendaProdutoNome",
        "cadastroVendaCaracteristicaNome",
        "cadastroVendaPagamentoNome",
        "jo_jogo",
        "jo_porteiro",
        "cadastroVeiculoPlaca",
        "cadastroVeiculoNome",
        "cadastroVeiculoImagem",
        "cadastroPostoS10Estoque",
        "cadastroPostoS10Contador",
        "cadastroPostoS500Estoque",
        "cadastroPostoS500Contador",
        "cadastroPostoArlaEstoque",
        "cadastroPostoArlaContador",
        "vd_nome",
        "vd_obs",
        "pm_placa",
        "pm_reboque1",
        "pm_reboque2",
        "pm_produtor",
        "pm_motorista",
        "pm_produto",
        "pm_observacao",
        "pm_usuario_primeira",
        "pm_usuario_segunda"
      ].includes(el.id)) return;
      el.readOnly = true;
      el.addEventListener("focus", () => { el.readOnly = false; }, { once: true });
    }
  });

  document.querySelectorAll("form").forEach(f => f.setAttribute("autocomplete", "off"));
  getById("themeToggle")?.addEventListener("click", alternarTema);
  adicionarAtalhoHomeSecoes();
  abrir("inicio");
  atualizarPainelPendencias();
  aplicarContrasteCamposTema();
  refreshLucideIcons();
});

let toastTimerId = null;

function mostrarAviso(mensagem, tipo = "success", icone = "") {
  const toast = getById("toast");
  if (!toast) return;
  toast.replaceChildren();
  if (icone) {
    toast.appendChild(criarIconeLucide(icone, "toast-icon"));
  }
  const texto = document.createElement("span");
  texto.textContent = mensagem;
  toast.appendChild(texto);
  toast.className = `show toast-${tipo}`;
  refreshLucideIcons();
  if (toastTimerId) clearTimeout(toastTimerId);
  toastTimerId = setTimeout(() => {
    toast.className = toast.className.replace("show", "").trim();
    toast.classList.remove("toast-success", "toast-error", "toast-warning", "toast-info");
  }, 3000);
}

function renderListaAtencao(dados) {
  const now = getById("attentionNow");
  const next = getById("attentionNext");
  const alert = getById("attentionAlert");
  if (!now || !next || !alert) return;

  limparConteudoElemento(now);
  limparConteudoElemento(next);
  limparConteudoElemento(alert);

  function preencherLinha(container, iconName, kicker, title, text, primary = false) {
    container.className = primary ? "attention-row attention-row-primary" : "attention-row";

    const iconWrap = document.createElement("div");
    iconWrap.className = "attention-row-icon";
    iconWrap.appendChild(criarIconeLucide(iconName));

    const content = document.createElement("div");
    content.className = "attention-row-content";

    const kickerEl = document.createElement("span");
    kickerEl.className = "attention-kicker";
    kickerEl.textContent = kicker;

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;

    const textEl = document.createElement("p");
    textEl.textContent = text;

    content.append(kickerEl, titleEl, textEl);
    container.append(iconWrap, content);
  }

  preencherLinha(now, "shield-alert", "Agora", "1 chave aberta desde o turno anterior", "Conferir a devolucao e registrar a situacao antes da passagem.", true);
  preencherLinha(next, "arrow-right-circle", "Proximo", "Registrar passagem de turno as 06:00", "Conferir ATA, protocolo e pendencias para o proximo porteiro.");
  preencherLinha(alert, "siren", "Atencao", "Empilhadeira 03 sem abastecimento hoje", "Verificar o registro e alinhar a pendencia ainda neste turno.");

  refreshLucideIcons();
}

function renderListaAtencao(dados) {
  const now = getById("attentionNow");
  const next = getById("attentionNext");
  const alert = getById("attentionAlert");
  if (!now || !next || !alert) return;

  limparConteudoElemento(now);
  limparConteudoElemento(next);
  limparConteudoElemento(alert);

  const agora = new Date();
  const hora = agora.getHours();
  const hojeIso = agora.toISOString().slice(0, 10);
  const agendamentos = Object.values(dados.agendamentos || {});
  const agendamentosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const proximoAgendamento = agendamentos
    .filter(item => item?.data && new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))[0];

  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const pendentesEmp = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const pendencias = [];
  const alertas = [];

  if (veiculosRua) pendencias.push(`${veiculosRua} veiculo(s) na rua aguardando retorno`);
  if (chavesUso) pendencias.push(`${chavesUso} chave(s) ainda abertas`);
  if (pendentesEmp) pendencias.push(`${pendentesEmp} empilhadeira(s) sem abastecimento hoje`);

  if (pendentesEmp) {
    alertas.push("Conferir abastecimento das empilhadeiras previstas para hoje.");
  } else if (veiculosRua && chavesUso) {
    alertas.push("Ha veiculo e chave em aberto ao mesmo tempo no turno.");
  } else if (veiculosRua >= 2) {
    alertas.push(`${veiculosRua} veiculo(s) seguem em operacao externa.`);
  } else if (chavesUso >= 2) {
    alertas.push(`${chavesUso} chave(s) continuam abertas na portaria.`);
  }

  function preencherLinha(container, iconName, kicker, title, text, primary = false) {
    container.className = primary ? "attention-row attention-row-primary" : "attention-row";

    const iconWrap = document.createElement("div");
    iconWrap.className = "attention-row-icon";
    iconWrap.appendChild(criarIconeLucide(iconName));

    const content = document.createElement("div");
    content.className = "attention-row-content";

    const kickerEl = document.createElement("span");
    kickerEl.className = "attention-kicker";
    kickerEl.textContent = kicker;

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;

    const textEl = document.createElement("p");
    textEl.textContent = text;

    content.append(kickerEl, titleEl, textEl);
    container.append(iconWrap, content);
  }

  if (pendencias.length) {
    preencherLinha(
      now,
      "shield-alert",
      "Agora",
      `${pendencias.length} ponto(s) para acompanhar`,
      pendencias.slice(0, 2).join(" • "),
      true
    );
  } else {
    preencherLinha(
      now,
      "shield-check",
      "Agora",
      "Sem pendencias criticas",
      "Fluxo de portaria dentro do esperado neste momento.",
      true
    );
  }

  if (hora >= 23) {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Encerrar apoio do caminhoneiro", "As 00:00, desligar o ar-condicionado e trancar a sala do apoio.");
  } else if (hora < 6) {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Preparar passagem de turno", "Conferir ATA, protocolo e pendencias para o proximo porteiro.");
  } else if (hora < 8) {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Conferir inicio do expediente", "Validar acessos, ocorrencias e a movimentacao programada da manha.");
  } else if (proximoAgendamento) {
    preencherLinha(next, "arrow-right-circle", "Proximo", `${proximoAgendamento.veiculo || "Veiculo"} as ${proximoAgendamento.hora || "--:--"}`, `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`);
  } else {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Monitorar rotina operacional", "Manter conferencia de acessos, registros e movimentacoes do turno.");
  }

  if (!alertas.length) {
    preencherLinha(alert, "siren", "Atencao", "Nenhum alerta operacional", "Nada fora do normal exigindo acao imediata.");
  } else {
    preencherLinha(alert, "siren", "Atencao", alertas[0], "Acompanhe o painel para novos desvios operacionais.");
  }

  refreshLucideIcons();
}

function construirSlidesOperacionais(dados) {
  const agendamentos = Object.values(dados.agendamentos || {});
  const hojeIso = new Date().toISOString().slice(0, 10);
  const agendadosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const diaSemana = new Date().getDay();
  const diasComAbastecimento = [1, 3, 5];
  const mostrarSlideEmpilhadeiras = diasComAbastecimento.includes(diaSemana);
  const empilhadeirasPendentes = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;

  const slides = [
    {
      title: "Agenda e circulacao do dia",
      text: agendadosHoje.length
        ? `${agendadosHoje.length} veiculo(s) programado(s) para hoje. Proximo destino: ${agendadosHoje[0].local || "a definir"}.`
        : "Nenhum veiculo agendado para hoje. A agenda da frota esta livre neste momento."
    },
    {
      title: "Visao geral do turno",
      text: `${veiculosRua} veiculo(s) na rua, ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) em uso agora.`
    }
  ];

  if (mostrarSlideEmpilhadeiras) {
    slides.splice(1, 0, {
      title: "Empilhadeiras",
      text: empilhadeirasPendentes
        ? `${empilhadeirasPendentes} empilhadeira(s) estao sem abastecimento de hoje e pedem atencao operacional.`
        : "As empilhadeiras monitoradas ja tem abastecimento registrado hoje."
    });
  }

  return slides;
}

function renderSlideOperacional() {
  const title = getById("operationalTitle");
  const text = getById("operationalText");
  const dotsContainer = document.querySelector(".operational-dots");
  if (!title || !text || dashboardState.slides.length === 0) return;

  const atual = dashboardState.slides[dashboardState.activeIndex] || dashboardState.slides[0];
  title.textContent = atual.title;
  text.textContent = atual.text;

  if (dotsContainer) {
    dotsContainer.replaceChildren();
    dashboardState.slides.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.className = "operational-dot";
      dot.classList.toggle("active", index === dashboardState.activeIndex);
      dotsContainer.appendChild(dot);
    });
  }
}

function renderAgendaHome(dados) {
  const lista = getById("homeScheduleList");
  if (!lista) return;

  lista.replaceChildren();

  const agora = new Date();
  const agendamentos = Object.values(dados.agendamentos || {})
    .filter(item => item?.data)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))
    .filter(item => new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .slice(0, 4);

  if (!agendamentos.length) {
    const vazio = document.createElement("div");
    vazio.className = "home-schedule-empty";
    vazio.textContent = "Nenhum agendamento futuro cadastrado no momento.";
    lista.appendChild(vazio);
    return;
  }

  agendamentos.forEach(item => {
    const card = document.createElement("div");
    card.className = "home-schedule-item";

    const tempo = document.createElement("div");
    tempo.className = "home-schedule-time";
    const hora = document.createElement("strong");
    hora.textContent = item.hora || "--:--";
    const data = document.createElement("span");
    data.textContent = formatarDataISOParaBR(item.data) || "-";
    tempo.append(hora, data);

    const conteudo = document.createElement("div");
    conteudo.className = "home-schedule-content";
    const titulo = document.createElement("strong");
    titulo.textContent = item.veiculo || "Veiculo";
    const meta = document.createElement("div");
    meta.className = "home-schedule-meta";
    meta.textContent = item.local || "Destino a definir";
    const detalhe = document.createElement("div");
    detalhe.className = "home-schedule-detail";
    detalhe.textContent = item.quem || "Condutor a definir";
    conteudo.append(titulo, meta, detalhe);

    card.append(tempo, conteudo);
    lista.appendChild(card);
  });
}

function renderListaAtencao(dados) {
  const now = getById("attentionNow");
  const next = getById("attentionNext");
  const alert = getById("attentionAlert");
  if (!now || !next || !alert) return;

  limparConteudoElemento(now);
  limparConteudoElemento(next);
  limparConteudoElemento(alert);

  const agora = new Date();
  const horaAtual = agora.getHours();
  const hojeIso = agora.toISOString().slice(0, 10);
  const agendamentos = Object.values(dados.agendamentos || {});
  const agendamentosHoje = agendamentos.filter(item => item?.data === hojeIso);
  const proximoAgendamento = agendamentos
    .filter(item => item?.data && new Date(`${item.data}T${item.hora || "00:00"}`) >= agora)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))[0];

  const veiculosRua = Object.values(dados.veiculos || {}).filter(item => item?.emUso).length;
  const chavesUso = Object.keys(dados.chaves || {}).length;
  const jogosUso = Object.keys(dados.jogos || {}).length;
  const guardasUso = Object.keys(dados.guardas || {}).length;
  const pendentesEmp = calcularPendenciasEmpilhadeiras(dados.abastecimentos || {});
  const movimentosAbertos = veiculosRua + chavesUso + jogosUso + guardasUso;

  function preencherLinha(container, iconName, kicker, title, text, primary = false) {
    container.className = primary ? "attention-row attention-row-primary" : "attention-row";

    const iconWrap = document.createElement("div");
    iconWrap.className = "attention-row-icon";
    iconWrap.appendChild(criarIconeLucide(iconName));

    const content = document.createElement("div");
    content.className = "attention-row-content";

    const kickerEl = document.createElement("span");
    kickerEl.className = "attention-kicker";
    kickerEl.textContent = kicker;

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;

    const textEl = document.createElement("p");
    textEl.textContent = text;

    content.append(kickerEl, titleEl, textEl);
    container.append(iconWrap, content);
  }

  if (pendentesEmp) {
    preencherLinha(now, "shield-alert", "Agora", `${pendentesEmp} pendencia(s) de empilhadeira`, "Conferir os abastecimentos previstos para hoje antes da virada do turno.", true);
  } else if (movimentosAbertos) {
    preencherLinha(now, "shield-alert", "Agora", `${movimentosAbertos} movimentacao(oes) aberta(s)`, `${veiculosRua} veiculo(s), ${chavesUso} chave(s), ${jogosUso} jogo(s) e ${guardasUso} guarda-chuva(s) ainda em andamento.`, true);
  } else {
    preencherLinha(now, "shield-check", "Agora", "Turno sob controle", "Sem pendencias criticas e com a operacao estavel neste momento.", true);
  }

  if (proximoAgendamento) {
    preencherLinha(next, "arrow-right-circle", "Proximo", `${proximoAgendamento.veiculo || "Veiculo"} as ${proximoAgendamento.hora || "--:--"}`, `${formatarDataISOParaBR(proximoAgendamento.data) || "-"} • ${proximoAgendamento.local || "Destino a definir"}`);
  } else if (horaAtual < 6 || horaAtual >= 18) {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Acompanhar passagem de plantao", "Conferir os registros do posto e a rotina de troca de turno.");
  } else {
    preencherLinha(next, "arrow-right-circle", "Proximo", "Monitorar rotina operacional", "Seguir com acessos, agenda, emprestimos e movimentacoes da portaria.");
  }

  if (agendamentosHoje.length >= 4) {
    preencherLinha(alert, "siren", "Atencao", `${agendamentosHoje.length} agendamentos concentrados hoje`, "Vale acompanhar a agenda para evitar conflito de horarios e veiculos.");
  } else if (veiculosRua >= 3) {
    preencherLinha(alert, "siren", "Atencao", `${veiculosRua} veiculo(s) seguem em operacao`, "Acompanhe os retornos para evitar virada de turno com pendencia.");
  } else if (movimentosAbertos >= 4) {
    preencherLinha(alert, "siren", "Atencao", `${movimentosAbertos} itens seguem abertos`, "O volume do turno esta alto e merece conferencia mais proxima.");
  } else {
    preencherLinha(alert, "siren", "Atencao", "Sem alerta operacional", "Nada fora do normal exigindo acao imediata.");
  }

  refreshLucideIcons();
}

function atualizarPainelPendencias() {
  return Promise.all([
    db.ref("status_veiculos").once("value"),
    db.ref("chaves_em_uso").once("value"),
    db.ref("jogos_em_uso").once("value"),
    db.ref("guardachuvas_em_uso").once("value"),
    db.ref("agendamentos_veiculos").once("value"),
    db.ref("abastecimentos").once("value"),
    db.ref("pesagens_manuais").once("value"),
    db.ref("cadastros/avisos").once("value")
  ]).then(([veiculosSnap, chavesSnap, jogosSnap, guardasSnap, agendamentosSnap, abastecimentosSnap, pesagensSnap, avisosSnap]) => {
    const dados = {
      veiculos: veiculosSnap.val() || {},
      chaves: chavesSnap.val() || {},
      jogos: jogosSnap.val() || {},
      guardas: guardasSnap.val() || {},
      agendamentos: agendamentosSnap.val() || {},
      abastecimentos: abastecimentosSnap.val() || {},
      pesagens: pesagensSnap.val() || {},
      avisosCadastro: avisosSnap.val() || {}
    };

    atualizarIndicador("statVeiculosRua", Object.values(dados.veiculos).filter(item => item?.emUso).length);
    atualizarIndicador("statChavesUso", Object.keys(dados.chaves).length);
    atualizarIndicador("statJogosUso", Object.keys(dados.jogos).length);
    atualizarIndicador("statGuardasUso", Object.keys(dados.guardas).length);
    atualizarIndicador("statAgendamentos", Object.values(dados.agendamentos).filter(item => item?.data === new Date().toISOString().slice(0, 10)).length);
    atualizarIndicador("statEmpilhadeirasPendentes", calcularPendenciasEmpilhadeiras(dados.abastecimentos));
    renderResumoHome(dados);

    dashboardState.slides = construirSlidesOperacionais(dados);
    dashboardState.activeIndex = 0;
    renderSlideOperacional();
    renderListaAtencao(dados);
    renderCentralAvisosHomeManual(dados);
    renderAgendaHome(dados);
    iniciarRotacaoPainel();
  }).catch(() => undefined);
}
