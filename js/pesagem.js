const pesagemManualState = {
  registros: {},
  atual: null,
  selecionadoId: null,
  filtroStatus: "",
  modo: "lista",
  origemEdicao: false
};

const OPERADOR_PESAGEM_MANUAL = "PORTEIRO";

function formatarPlacaPesagem(valor) {
  const bruto = String(valor || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);

  if (bruto.length <= 3) return bruto;
  return `${bruto.slice(0, 3)}-${bruto.slice(3)}`;
}

function obterValorPesagem(id) {
  return getById(id)?.value || "";
}

function definirValorPesagem(id, valor) {
  const campo = getById(id);
  if (campo) campo.value = valor;
}

function parseNumeroPesagem(valor) {
  const numero = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function formatarPesoCampo(valor) {
  const numero = parseNumeroPesagem(valor);
  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarPesoTicket(valor) {
  const numero = Math.round(parseNumeroPesagem(valor));
  return numero.toLocaleString("pt-BR");
}

function formatarPesoDisplay(valor) {
  return formatarPesoTicket(valor);
}

function obterTextoStatusPesagem(valor) {
  return valor === "FE" ? "FE - Fechada" : "AB - Aberta";
}

function escaparHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function obterDescricaoTipoPesagem(tipo) {
  if (tipo === "PD") return "Pesagem Dupla";
  if (tipo === "PC") return "Pesagem de Conferência";
  return "Pesagem Única";
}

function obterDescricaoStatusPesagem(status) {
  return status === "FE" ? "Fechada" : "Aberta";
}

function obterDataHoraAgora() {
  const agora = new Date();
  const data = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}:${String(agora.getSeconds()).padStart(2, "0")}`;
  return { data, hora };
}

function formatarDataPesagemDisplay(dataIso) {
  return formatarDataISOParaBR(dataIso) || "";
}

function obterDataHoraFormatada(data, hora) {
  const dataBr = formatarDataISOParaBR(data) || "__/__/____";
  const horaFormatada = hora || "--:--:--";
  return `${dataBr} - ${horaFormatada}`;
}

function obterCssTicketPesagemPopup() {
  return `
    @page { size: A4 portrait; margin: 8mm; }
    body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #111111; }
    .ticket-pesagem-manual { display: block; border: 1px solid #292929; width: 198mm; min-height: 140mm; margin: 0 auto; background: #ffffff; }
    .ticket-pesagem-header { display: flex; justify-content: space-between; gap: 14px; align-items: center; min-height: 82px; padding: 8px 14px 4px; }
    .ticket-pesagem-brand { display: flex; gap: 8px; align-items: center; }
    .ticket-pesagem-brand img { width: 122px; height: auto; }
    .ticket-pesagem-brand-text { display: grid; gap: 2px; font-size: 13px; line-height: 1.1; text-align: center; }
    .ticket-pesagem-brand-text strong { font-size: 18px; font-weight: 700; letter-spacing: .01em; }
    .ticket-pesagem-meta { display: grid; gap: 3px; font-size: 13px; text-align: right; line-height: 1.1; }
    .ticket-pesagem-title-bar { padding: 4px 9px; border-top: 1px solid #292929; border-bottom: 1px solid #292929; background: #6fa3d8; font-size: 18px; font-weight: 700; text-transform: uppercase; }
    .ticket-pesagem-params-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; min-height: 22px; padding: 2px 10px 0; font-size: 12px; }
    .ticket-pesagem-params-row span:nth-child(2) { justify-self: center; }
    .ticket-pesagem-copy { display: grid; gap: 0; }
    .ticket-pesagem-copy + .ticket-pesagem-copy { margin-top: 8px; }
    .ticket-pesagem-number-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; min-height: 44px; padding: 8px 10px 7px; font-size: 24px; font-weight: 700; }
    .ticket-pesagem-number-row strong:last-child { justify-self: end; }
    .ticket-pesagem-box { margin: 18px 12px 0; border: 1px solid #292929; }
    .ticket-pesagem-line { padding: 8px 10px; border-bottom: 1px solid #292929; font-size: 16px; min-height: 36px; display: flex; align-items: center; }
    .ticket-pesagem-line:last-child { border-bottom: none; }
    .ticket-pesagem-line--triple { display: grid; grid-template-columns: 1.45fr .55fr .55fr; padding: 0; font-weight: 700; }
    .ticket-pesagem-line--triple span, .ticket-pesagem-line--triple strong { min-height: 36px; display: flex; align-items: center; justify-content: center; border-left: 1px solid #292929; }
    .ticket-pesagem-line--triple strong { justify-content: flex-start; padding: 0 10px; border-left: none; font-size: 24px; font-weight: 700; }
    .ticket-pesagem-weights { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .ticket-pesagem-weight-column { min-height: 188px; padding: 0; border-right: 1px solid #292929; display: grid; grid-template-rows: 44px 1fr; }
    .ticket-pesagem-weight-column:last-child { border-right: none; }
    .ticket-pesagem-weight-title { min-height: 44px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; border-bottom: 1px solid #292929; }
    .ticket-pesagem-weight-body { display: grid; gap: 8px; padding: 10px 12px 8px; align-content: start; }
    .ticket-pesagem-weight-body span, .ticket-pesagem-weight-body small { font-size: 15px; line-height: 1.15; }
    .ticket-pesagem-weight-body b { text-align: center; font-size: 36px; line-height: 1; font-weight: 700; margin-top: 8px; }
    .ticket-pesagem-fieldline { display: grid; grid-template-columns: auto 1fr; align-items: baseline; gap: 8px; }
    .ticket-pesagem-fieldline--operator span { font-size: 11px; }
    .ticket-pesagem-weight-column--net .ticket-pesagem-weight-body { align-content: center; justify-items: center; min-height: 132px; }
    .ticket-pesagem-weight-column--net .ticket-pesagem-weight-body b { font-size: 38px; }
    .ticket-pesagem-obs { min-height: 42px; padding: 9px 10px; font-size: 16px; }
    .ticket-pesagem-footer { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px 5px; font-size: 14px; color: #444444; }
  `;
}

function montarTextoRelatorioPesagemManual(registro) {
  const dados = registro || coletarDadosPesagemManual();
  const tipoEnvio = dados.segundaPesagem > 0 ? "RELATORIO FINAL DE PESAGEM" : "RELATORIO PARCIAL DE PESAGEM";
  const linhas = [
    "NORTEFRUT",
    tipoEnvio,
    `TICKET: ${dados.numeroPesagem || "-"}`,
    `STATUS: ${dados.statusPesagem || "AB"}`,
    `PLACA: ${dados.placa || "-"}`,
    `PRODUTOR/TRANSPORTADOR: ${dados.produtorTransportador || "-"}`,
    `MOTORISTA: ${dados.motorista || "-"}`,
    `PRODUTO: ${dados.produto || "-"}`,
    `OBSERVACAO: ${dados.observacao || "-"}`,
    `PESAGEM INICIAL: ${formatarPesoTicket(dados.primeiraPesagem || 0)} KG`,
    `DATA/HORA INICIAL: ${obterDataHoraFormatada(dados.dataPrimeiraPesagem, dados.horaPrimeiraPesagem)}`,
    `OPERADOR INICIAL: ${dados.usuarioPrimeiraPesagem || "-"}`
  ];

  if (dados.segundaPesagem > 0) {
    linhas.push(`PESAGEM FINAL: ${formatarPesoTicket(dados.segundaPesagem || 0)} KG`);
    linhas.push(`DATA/HORA FINAL: ${obterDataHoraFormatada(dados.dataSegundaPesagem, dados.horaSegundaPesagem)}`);
    linhas.push(`OPERADOR FINAL: ${dados.usuarioSegundaPesagem || "-"}`);
    linhas.push(`PESO LIQUIDO: ${formatarPesoTicket(dados.pesoLiquido || 0)} KG`);
  } else {
    linhas.push("PESAGEM FINAL: AGUARDANDO RETORNO DO CAMINHAO");
    linhas.push("PESO LIQUIDO: AGUARDANDO SEGUNDA PESAGEM");
  }

  return linhas.join("\n");
}

function obterRegistroRelatorioPesagemManual() {
  const idAtual = obterValorPesagem("pm_registro_id");
  if (idAtual && pesagemManualState.registros?.[idAtual]) {
    return { id: idAtual, ...pesagemManualState.registros[idAtual] };
  }

  if (pesagemManualState.selecionadoId && pesagemManualState.registros?.[pesagemManualState.selecionadoId]) {
    return { id: pesagemManualState.selecionadoId, ...pesagemManualState.registros[pesagemManualState.selecionadoId] };
  }

  const dadosForm = coletarDadosPesagemManual();
  return dadosForm.numeroPesagem ? dadosForm : null;
}

function abrirRelatorioPesagemManual(registro, imprimir = false) {
  if (!registro?.numeroPesagem) {
    avisoInfo("Selecione ou registre uma pesagem para abrir o relatorio.", "file-text");
    return;
  }

  if (!imprimir) {
    pesagemManualState.atual = registro;
    renderTicketPesagemManual(registro);
    ocultarElemento("pesagemManualListaView");
    ocultarElemento("pesagemManualDetalheView");
    mostrarElemento("pesagemManualRelatorioView");
    pesagemManualState.modo = "relatorio";
    atualizarBarraLateralPesagem();
    return;
  }

  const popup = window.open("", "_blank", "width=920,height=900");
  if (!popup) {
    avisoErro(imprimir ? "Nao foi possivel abrir a impressao do ticket." : "Nao foi possivel abrir o relatorio da pesagem.");
    return;
  }

  const html = montarTicketPesagemManualHtml(registro);
  const logoUrl = new URL("imagens/logo-nortefrut.png", window.location.href).href;
  const htmlComLogo = html.replace('src="imagens/logo-nortefrut.png"', `src="${logoUrl}"`);
  const scriptImpressao = imprimir ? `
        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
  ` : "";

  popup.document.write(`
    <html lang="pt-br">
      <head>
        <title>Ticket de Pesagem ${escaparHtml(registro.numeroPesagem)}</title>
        <style>
          ${obterCssTicketPesagemPopup()}
        </style>
      </head>
      <body>
        ${htmlComLogo}
        ${scriptImpressao}
      </body>
    </html>
  `);
  popup.document.close();
}

function calcularCamposPesagemManual() {
  const primeira = parseNumeroPesagem(obterValorPesagem("pm_primeira_pesagem"));
  const segunda = parseNumeroPesagem(obterValorPesagem("pm_segunda_pesagem"));
  const liquido = primeira > 0 && segunda > 0 ? Math.abs(primeira - segunda) : 0;

  definirValorPesagem("pm_km_inicial", "0");
  definirValorPesagem("pm_km_final", "0");
  definirValorPesagem("pm_km_percorrido", "0");
  definirValorPesagem("pm_reboque1", "-");
  definirValorPesagem("pm_reboque2", "-");
  definirValorPesagem("pm_peso_declarado", "0,00");
  definirValorPesagem("pm_peso_liquido", formatarPesoCampo(liquido));
  const display = getById("pm_peso_liquido_display");
  if (display) display.textContent = formatarPesoDisplay(liquido);

  const status = segunda > 0 ? "FE" : "AB";
  definirValorPesagem("pm_status", status);
  definirValorPesagem("pm_status_display", obterTextoStatusPesagem(status));
}

function gerarProximoNumeroPesagem() {
  const numeros = Object.values(pesagemManualState.registros || {})
    .map(item => Number(item.numeroPesagem || 0))
    .filter(numero => Number.isFinite(numero) && numero > 0);

  if (!numeros.length) return 1;
  return Math.max(...numeros) + 1;
}

function limparFormularioPesagemManual() {
  [
    "pm_registro_id",
    "pm_placa",
    "pm_reboque1",
    "pm_reboque2",
    "pm_produtor",
    "pm_motorista",
    "pm_produto",
    "pm_peso_declarado",
    "pm_observacao",
    "pm_primeira_pesagem",
    "pm_segunda_pesagem",
    "pm_data_primeira",
    "pm_hora_primeira",
    "pm_data_segunda",
    "pm_hora_segunda",
    "pm_usuario_primeira",
    "pm_usuario_segunda"
  ].forEach(id => definirValorPesagem(id, ""));

  definirValorPesagem("pm_tipo", "PU");
  definirValorPesagem("pm_status", "AB");
  definirValorPesagem("pm_status_display", "AB - Aberta");
  definirValorPesagem("pm_reboque1", "-");
  definirValorPesagem("pm_reboque2", "-");
  definirValorPesagem("pm_km_inicial", "0");
  definirValorPesagem("pm_km_final", "0");
  definirValorPesagem("pm_km_percorrido", "0");
  definirValorPesagem("pm_numero", String(gerarProximoNumeroPesagem()));
  definirValorPesagem("pm_peso_declarado", "0,00");
  definirValorPesagem("pm_peso_liquido", formatarPesoCampo(0));

  const display = getById("pm_peso_liquido_display");
  if (display) display.textContent = "0";

  pesagemManualState.atual = null;
  pesagemManualState.selecionadoId = null;
  pesagemManualState.origemEdicao = false;
  renderTicketPesagemManual(null);
  abrirDetalhePesagemManual();
}

function definirCampoBloqueado(id, bloqueado) {
  const campo = getById(id);
  if (!campo) return;
  campo.disabled = bloqueado;
  campo.readOnly = bloqueado;
  campo.classList.toggle("readonly-field", bloqueado);
}

function atualizarEstadoSegundaPesagem() {
  const statusAtual = obterValorPesagem("pm_status") || "AB";
  const fechado = statusAtual === "FE";
  const primeiraJaRegistrada = Boolean(
    parseNumeroPesagem(obterValorPesagem("pm_primeira_pesagem")) > 0 &&
    obterValorPesagem("pm_usuario_primeira")
  );
  const segundaJaRegistrada = Boolean(parseNumeroPesagem(obterValorPesagem("pm_segunda_pesagem")) > 0);
  const podeEditarSegunda = pesagemManualState.origemEdicao === true && primeiraJaRegistrada && !segundaJaRegistrada && !fechado;
  const botaoPesar = document.querySelector('.pesagem-pesar-btn[data-action="salvar-pesagem-manual"]');

  if (botaoPesar) {
    botaoPesar.disabled = segundaJaRegistrada || fechado;
  }

  [
    "pm_numero",
    "pm_status_display",
    "pm_reboque1",
    "pm_reboque2",
    "pm_km_inicial",
    "pm_km_final",
    "pm_km_percorrido",
    "pm_peso_declarado",
    "pm_usuario_primeira",
    "pm_usuario_segunda"
  ].forEach(id => definirCampoBloqueado(id, true));

  if (!primeiraJaRegistrada) {
    definirCampoBloqueado("pm_placa", false);
    definirCampoBloqueado("pm_produtor", false);
    definirCampoBloqueado("pm_motorista", false);
    definirCampoBloqueado("pm_produto", false);
    definirCampoBloqueado("pm_observacao", false);
    definirCampoBloqueado("pm_primeira_pesagem", false);
    definirCampoBloqueado("pm_segunda_pesagem", true);
    return;
  }

  if (fechado) {
    definirCampoBloqueado("pm_placa", true);
    definirCampoBloqueado("pm_primeira_pesagem", true);
    definirCampoBloqueado("pm_segunda_pesagem", true);
    definirCampoBloqueado("pm_produtor", !pesagemManualState.origemEdicao);
    definirCampoBloqueado("pm_motorista", !pesagemManualState.origemEdicao);
    definirCampoBloqueado("pm_produto", !pesagemManualState.origemEdicao);
    definirCampoBloqueado("pm_observacao", !pesagemManualState.origemEdicao);
    return;
  }

  definirCampoBloqueado("pm_produtor", !pesagemManualState.origemEdicao);
  definirCampoBloqueado("pm_motorista", !pesagemManualState.origemEdicao);
  definirCampoBloqueado("pm_produto", !pesagemManualState.origemEdicao);
  definirCampoBloqueado("pm_observacao", !pesagemManualState.origemEdicao);
  definirCampoBloqueado("pm_primeira_pesagem", true);
  definirCampoBloqueado("pm_placa", true);
  definirCampoBloqueado("pm_segunda_pesagem", !podeEditarSegunda);
}

function coletarDadosPesagemManual() {
  calcularCamposPesagemManual();

  const criadoEmAnterior = pesagemManualState.atual?.criadoEm || Date.now();
  const numeroPesagem = Number(obterValorPesagem("pm_numero")) || gerarProximoNumeroPesagem();
  const primeiraPesagem = parseNumeroPesagem(obterValorPesagem("pm_primeira_pesagem"));
  const segundaPesagem = parseNumeroPesagem(obterValorPesagem("pm_segunda_pesagem"));
  const pesoLiquido = primeiraPesagem > 0 && segundaPesagem > 0 ? Math.abs(primeiraPesagem - segundaPesagem) : 0;
  const pesoDeclarado = parseNumeroPesagem(obterValorPesagem("pm_peso_declarado"));
  const status = segundaPesagem > 0 ? "FE" : "AB";

  return {
    numeroPesagem,
    tipoPesagem: "PU",
    statusPesagem: status,
    pesagemManual: "S",
    placa: normalizarTexto(obterValorPesagem("pm_placa")),
    placaReboque01: "-",
    placaReboque02: "-",
    kmInicial: 0,
    kmFinal: 0,
    kmPercorrido: 0,
    produtorTransportador: normalizarTexto(obterValorPesagem("pm_produtor")),
    motorista: normalizarTexto(obterValorPesagem("pm_motorista")),
    produto: normalizarTexto(obterValorPesagem("pm_produto")),
    pesoDeclarado: 0,
    observacao: normalizarTexto(obterValorPesagem("pm_observacao")),
    primeiraPesagem,
    segundaPesagem,
    pesoLiquido,
    dataPrimeiraPesagem: obterValorPesagem("pm_data_primeira"),
    horaPrimeiraPesagem: obterValorPesagem("pm_hora_primeira"),
    dataSegundaPesagem: obterValorPesagem("pm_data_segunda"),
    horaSegundaPesagem: obterValorPesagem("pm_hora_segunda"),
    usuarioPrimeiraPesagem: obterValorPesagem("pm_usuario_primeira") || "",
    usuarioSegundaPesagem: obterValorPesagem("pm_usuario_segunda") || "",
    criadoEm: criadoEmAnterior,
    atualizadoEm: Date.now()
  };
}

function validarPesagemManual(dados) {
  if (!dados.numeroPesagem) {
    avisoValidacao("Informe o número da pesagem.");
    return false;
  }

  if (!dados.placa) {
    avisoValidacao("Informe a placa do veículo.");
    return false;
  }

  if (!dados.observacao) {
    avisoValidacao("Informe a observação.");
    return false;
  }

  if (!dados.primeiraPesagem || dados.primeiraPesagem <= 0) {
    avisoValidacao("Informe a primeira pesagem.");
    return false;
  }

  return true;
}

function preencherFormularioPesagemManual(id) {
  const dados = pesagemManualState.registros?.[id];
  if (!dados) {
    avisoErro("Pesagem manual não encontrada.");
    return;
  }

  pesagemManualState.atual = { id, ...dados };
  pesagemManualState.selecionadoId = id;
  pesagemManualState.origemEdicao = true;
  definirValorPesagem("pm_registro_id", id);
  definirValorPesagem("pm_numero", dados.numeroPesagem || "");
  definirValorPesagem("pm_status", dados.statusPesagem || "AB");
  definirValorPesagem("pm_status_display", obterTextoStatusPesagem(dados.statusPesagem || "AB"));
  definirValorPesagem("pm_placa", dados.placa || "");
  definirValorPesagem("pm_reboque1", dados.placaReboque01 || "");
  definirValorPesagem("pm_reboque2", dados.placaReboque02 || "");
  definirValorPesagem("pm_km_inicial", String(dados.kmInicial ?? 0));
  definirValorPesagem("pm_km_final", String(dados.kmFinal ?? 0));
  definirValorPesagem("pm_km_percorrido", String(dados.kmPercorrido ?? 0));
  definirValorPesagem("pm_produtor", dados.produtorTransportador || "");
  definirValorPesagem("pm_motorista", dados.motorista || "");
  definirValorPesagem("pm_produto", dados.produto || "");
  definirValorPesagem("pm_peso_declarado", dados.pesoDeclarado ?? "");
  definirValorPesagem("pm_observacao", dados.observacao || "");
  definirValorPesagem("pm_primeira_pesagem", dados.primeiraPesagem ?? "");
  definirValorPesagem("pm_segunda_pesagem", dados.segundaPesagem ?? "");
  definirValorPesagem("pm_data_primeira", formatarDataPesagemDisplay(dados.dataPrimeiraPesagem));
  definirValorPesagem("pm_hora_primeira", dados.horaPrimeiraPesagem || "");
  definirValorPesagem("pm_data_segunda", formatarDataPesagemDisplay(dados.dataSegundaPesagem));
  definirValorPesagem("pm_hora_segunda", dados.horaSegundaPesagem || "");
  definirValorPesagem("pm_usuario_primeira", dados.usuarioPrimeiraPesagem || "");
  definirValorPesagem("pm_usuario_segunda", dados.usuarioSegundaPesagem || "");

  calcularCamposPesagemManual();
  renderTicketPesagemManual({ id, ...dados });
  abrirDetalhePesagemManual();
  atualizarEstadoSegundaPesagem();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function salvarPesagemManual() {
  const botao = document.activeElement;
  let dados = coletarDadosPesagemManual();

  if (!validarPesagemManual(dados)) return;

  const agora = obterDataHoraAgora();
  const possuiPrimeiraRegistrada = Boolean(dados.dataPrimeiraPesagem && dados.horaPrimeiraPesagem);
  const possuiSegundaRegistrada = Boolean(dados.dataSegundaPesagem && dados.horaSegundaPesagem);
  const finalizandoSegundaPesagem = dados.segundaPesagem > 0 && !possuiSegundaRegistrada;

  if (possuiSegundaRegistrada) {
    avisoInfo("Essa pesagem já foi finalizada e não pode ser pesada novamente.", "scale");
    return;
  }

  if (!possuiPrimeiraRegistrada) {
    dados.dataPrimeiraPesagem = agora.data;
    dados.horaPrimeiraPesagem = agora.hora;
    dados.usuarioPrimeiraPesagem = OPERADOR_PESAGEM_MANUAL;
  } else if (dados.segundaPesagem > 0 && !possuiSegundaRegistrada) {
    dados.dataSegundaPesagem = agora.data;
    dados.horaSegundaPesagem = agora.hora;
    dados.usuarioSegundaPesagem = OPERADOR_PESAGEM_MANUAL;
  } else if (possuiPrimeiraRegistrada && !dados.segundaPesagem) {
    avisoValidacao("Informe a segunda pesagem para finalizar.");
    return;
  }

  dados.statusPesagem = dados.segundaPesagem > 0 ? "FE" : "AB";

  const idAtual = obterValorPesagem("pm_registro_id");
  const numeroDuplicado = Object.entries(pesagemManualState.registros || {}).some(([id, item]) => {
    if (id === idAtual) return false;
    return Number(item.numeroPesagem || 0) === Number(dados.numeroPesagem || 0);
  });

  if (numeroDuplicado) {
    avisoValidacao("Já existe uma pesagem manual com esse número.");
    return;
  }

  const ref = idAtual ? db.ref(`pesagens_manuais/${idAtual}`) : db.ref("pesagens_manuais").push();

  alternarBotaoCarregando(botao, true);
  ref.set(dados)
    .then(() => {
      const id = idAtual || ref.key;
      pesagemManualState.atual = { id, ...dados };
      pesagemManualState.selecionadoId = id;
      pesagemManualState.origemEdicao = false;
      definirValorPesagem("pm_registro_id", id);
      definirValorPesagem("pm_data_primeira", formatarDataPesagemDisplay(dados.dataPrimeiraPesagem));
      definirValorPesagem("pm_hora_primeira", dados.horaPrimeiraPesagem || "");
      definirValorPesagem("pm_usuario_primeira", dados.usuarioPrimeiraPesagem || "");
      definirValorPesagem("pm_data_segunda", formatarDataPesagemDisplay(dados.dataSegundaPesagem));
      definirValorPesagem("pm_hora_segunda", dados.horaSegundaPesagem || "");
      definirValorPesagem("pm_usuario_segunda", dados.usuarioSegundaPesagem || "");
      definirValorPesagem("pm_status", dados.statusPesagem);
      definirValorPesagem("pm_status_display", obterTextoStatusPesagem(dados.statusPesagem));
      atualizarEstadoSegundaPesagem();
      renderTicketPesagemManual({ id, ...dados });
      abrirDetalhePesagemManual();
      renderListaPesagensManuais(pesagemManualState.registros);
      avisoSucesso(dados.statusPesagem === "FE" ? "Pesagem manual finalizada com sucesso." : "Pesagem manual salva com sucesso.", "scale");
    })
    .catch(() => avisoErro("Erro ao salvar a pesagem manual."))
    .finally(() => alternarBotaoCarregando(botao, false, "Salvar Pesagem"));
}

function montarTicketPesagemManualHtml(registro) {
  const dados = registro || coletarDadosPesagemManual();
  const usuarioTopo = dados.usuarioSegundaPesagem || dados.usuarioPrimeiraPesagem || "-";
  const emissao = dados.atualizadoEm ? new Date(dados.atualizadoEm) : new Date();
  const dataEmissao = emissao.toLocaleDateString("pt-BR");
  const horaEmissao = emissao.toLocaleTimeString("pt-BR", { hour12: false });
  const dataHoraInicial = dados.primeiraPesagem > 0
    ? obterDataHoraFormatada(dados.dataPrimeiraPesagem, dados.horaPrimeiraPesagem)
    : "";
  const dataHoraFinal = dados.segundaPesagem > 0
    ? obterDataHoraFormatada(dados.dataSegundaPesagem, dados.horaSegundaPesagem)
    : "";
  const viaHtml = via => `
    <section class="ticket-pesagem-copy">
      <div class="ticket-pesagem-number-row">
        <strong>TICKET DE PESAGEM N.: ${escaparHtml(dados.numeroPesagem)}</strong>
        <strong>${escaparHtml(via)} VIA</strong>
      </div>

      <div class="ticket-pesagem-box">
        <div class="ticket-pesagem-line ticket-pesagem-line--triple">
          <strong>PLACA: ${escaparHtml(dados.placa || "-")}</strong>
          <span>${escaparHtml(dados.placaReboque01 || "-")}</span>
          <span>${escaparHtml(dados.placaReboque02 || "-")}</span>
        </div>

        <div class="ticket-pesagem-line">PRODUTOR / TRANSPORTADOR: ${escaparHtml(dados.produtorTransportador || "")}</div>
        <div class="ticket-pesagem-line">PRODUTO: ${escaparHtml(dados.produto || "")}</div>
        <div class="ticket-pesagem-line">MOTORISTA: ${escaparHtml(dados.motorista || "")}</div>

        <div class="ticket-pesagem-weights">
          <div class="ticket-pesagem-weight-column">
            <div class="ticket-pesagem-weight-title">PESAGEM INICIAL</div>
            <div class="ticket-pesagem-weight-body">
              <div class="ticket-pesagem-fieldline">
                <small>Data/ Hora:</small>
                <span>${escaparHtml(dataHoraInicial)}</span>
              </div>
              <div class="ticket-pesagem-fieldline">
                <small>Peso (Kg):</small>
              </div>
              <b>${escaparHtml(formatarPesoTicket(dados.primeiraPesagem || 0))}</b>
              <div class="ticket-pesagem-fieldline ticket-pesagem-fieldline--operator">
                <small>Operador:</small>
                <span>${escaparHtml(dados.usuarioPrimeiraPesagem || "")}</span>
              </div>
            </div>
          </div>
          <div class="ticket-pesagem-weight-column">
            <div class="ticket-pesagem-weight-title">PESAGEM FINAL</div>
            <div class="ticket-pesagem-weight-body">
              <div class="ticket-pesagem-fieldline">
                <small>Data/ Hora:</small>
                <span>${escaparHtml(dataHoraFinal)}</span>
              </div>
              <div class="ticket-pesagem-fieldline">
                <small>Peso (Kg):</small>
              </div>
              <b>${escaparHtml(formatarPesoTicket(dados.segundaPesagem || 0))}</b>
              <div class="ticket-pesagem-fieldline ticket-pesagem-fieldline--operator">
                <small>Operador:</small>
                <span>${escaparHtml(dados.usuarioSegundaPesagem || "")}</span>
              </div>
            </div>
          </div>
          <div class="ticket-pesagem-weight-column ticket-pesagem-weight-column--net">
            <div class="ticket-pesagem-weight-title">PESO LIQUIDO</div>
            <div class="ticket-pesagem-weight-body">
              <b>${escaparHtml(formatarPesoTicket(dados.pesoLiquido || 0))}</b>
            </div>
          </div>
        </div>

        <div class="ticket-pesagem-obs">OBS.: ${escaparHtml(dados.observacao || "")}</div>
      </div>
    </section>
  `;

  return `
    <div class="ticket-pesagem-manual">
      <div class="ticket-pesagem-header">
        <div class="ticket-pesagem-brand">
          <img src="imagens/logo-nortefrut.png" alt="Nortefrut">
          <div class="ticket-pesagem-brand-text">
            <strong>NORTEFRUT</strong>
            <span>13 - NORTEFRUT IMPORTACAO E EXPORTACAO LTDA</span>
            <span>CENTRO - Pinheiros / ES</span>
          </div>
        </div>
        <div class="ticket-pesagem-meta">
          <span>Página: 1 de 1</span>
          <span>Data: ${escaparHtml(dataEmissao)} - ${escaparHtml(horaEmissao)}</span>
          <span>Usuário: ${escaparHtml(usuarioTopo.toLowerCase())}</span>
        </div>
      </div>

      <div class="ticket-pesagem-title-bar">TICKET DE PESAGEM</div>
      <div class="ticket-pesagem-params-row">
        <span></span>
        <span>Parâmetros:</span>
        <span></span>
      </div>
      ${viaHtml("1")}

      <div class="ticket-pesagem-footer">
        <span>Narte Soluções - www.narte.com.br</span>
        <span>PAVMOD\\ISMOD_PAV_001</span>
      </div>
    </div>
  `;
}

function renderTicketPesagemManual(registro) {
  const container = getById("pesagemTicketPreview");
  if (!container) return;
  container.innerHTML = montarTicketPesagemManualHtml(registro);
}

function gerarTicketPesagemManual() {
  const dados = coletarDadosPesagemManual();
  if (!dados.numeroPesagem) {
    avisoInfo("Preencha a pesagem para gerar o ticket.", "receipt-text");
    return;
  }
  renderTicketPesagemManual({
    ...pesagemManualState.atual,
    ...dados
  });
  avisoSucesso("Ticket atualizado para conferência.", "receipt-text");
}

function imprimirTicketPesagemManual(id) {
  const registro = id ? { id, ...(pesagemManualState.registros?.[id] || {}) } : (pesagemManualState.atual || coletarDadosPesagemManual());
  if (!registro?.numeroPesagem) {
    avisoInfo("Selecione ou preencha uma pesagem para imprimir.", "printer");
    return;
  }
  abrirRelatorioPesagemManual(registro, true);
}

function abrirListaPesagemManual() {
  ocultarElemento("pesagemManualDetalheView");
  ocultarElemento("pesagemManualRelatorioView");
  mostrarElemento("pesagemManualListaView");
  pesagemManualState.modo = "lista";
  pesagemManualState.origemEdicao = false;
  atualizarBarraLateralPesagem();
}

function abrirDetalhePesagemManual() {
  ocultarElemento("pesagemManualListaView");
  ocultarElemento("pesagemManualRelatorioView");
  mostrarElemento("pesagemManualDetalheView");
  pesagemManualState.modo = "detalhe";
  atualizarBarraLateralPesagem();
  atualizarEstadoSegundaPesagem();
}

function atualizarBarraLateralPesagem() {
  const incluir = getById("pmSidebarIncluir");
  const editar = getById("pmSidebarEditar");
  const cancelar = getById("pmSidebarCancelar");
  const salvar = getById("pmSidebarSalvar");
  const relatorio = getById("pmSidebarRelatorio");

  [incluir, editar, cancelar, salvar, relatorio].forEach(botao => {
    if (!botao) return;
    botao.classList.remove("active");
    botao.disabled = false;
    botao.classList.remove("is-hidden");
  });

  if (pesagemManualState.modo === "detalhe") {
    incluir?.classList.add("active");
    cancelar?.classList.add("active");
  }

  if (pesagemManualState.modo === "relatorio") {
    relatorio?.classList.add("active");
    cancelar?.classList.add("active");
    salvar?.classList.add("is-hidden");
  }

  if (pesagemManualState.modo === "lista") {
    cancelar?.classList.add("is-hidden");
    salvar?.classList.add("is-hidden");
  }

  if (!pesagemManualState.selecionadoId && editar) {
    editar.disabled = true;
  }
}

function enviarRelatorioPesagemManual() {
  const registro = obterRegistroRelatorioPesagemManual();
  if (!registro?.numeroPesagem || !registro?.primeiraPesagem) {
    avisoInfo("Selecione ou registre uma pesagem para enviar o relatorio.", "file-text");
    return;
  }
  abrirRelatorioPesagemManual(registro, false);
}

function obterListaPesagensFiltrada(registros) {
  const filtroBusca = normalizarTexto(obterValorPesagem("pm_filtro_busca"));
  const filtroStatus = pesagemManualState.filtroStatus;

  return Object.entries(registros || {})
    .map(([id, dados]) => ({ id, ...dados }))
    .filter(item => {
      const numero = String(item.numeroPesagem || "");
      const placa = normalizarTexto(item.placa || "");
      const status = String(item.statusPesagem || "");
      if (filtroBusca && !numero.includes(filtroBusca) && !placa.includes(filtroBusca)) return false;
      if (filtroStatus && status !== filtroStatus) return false;
      return true;
    })
    .sort((a, b) => {
      const numeroA = Number(a.numeroPesagem || 0);
      const numeroB = Number(b.numeroPesagem || 0);
      if (numeroA !== numeroB) return numeroB - numeroA;
      return Number(b.atualizadoEm || 0) - Number(a.atualizadoEm || 0);
    });
}

function obterTextoFiltroStatus(valor) {
  if (valor === "AB") return "AB";
  if (valor === "FE") return "FE";
  return "Status";
}

function atualizarRotuloFiltroStatus() {
  const botao = getById("pm_filtro_status_ciclo");
  if (botao) botao.textContent = obterTextoFiltroStatus(pesagemManualState.filtroStatus);
}

function definirFiltroStatus(valor) {
  pesagemManualState.filtroStatus = valor || "";
  atualizarRotuloFiltroStatus();
  renderListaPesagensManuais(pesagemManualState.registros);
}

function alternarFiltroStatus() {
  const atual = pesagemManualState.filtroStatus;
  if (atual === "") return definirFiltroStatus("AB");
  if (atual === "AB") return definirFiltroStatus("FE");
  return definirFiltroStatus("");
}

function alternarMenuFiltroStatus(mostrar) {
  const menu = getById("pm_filtro_status_menu");
  if (!menu) return;
  menu.classList.toggle("is-hidden", !mostrar);
}

function configurarFiltroStatusPesagem() {
  const botaoCiclo = getById("pm_filtro_status_ciclo");
  const botaoToggle = getById("pm_filtro_status_toggle");
  const menu = getById("pm_filtro_status_menu");
  const container = getById("pmStatusFilter");
  if (!botaoCiclo || !botaoToggle || !menu || !container) return;

  botaoCiclo.addEventListener("click", () => {
    alternarFiltroStatus();
    alternarMenuFiltroStatus(false);
  });

  botaoToggle.addEventListener("click", event => {
    event.stopPropagation();
    alternarMenuFiltroStatus(menu.classList.contains("is-hidden"));
  });

  menu.querySelectorAll("[data-status-value]").forEach(botao => {
    botao.addEventListener("click", () => {
      definirFiltroStatus(botao.dataset.statusValue || "");
      alternarMenuFiltroStatus(false);
    });
  });

  document.addEventListener("click", event => {
    if (!container.contains(event.target)) {
      alternarMenuFiltroStatus(false);
    }
  });

  atualizarRotuloFiltroStatus();
}

function selecionarPesagemManual(id) {
  pesagemManualState.selecionadoId = id;
  pesagemManualState.origemEdicao = false;
  renderListaPesagensManuais(pesagemManualState.registros);
  atualizarBarraLateralPesagem();
}

function renderListaPesagensManuais(registros) {
  const container = getById("listaPesagensManuais");
  if (!container) return;
  limparConteudoElemento(container);

  const lista = obterListaPesagensFiltrada(registros);

  if (!lista.length) {
    const vazio = document.createElement("div");
    vazio.className = "pesagem-empty";
    vazio.textContent = "Nenhuma pesagem encontrada com os filtros informados.";
    container.appendChild(vazio);
    return;
  }

  lista.forEach(item => {
    const row = document.createElement("div");
    row.className = `pesagem-table-row${pesagemManualState.selecionadoId === item.id ? " is-selected" : ""}`;
    row.dataset.id = item.id;

    row.innerHTML = `
      <span>${escaparHtml(item.numeroPesagem || "-")}</span>
      <span>${escaparHtml(item.statusPesagem || "AB")}</span>
      <span>${escaparHtml(item.placa || "-")}</span>
    `;

    row.addEventListener("click", () => selecionarPesagemManual(item.id));
    row.addEventListener("dblclick", () => preencherFormularioPesagemManual(item.id));
    container.appendChild(row);
  });
}

function abrirPesagemManualPorId(id) {
  preencherFormularioPesagemManual(id);
}

function visualizarTicketPesagemManual(id) {
  const dados = pesagemManualState.registros?.[id];
  if (!dados) {
    avisoErro("Ticket não encontrado.");
    return;
  }
  renderTicketPesagemManual({ id, ...dados });
  pesagemManualState.atual = { id, ...dados };
  pesagemManualState.selecionadoId = id;
  avisoInfo("Ticket carregado para visualização.", "receipt-text");
  abrirDetalhePesagemManual();
}

function editarPesagemManualSelecionada() {
  if (!pesagemManualState.selecionadoId) {
    avisoInfo("Selecione uma pesagem na lista para editar.", "pencil");
    return;
  }
  pesagemManualState.origemEdicao = true;
  preencherFormularioPesagemManual(pesagemManualState.selecionadoId);
}

function voltarListaPesagemManual() {
  abrirListaPesagemManual();
  renderListaPesagensManuais(pesagemManualState.registros);
}

function vincularEventosPesagemManual() {
  [
    "pm_primeira_pesagem",
    "pm_segunda_pesagem"
  ].forEach(id => {
    getById(id)?.addEventListener("input", calcularCamposPesagemManual);
  });

  ["pm_filtro_busca"].forEach(id => {
    getById(id)?.addEventListener("input", () => renderListaPesagensManuais(pesagemManualState.registros));
  });

  getById("pm_placa")?.addEventListener("input", event => {
    event.target.value = formatarPlacaPesagem(event.target.value);
  });

  const pesoDeclarado = getById("pm_peso_declarado");
  if (pesoDeclarado) {
    pesoDeclarado.readOnly = true;
    pesoDeclarado.tabIndex = -1;
  }

  atualizarEstadoSegundaPesagem();
}

window.addEventListener("DOMContentLoaded", () => {
  vincularEventosPesagemManual();
  configurarFiltroStatusPesagem();
  abrirListaPesagemManual();
  atualizarBarraLateralPesagem();
  definirValorPesagem("pm_numero", String(gerarProximoNumeroPesagem()));
  definirValorPesagem("pm_status_display", "AB - Aberta");
  renderTicketPesagemManual(null);

  db.ref("pesagens_manuais").on("value", snap => {
    pesagemManualState.registros = snap.val() || {};
    renderListaPesagensManuais(pesagemManualState.registros);

    const idAtual = obterValorPesagem("pm_registro_id");
    if (idAtual && pesagemManualState.registros[idAtual]) {
      pesagemManualState.atual = { id: idAtual, ...pesagemManualState.registros[idAtual] };
      renderTicketPesagemManual(pesagemManualState.atual);
    } else if (!idAtual && !obterValorPesagem("pm_numero")) {
      definirValorPesagem("pm_numero", String(gerarProximoNumeroPesagem()));
    }
  });
});
