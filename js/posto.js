const POSTO_TIPOS = ["S10", "S500", "ARLA"];
const POSTO_PRODUTOS = {
  S10: { estoque: "postoStockS10", contador: "postoContadorS10" },
  S500: { estoque: "postoStockS500", contador: "postoContadorS500" },
  ARLA: { estoque: "postoStockArla", contador: "postoContadorArla" }
};
const postoState = {
  movimentacoes: {},
  plantoes: {}
};
const OPERADOR_POSTO_PADRAO = "PORTEIRO";
let postoAutoSyncPromise = null;
let postoUltimaChaveSincronizada = "";

function obterConfiguracaoBasePosto() {
  return window.postoConfigCadastro || {};
}

function obterBaseProdutoPosto(baseConfig, produto) {
  const mapa = {
    S10: baseConfig.s10,
    S500: baseConfig.s500,
    ARLA: baseConfig.arla
  };
  return mapa[produto] || {};
}

function produtoPlantaoTemBase(item) {
  if (!item) return false;
  return [
    item.estoqueInicial,
    item.estoqueFinal,
    item.contadorInicial,
    item.contadorFinal
  ].some(valor => Number(valor || 0) > 0);
}

function formatarPlacaPosto(valor) {
  const bruto = String(valor || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);

  if (bruto.length <= 3) return bruto;
  return `${bruto.slice(0, 3)}-${bruto.slice(3)}`;
}

function formatarNumeroPosto(valor, sufixo = "", casas = 2) {
  const numero = Number(valor || 0);
  const texto = numero.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  return sufixo ? `${texto} ${sufixo}` : texto;
}

function formatarNumeroInputPosto(valor, casas = 2) {
  return Number(valor || 0).toFixed(casas);
}

function formatarEstoquePosto(valor) {
  const numero = Number(valor || 0);
  return formatarNumeroPosto(numero, "L", 0);
}

function formatarContadorPosto(valor) {
  return formatarNumeroPosto(Number(valor || 0) / 1000, "", 3);
}

function parseContadorPosto(valor) {
  return Math.round(parseDecimalPosto(valor) * 1000);
}

function parseDecimalPosto(valor) {
  let texto = String(valor || "").trim();
  if (!texto) return 0;

  texto = texto.replace(/\s+/g, "");
  const possuiVirgula = texto.includes(",");
  const possuiPonto = texto.includes(".");

  if (possuiVirgula && possuiPonto) {
    if (texto.lastIndexOf(",") > texto.lastIndexOf(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else {
      texto = texto.replace(/,/g, "");
    }
  } else if (possuiVirgula) {
    texto = texto.replace(",", ".");
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

function obterQuantidadeMovimentoPosto(item) {
  if (!item) return 0;

  if (item.quantidadeTextoOriginal) {
    return parseDecimalPosto(item.quantidadeTextoOriginal);
  }

  const quantidade = Number(item.quantidade || 0);
  if (!Number.isFinite(quantidade)) return 0;

  // Corrige lancamentos antigos de abastecimento salvos com a quantidade em milhar.
  if (item.modo === "abastecimento" && Number.isInteger(quantidade) && quantidade >= 1000) {
    return quantidade / 1000;
  }

  return quantidade;
}

function obterJanelaOperacionalPosto(referencia = new Date()) {
  const base = new Date(referencia);
  const inicio = new Date(base);
  inicio.setHours(6, 0, 0, 0);

  if (base < inicio) {
    inicio.setDate(inicio.getDate() - 1);
  }

  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return { inicio, fim };
}

function obterTimestampRegistroPosto(item) {
  if (item?.criadoEm) return Number(item.criadoEm);
  if (!item?.data) return 0;
  const hora = item.hora || "00:00";
  return new Date(`${item.data}T${hora}:00`).getTime() || 0;
}

function limitarNumeroInteiroCampo(campo, maxDigitos) {
  if (!campo) return;
  const bruto = String(campo.value || "").replace(/\D/g, "").slice(0, maxDigitos);
  campo.value = bruto;
}

function limitarNumeroDecimalCampo(campo, maxInteiros = 5, maxDecimais = 3) {
  if (!campo) return;

  let texto = String(campo.value || "").replace(/[^\d.,]/g, "");
  const ultimoSeparador = Math.max(texto.lastIndexOf(","), texto.lastIndexOf("."));

  if (ultimoSeparador === -1) {
    campo.value = texto.replace(/[^\d]/g, "").slice(0, maxInteiros);
    return;
  }

  const parteInteira = texto.slice(0, ultimoSeparador).replace(/[^\d]/g, "").slice(0, maxInteiros);
  const parteDecimal = texto.slice(ultimoSeparador + 1).replace(/[^\d]/g, "").slice(0, maxDecimais);
  campo.value = parteDecimal ? `${parteInteira},${parteDecimal}` : `${parteInteira},`;
}

function obterUltimoContadorPorTipo(tipo) {
  const resumo = obterResumoCalculadoPosto();
  return Number(resumo.contador?.[tipo] || 0);
}

function sincronizarContadorMovimentacaoPosto() {
  const campoContador = getById("postoMovContador");
  if (!campoContador) return;

  const modo = getById("postoMovModo")?.value || "abastecimento";
  const tipo = getById("postoMovTipo")?.value || "S10";
  const quantidade = parseDecimalPosto(getById("postoMovQuantidade")?.value || 0);
  const contadorBase = obterUltimoContadorPorTipo(tipo);
  const contadorAtualizado = modo === "abastecimento"
    ? contadorBase + Math.round(Math.max(quantidade, 0) * 1000)
    : contadorBase;
  campoContador.value = formatarContadorPosto(contadorAtualizado);
  if (typeof aplicarContrasteCamposTema === "function") aplicarContrasteCamposTema();
}

function definirDataHoraAtualPosto(referencia = new Date()) {
  const agora = new Date(referencia);
  const data = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  return { data, hora };
}

function obterTurnoAtualPosto(referencia = new Date()) {
  const hora = referencia.getHours();
  return hora >= 6 && hora < 18 ? "DIA" : "NOITE";
}

function obterJanelaTurnoPosto(referencia = new Date()) {
  const base = new Date(referencia);
  const turno = obterTurnoAtualPosto(base);
  const inicio = new Date(base);

  if (turno === "DIA") {
    inicio.setHours(6, 0, 0, 0);
  } else {
    if (base.getHours() < 6) {
      inicio.setDate(inicio.getDate() - 1);
    }
    inicio.setHours(18, 0, 0, 0);
  }

  const fim = new Date(inicio);
  fim.setHours(fim.getHours() + 12);
  return { inicio, fim, turno };
}

function obterChaveTurnoPosto(referencia = new Date()) {
  const { inicio, turno } = obterJanelaTurnoPosto(referencia);
  const data = `${inicio.getFullYear()}${String(inicio.getMonth() + 1).padStart(2, "0")}${String(inicio.getDate()).padStart(2, "0")}`;
  return `${data}_${turno}`;
}

function obterReferenciaTurnoAnteriorPosto(referencia = new Date()) {
  const { inicio } = obterJanelaTurnoPosto(referencia);
  return new Date(inicio.getTime() - 60000);
}

function limparCamposPostoMovimentacao() {
  [
    "postoMovPlaca",
    "postoMovMotorista",
    "postoMovSetor",
    "postoMovQuantidade",
    "postoMovContador",
    "postoMovKm"
  ].forEach(id => {
    const campo = getById(id);
    if (campo) campo.value = "";
  });

  const tipo = getById("postoMovTipo");
  if (tipo && !tipo.value) tipo.value = "S10";
  sincronizarContadorMovimentacaoPosto();
}

function alternarHistoricoPosto(exibir) {
  const historico = getById("postoHistoryGrid");
  if (!historico) return;
  historico.classList.toggle("is-hidden", !exibir);
}

function alternarResumoPosto(exibir) {
  const resumo = getById("postoStockGrid");
  if (!resumo) return;
  resumo.classList.toggle("is-hidden", !exibir);
}

function alternarAcoesPosto(exibir) {
  const acoes = getById("postoActionsGrid");
  if (!acoes) return;
  acoes.classList.toggle("is-hidden", !exibir);
}

function alternarRelatorioPosto(exibir) {
  const relatorio = getById("postoRelatorioView");
  if (!relatorio) return;
  relatorio.classList.toggle("is-hidden", !exibir);
}

function abrirFormPostoMovimentacao(modo) {
  const movForm = getById("postoMovForm");
  const plantaoForm = getById("postoPlantaoForm");
  const titulo = getById("postoMovTitle");
  const campoModo = getById("postoMovModo");
  if (!movForm || !titulo || !campoModo) return;

  campoModo.value = modo;
  titulo.textContent = modo === "recebimento" ? "Registrar Recebimento" : "Lançar Abastecimento";
  limparCamposPostoMovimentacao();
  mostrarElemento("postoMovForm");
  ocultarElemento("postoPlantaoForm");
  alternarHistoricoPosto(false);
  alternarResumoPosto(true);
  alternarAcoesPosto(true);
  alternarRelatorioPosto(false);
  if (plantaoForm) plantaoForm.classList.add("is-hidden");
}

function cancelarFormPostoMovimentacao() {
  ocultarElemento("postoMovForm");
  limparCamposPostoMovimentacao();
  alternarHistoricoPosto(true);
  alternarResumoPosto(true);
  alternarAcoesPosto(true);
  alternarRelatorioPosto(false);
}

function limparCamposPostoPlantao() {
  [
    "postoS10EstoqueInicial", "postoS10EstoqueFinal", "postoS10ContadorInicial", "postoS10ContadorFinal",
    "postoS500EstoqueInicial", "postoS500EstoqueFinal", "postoS500ContadorInicial", "postoS500ContadorFinal",
    "postoArlaEstoqueInicial", "postoArlaEstoqueFinal", "postoArlaContadorInicial", "postoArlaContadorFinal"
  ].forEach(id => {
    const campo = getById(id);
    if (campo) campo.value = "";
  });
}

function obterPlantaoAtualPosto(plantoes = postoState.plantoes, referencia = new Date()) {
  const chaveAtual = obterChaveTurnoPosto(referencia);
  return Object.values(plantoes || {})
    .find(item => item?.plantaoChave === chaveAtual) || null;
}

function obterPlantaoAnteriorPosto(plantoes = postoState.plantoes, referencia = new Date()) {
  const chaveAtual = obterChaveTurnoPosto(referencia);
  return Object.values(plantoes || {})
    .filter(item => item?.plantaoChave !== chaveAtual)
    .sort((a, b) => Number(b.atualizadoEm || b.criadoEm || 0) - Number(a.atualizadoEm || a.criadoEm || 0))[0] || null;
}

function obterResumoCalculadoPosto(movimentacoes = postoState.movimentacoes, plantoes = postoState.plantoes, referencia = new Date()) {
  const saldo = { S10: 0, S500: 0, ARLA: 0 };
  const contador = { S10: 0, S500: 0, ARLA: 0 };
  const baseConfig = obterConfiguracaoBasePosto();
  const plantaoAtual = obterPlantaoAtualPosto(plantoes, referencia);
  const plantaoAnterior = obterPlantaoAnteriorPosto(plantoes, referencia);
  const { inicio, fim, turno } = obterJanelaTurnoPosto(referencia);

  const baseS10 = plantaoAtual?.s10
    ? { estoqueInicial: plantaoAtual.s10.estoqueInicial, contadorInicial: plantaoAtual.s10.contadorInicial }
    : produtoPlantaoTemBase(plantaoAnterior?.s10)
      ? { estoqueInicial: plantaoAnterior.s10.estoqueFinal, contadorInicial: plantaoAnterior.s10.contadorFinal }
      : obterBaseProdutoPosto(baseConfig, "S10");
  const baseS500 = plantaoAtual?.s500
    ? { estoqueInicial: plantaoAtual.s500.estoqueInicial, contadorInicial: plantaoAtual.s500.contadorInicial }
    : produtoPlantaoTemBase(plantaoAnterior?.s500)
      ? { estoqueInicial: plantaoAnterior.s500.estoqueFinal, contadorInicial: plantaoAnterior.s500.contadorFinal }
      : obterBaseProdutoPosto(baseConfig, "S500");
  const baseArla = plantaoAtual?.arla
    ? { estoqueInicial: plantaoAtual.arla.estoqueInicial, contadorInicial: plantaoAtual.arla.contadorInicial }
    : produtoPlantaoTemBase(plantaoAnterior?.arla)
      ? { estoqueInicial: plantaoAnterior.arla.estoqueFinal, contadorInicial: plantaoAnterior.arla.contadorFinal }
      : obterBaseProdutoPosto(baseConfig, "ARLA");

  saldo.S10 = Number(baseS10?.estoqueInicial ?? 0);
  saldo.S500 = Number(baseS500?.estoqueInicial ?? 0);
  saldo.ARLA = Number(baseArla?.estoqueInicial ?? 0);
  contador.S10 = Number(baseS10?.contadorInicial ?? 0);
  contador.S500 = Number(baseS500?.contadorInicial ?? 0);
  contador.ARLA = Number(baseArla?.contadorInicial ?? 0);

  Object.values(movimentacoes || {})
    .sort((a, b) => Number(a.criadoEm || 0) - Number(b.criadoEm || 0))
    .forEach(item => {
      const timestamp = obterTimestampRegistroPosto(item);
      if (timestamp < inicio.getTime() || timestamp >= fim.getTime()) return;
      const tipo = item.tipo;
      if (!POSTO_TIPOS.includes(tipo)) return;
      const quantidade = obterQuantidadeMovimentoPosto(item);
      saldo[tipo] += item.modo === "recebimento" ? quantidade : -quantidade;
      if (item.modo === "abastecimento") {
        contador[tipo] = Number(item.contador || contador[tipo] || 0);
      }
    });

  return { saldo, contador, plantaoAtual, plantaoAnterior, turnoAtual: turno };
}

function preencherCamposProdutoPlantao(prefixo, produto, resumo) {
  const baseConfig = obterConfiguracaoBasePosto();
  const plantaoAtual = resumo.plantaoAtual;
  const plantaoAnterior = resumo.plantaoAnterior;
  const mapa = {
    S10: plantaoAtual?.s10
      ? { estoqueInicial: plantaoAtual.s10.estoqueInicial, contadorInicial: plantaoAtual.s10.contadorInicial }
      : produtoPlantaoTemBase(plantaoAnterior?.s10)
        ? { estoqueInicial: plantaoAnterior.s10.estoqueFinal, contadorInicial: plantaoAnterior.s10.contadorFinal }
        : baseConfig.s10,
    S500: plantaoAtual?.s500
      ? { estoqueInicial: plantaoAtual.s500.estoqueInicial, contadorInicial: plantaoAtual.s500.contadorInicial }
      : produtoPlantaoTemBase(plantaoAnterior?.s500)
        ? { estoqueInicial: plantaoAnterior.s500.estoqueFinal, contadorInicial: plantaoAnterior.s500.contadorFinal }
        : baseConfig.s500,
    ARLA: plantaoAtual?.arla
      ? { estoqueInicial: plantaoAtual.arla.estoqueInicial, contadorInicial: plantaoAtual.arla.contadorInicial }
      : produtoPlantaoTemBase(plantaoAnterior?.arla)
        ? { estoqueInicial: plantaoAnterior.arla.estoqueFinal, contadorInicial: plantaoAnterior.arla.contadorFinal }
        : baseConfig.arla
  };
  const anterior = mapa[produto] || {};

  const campos = {
    estoqueInicial: getById(`${prefixo}EstoqueInicial`),
    estoqueFinal: getById(`${prefixo}EstoqueFinal`),
    contadorInicial: getById(`${prefixo}ContadorInicial`),
    contadorFinal: getById(`${prefixo}ContadorFinal`)
  };

  const displays = {
    estoqueInicial: getById(`${prefixo}EstoqueInicialDisplay`),
    estoqueFinal: getById(`${prefixo}EstoqueFinalDisplay`),
    contadorInicial: getById(`${prefixo}ContadorInicialDisplay`),
    contadorFinal: getById(`${prefixo}ContadorFinalDisplay`)
  };

  const valores = {
    estoqueInicial: anterior.estoqueInicial ?? 0,
    estoqueFinal: resumo.saldo[produto] ?? 0,
    contadorInicial: anterior.contadorInicial ?? 0,
    contadorFinal: resumo.contador[produto] ?? 0
  };

  if (campos.estoqueInicial) campos.estoqueInicial.value = formatarNumeroInputPosto(valores.estoqueInicial, 0);
  if (campos.contadorInicial) campos.contadorInicial.value = formatarNumeroInputPosto(valores.contadorInicial, 0);
  if (campos.estoqueFinal) campos.estoqueFinal.value = formatarNumeroInputPosto(valores.estoqueFinal, 0);
  if (campos.contadorFinal) campos.contadorFinal.value = formatarNumeroInputPosto(valores.contadorFinal, 0);

  if (displays.estoqueInicial) displays.estoqueInicial.textContent = formatarNumeroInputPosto(valores.estoqueInicial, 0);
  if (displays.contadorInicial) displays.contadorInicial.textContent = formatarNumeroInputPosto(valores.contadorInicial, 0);
  if (displays.estoqueFinal) displays.estoqueFinal.textContent = formatarNumeroInputPosto(valores.estoqueFinal, 0);
  if (displays.contadorFinal) displays.contadorFinal.textContent = formatarNumeroInputPosto(valores.contadorFinal, 0);
}

function sincronizarCamposPlantaoPosto() {
  const resumo = obterResumoCalculadoPosto();
  preencherCamposProdutoPlantao("postoS10", "S10", resumo);
  preencherCamposProdutoPlantao("postoS500", "S500", resumo);
  preencherCamposProdutoPlantao("postoArla", "ARLA", resumo);
}

function obterModoPlantaoPosto() {
  return getById("postoPlantaoModo")?.value || "fechamento";
}

function atualizarTituloPlantaoPosto() {
  const form = getById("postoPlantaoForm");
  const titulo = getById("postoPlantaoTitulo");
  const hint = getById("postoPlantaoHint");
  const submitLabel = getById("postoPlantaoSubmitLabel");
  if (!titulo || !form || !hint || !submitLabel) return;

  const resumo = obterResumoCalculadoPosto();
  const turno = resumo.turnoAtual === "DIA" ? "1º turno" : "2º turno";
  const modo = obterModoPlantaoPosto();
  const ehAbertura = modo === "abertura";
  const ehResumo = modo === "resumo";
  titulo.textContent = ehResumo ? "Plantao Atual" : (ehAbertura ? "Abrir Plantao" : "Fechar Plantao");
  hint.textContent = ehResumo
    ? `Estoque e contador registrados na abertura automatica do ${turno}.`
    : ehAbertura
      ? `Confirme a base herdada para iniciar o ${turno}.`
      : `Confira os saldos calculados do ${turno} e confirme o fechamento do plantao atual.`;
  submitLabel.textContent = ehAbertura ? "Confirmar Abertura" : "Confirmar Fechamento";
  form.classList.toggle("is-abertura", ehAbertura || ehResumo);
  form.classList.toggle("is-resumo", ehResumo);
}

function configurarCamposAutomaticosPlantaoPosto() {
  [
    "postoS10EstoqueInicial", "postoS10EstoqueFinal", "postoS10ContadorInicial", "postoS10ContadorFinal",
    "postoS500EstoqueInicial", "postoS500EstoqueFinal", "postoS500ContadorInicial", "postoS500ContadorFinal",
    "postoArlaEstoqueInicial", "postoArlaEstoqueFinal", "postoArlaContadorInicial", "postoArlaContadorFinal"
  ].forEach(id => {
    const campo = getById(id);
    if (!campo) return;
    campo.readOnly = true;
    campo.classList.add("readonly-field");
    campo.tabIndex = -1;
  });
}

function abrirFormPostoPlantaoAbertura() {
  sincronizarPlantoesAutomaticosPosto(postoState.movimentacoes, postoState.plantoes, { forcar: true });
  avisoInfo("O plantão abre automaticamente às 06:00 e às 18:00.", "clock-3");
}

function abrirFormPostoPlantaoFechamento() {
  sincronizarPlantoesAutomaticosPosto(postoState.movimentacoes, postoState.plantoes, { forcar: true });
  avisoInfo("O plantão fecha automaticamente às 18:00 e às 06:00.", "clock-3");
}

function abrirResumoPlantaoPosto() {
  const campoModo = getById("postoPlantaoModo");
  if (campoModo) campoModo.value = "resumo";
  limparCamposPostoPlantao();
  mostrarElemento("postoPlantaoForm");
  ocultarElemento("postoMovForm");
  alternarHistoricoPosto(false);
  alternarResumoPosto(false);
  alternarAcoesPosto(false);
  alternarRelatorioPosto(false);
  sincronizarCamposPlantaoPosto();
  atualizarTituloPlantaoPosto();
}

function cancelarFormPostoPlantao() {
  ocultarElemento("postoPlantaoForm");
  limparCamposPostoPlantao();
  alternarHistoricoPosto(true);
  alternarResumoPosto(true);
  alternarAcoesPosto(true);
  alternarRelatorioPosto(false);
}

function validarMovimentacaoPosto(dados) {
  if (!dados.data || !dados.hora || !dados.tipo || !dados.placa || !dados.motorista || !dados.setor || !dados.quantidade || !dados.contador || !dados.km) {
    avisoValidacao("Preencha todos os campos do lançamento.");
    return false;
  }
  return true;
}

function salvarMovimentacaoPosto() {
  const botao = document.activeElement;
  const agora = definirDataHoraAtualPosto();
  const dados = {
    modo: getById("postoMovModo")?.value || "abastecimento",
    data: agora.data,
    hora: agora.hora,
    tipo: getById("postoMovTipo")?.value || "S10",
    placa: normalizarTexto(getById("postoMovPlaca")?.value || ""),
    motorista: normalizarTexto(getById("postoMovMotorista")?.value || ""),
    setor: normalizarTexto(getById("postoMovSetor")?.value || ""),
    quantidade: parseDecimalPosto(getById("postoMovQuantidade")?.value || 0),
    quantidadeTextoOriginal: String(getById("postoMovQuantidade")?.value || "").trim(),
    contador: parseContadorPosto(getById("postoMovContador")?.value || 0),
    km: Number(getById("postoMovKm")?.value || 0),
    criadoEm: Date.now()
  };

  if (!validarMovimentacaoPosto(dados)) return;

  alternarBotaoCarregando(botao, true);
  db.ref("posto_movimentacoes").push(dados)
    .then(() => {
      avisoSucesso(dados.modo === "recebimento" ? "Recebimento registrado com sucesso." : "Abastecimento registrado com sucesso.", "fuel");
      cancelarFormPostoMovimentacao();
    })
    .catch(() => avisoErro("Erro ao salvar a movimentação do posto."))
    .finally(() => alternarBotaoCarregando(botao, false, "Salvar Lançamento"));
}

function validarPlantaoPosto(dados) {
  if (!dados.data || !dados.turno) {
    avisoValidacao("Nao foi possivel identificar o turno do plantao.");
    return false;
  }

  return true;
}

function coletarProdutoPlantao(prefixo) {
  return {
    estoqueInicial: Number(getById(`${prefixo}EstoqueInicial`)?.value || 0),
    estoqueFinal: Number(getById(`${prefixo}EstoqueFinal`)?.value || 0),
    contadorInicial: Number(getById(`${prefixo}ContadorInicial`)?.value || 0),
    contadorFinal: Number(getById(`${prefixo}ContadorFinal`)?.value || 0)
  };
}

function montarProdutoPlantaoPeloResumo(resumo, tipo) {
  const estoque = Number(resumo?.saldo?.[tipo] ?? 0);
  const contador = Number(resumo?.contador?.[tipo] ?? 0);
  return {
    estoqueInicial: estoque,
    estoqueFinal: estoque,
    contadorInicial: contador,
    contadorFinal: contador
  };
}

function montarDadosPlantaoAberturaPosto(resumo, agora, referencia = new Date()) {
  const { inicio, turno } = obterJanelaTurnoPosto(referencia);
  const plantaoChave = obterChaveTurnoPosto(referencia);
  return {
    plantaoChave,
    data: agora.data,
    porteiro: OPERADOR_POSTO_PADRAO,
    turno,
    s10: montarProdutoPlantaoPeloResumo(resumo, "S10"),
    s500: montarProdutoPlantaoPeloResumo(resumo, "S500"),
    arla: montarProdutoPlantaoPeloResumo(resumo, "ARLA"),
    criadoEm: inicio.getTime(),
    atualizadoEm: inicio.getTime(),
    status: "ABERTO"
  };
}

function montarDadosPlantaoFechamentoPosto(resumo, agora, plantaoAtual, referencia = new Date()) {
  const { fim, turno } = obterJanelaTurnoPosto(referencia);
  const plantaoChave = obterChaveTurnoPosto(referencia);
  return {
    plantaoChave,
    data: agora.data,
    porteiro: OPERADOR_POSTO_PADRAO,
    turno,
    s10: {
      estoqueInicial: Number(plantaoAtual?.s10?.estoqueInicial ?? resumo?.saldo?.S10 ?? 0),
      estoqueFinal: Number(resumo?.saldo?.S10 ?? 0),
      contadorInicial: Number(plantaoAtual?.s10?.contadorInicial ?? resumo?.contador?.S10 ?? 0),
      contadorFinal: Number(resumo?.contador?.S10 ?? 0)
    },
    s500: {
      estoqueInicial: Number(plantaoAtual?.s500?.estoqueInicial ?? resumo?.saldo?.S500 ?? 0),
      estoqueFinal: Number(resumo?.saldo?.S500 ?? 0),
      contadorInicial: Number(plantaoAtual?.s500?.contadorInicial ?? resumo?.contador?.S500 ?? 0),
      contadorFinal: Number(resumo?.contador?.S500 ?? 0)
    },
    arla: {
      estoqueInicial: Number(plantaoAtual?.arla?.estoqueInicial ?? resumo?.saldo?.ARLA ?? 0),
      estoqueFinal: Number(resumo?.saldo?.ARLA ?? 0),
      contadorInicial: Number(plantaoAtual?.arla?.contadorInicial ?? resumo?.contador?.ARLA ?? 0),
      contadorFinal: Number(resumo?.contador?.ARLA ?? 0)
    },
    criadoEm: plantaoAtual?.criadoEm || obterJanelaTurnoPosto(referencia).inicio.getTime(),
    atualizadoEm: fim.getTime(),
    status: "FECHADO"
  };
}

function formatarResumoPlantaoPosto(resumo) {
  return POSTO_TIPOS
    .map(tipo => `${tipo}: ${formatarEstoquePosto(resumo?.saldo?.[tipo] ?? 0)} / ${formatarContadorPosto(resumo?.contador?.[tipo] ?? 0)}`)
    .join(" • ");
}

function construirAssinaturaAutoSyncPosto(movimentacoes = postoState.movimentacoes, plantoes = postoState.plantoes, referencia = new Date()) {
  const chaveAtual = obterChaveTurnoPosto(referencia);
  const chaveAnterior = obterChaveTurnoPosto(obterReferenciaTurnoAnteriorPosto(referencia));
  return [
    chaveAtual,
    chaveAnterior,
    Object.keys(movimentacoes || {}).length,
    Object.keys(plantoes || {}).length,
    plantoes?.[chaveAtual]?.status || "",
    plantoes?.[chaveAnterior]?.status || ""
  ].join("|");
}

function sincronizarPlantoesAutomaticosPosto(movimentacoes = postoState.movimentacoes, plantoes = postoState.plantoes, { forcar = false } = {}) {
  if (postoAutoSyncPromise) return postoAutoSyncPromise;

  const referenciaAtual = new Date();
  const referenciaAnterior = obterReferenciaTurnoAnteriorPosto(referenciaAtual);
  const assinatura = construirAssinaturaAutoSyncPosto(movimentacoes, plantoes, referenciaAtual);
  if (!forcar && assinatura === postoUltimaChaveSincronizada) {
    return Promise.resolve(false);
  }

  const resumoAtual = obterResumoCalculadoPosto(movimentacoes, plantoes, referenciaAtual);
  const resumoAnterior = obterResumoCalculadoPosto(movimentacoes, plantoes, referenciaAnterior);
  const plantaoAtual = obterPlantaoAtualPosto(plantoes, referenciaAtual);
  const plantaoAnterior = obterPlantaoAtualPosto(plantoes, referenciaAnterior);
  const atualData = definirDataHoraAtualPosto(obterJanelaTurnoPosto(referenciaAtual).inicio);
  const anteriorData = definirDataHoraAtualPosto(obterJanelaTurnoPosto(referenciaAnterior).inicio);
  const atualDesejado = montarDadosPlantaoAberturaPosto(resumoAtual, atualData, referenciaAtual);
  const anteriorDesejado = montarDadosPlantaoFechamentoPosto(resumoAnterior, anteriorData, plantaoAnterior, referenciaAnterior);
  const updates = {};

  if (!plantaoAnterior || plantaoAnterior.status !== "FECHADO") {
    updates[anteriorDesejado.plantaoChave] = anteriorDesejado;
  }

  if (!plantaoAtual) {
    updates[atualDesejado.plantaoChave] = atualDesejado;
  }

  if (!Object.keys(updates).length) {
    postoUltimaChaveSincronizada = assinatura;
    return Promise.resolve(false);
  }

  postoAutoSyncPromise = db.ref("posto_plantoes").update(updates)
    .then(() => {
      postoUltimaChaveSincronizada = "";
      return true;
    })
    .catch(() => false)
    .finally(() => {
      postoAutoSyncPromise = null;
    });

  return postoAutoSyncPromise;
}

function salvarPlantaoPostoLegado() {
  const botao = document.activeElement;
  const agora = definirDataHoraAtualPosto();
  const resumo = obterResumoCalculadoPosto();
  const plantaoAtual = resumo.plantaoAtual;
  const plantaoChave = obterChaveTurnoPosto();
  const dados = {
    plantaoChave,
    data: agora.data,
    porteiro: OPERADOR_POSTO_PADRAO,
    turno: obterTurnoAtualPosto(),
    s10: coletarProdutoPlantao("postoS10"),
    s500: coletarProdutoPlantao("postoS500"),
    arla: coletarProdutoPlantao("postoArla"),
    criadoEm: plantaoAtual?.criadoEm || Date.now(),
    atualizadoEm: Date.now(),
    status: plantaoAtual ? "FECHADO" : "ABERTO"
  };

  if (!validarPlantaoPosto(dados)) return;

  alternarBotaoCarregando(botao, true);
  db.ref(`posto_plantoes/${plantaoChave}`).set(dados)
    .then(() => {
      avisoSucesso("Plantão do posto salvo com sucesso.", "clipboard-check");
      sincronizarCamposPlantaoPosto();
      atualizarTituloPlantaoPosto();
    })
    .catch(() => avisoErro("Erro ao salvar o plantão do posto."))
    .finally(() => alternarBotaoCarregando(botao, false, "Salvar Plantão"));
}

function salvarPlantaoPosto() {
  const botao = document.activeElement;
  const agora = definirDataHoraAtualPosto();
  const resumo = obterResumoCalculadoPosto();
  const plantaoAtual = resumo.plantaoAtual;
  const plantaoAberto = obterPlantaoAbertoPosto();
  const plantaoChave = obterChaveTurnoPosto();
  const modo = obterModoPlantaoPosto();

  if (modo === "abertura" && plantaoAtual) {
    avisoValidacao("O plantao deste turno ja foi iniciado.");
    return;
  }

  if (modo === "fechamento" && !plantaoAberto) {
    avisoValidacao("Nao existe plantao aberto para este turno.");
    return;
  }

  const dados = {
    plantaoChave,
    data: agora.data,
    porteiro: OPERADOR_POSTO_PADRAO,
    turno: obterTurnoAtualPosto(),
    s10: coletarProdutoPlantao("postoS10"),
    s500: coletarProdutoPlantao("postoS500"),
    arla: coletarProdutoPlantao("postoArla"),
    criadoEm: plantaoAtual?.criadoEm || Date.now(),
    atualizadoEm: Date.now(),
    status: modo === "abertura" ? "ABERTO" : "FECHADO"
  };

  if (!validarPlantaoPosto(dados)) return;

  alternarBotaoCarregando(botao, true);
  db.ref(`posto_plantoes/${plantaoChave}`).set(dados)
    .then(() => {
      avisoSucesso(
        modo === "abertura" ? "Plantao aberto com sucesso." : "Plantao fechado com sucesso.",
        "clipboard-check"
      );
      sincronizarCamposPlantaoPosto();
      atualizarTituloPlantaoPosto();
      cancelarFormPostoPlantao();
    })
    .catch(() => avisoErro("Erro ao salvar o plantÃ£o do posto."))
    .finally(() => alternarBotaoCarregando(
      botao,
      false,
      modo === "abertura" ? "Confirmar Abertura" : "Confirmar Fechamento"
    ));
}

function renderMovimentacoesPosto(registros) {
  const container = getById("listaPostoMovimentacoes");
  if (!container) return;
  limparConteudoElemento(container);
  const tabela = container.closest(".posto-table");

  const { inicio, fim } = obterJanelaOperacionalPosto();
  const lista = Object.values(registros || {})
    .filter(item => {
      if (item.modo !== "abastecimento") return false;
      const timestamp = obterTimestampRegistroPosto(item);
      return timestamp >= inicio.getTime() && timestamp < fim.getTime();
    })
    .sort((a, b) => Number(a.criadoEm || 0) - Number(b.criadoEm || 0));

  if (tabela) {
    tabela.classList.toggle("is-empty", !lista.length);
  }

  if (!lista.length) {
    const empty = document.createElement("div");
    empty.className = "empilhadeira-table-empty posto-table-empty";
    empty.textContent = "Nenhum abastecimento registrado no dia operacional atual.";
    container.appendChild(empty);
    return;
  }

  lista.forEach(item => {
    const row = document.createElement("div");
    row.className = "empilhadeira-table-row posto-table-row";
    row.innerHTML = `
      <span data-label="Data">${escaparHtml(formatarDataISOParaBR(item.data) || item.data || "-")}</span>
      <span data-label="Horário">${escaparHtml(item.hora || "-")}</span>
      <span data-label="Placa">${escaparHtml(item.placa || "-")}</span>
      <span data-label="Motorista">${escaparHtml(item.motorista || "-")}</span>
      <span data-label="Setor">${escaparHtml(item.setor || "-")}</span>
      <span data-label="Qtde (L)">${escaparHtml(formatarNumeroPosto(obterQuantidadeMovimentoPosto(item), "L", 3))}</span>
      <span data-label="Contador">${escaparHtml(formatarContadorPosto(item.contador || 0))}</span>
      <span data-label="Tipo">${escaparHtml(item.tipo || "-")}</span>
    `;
    container.appendChild(row);
  });
}

function obterPlantaoAbertoPosto(plantoes = postoState.plantoes) {
  const registroAtual = obterPlantaoAtualPosto(plantoes);
  return registroAtual?.status === "ABERTO" ? registroAtual : null;
}

function ajustarTabelaMovimentacoesPostoMobile() {
  const container = getById("listaPostoMovimentacoes");
  if (!container) return;

  const classes = [
    "posto-col-data",
    "posto-col-hora",
    "posto-col-placa",
    "posto-col-motorista",
    "posto-col-setor",
    "posto-col-qtde",
    "posto-col-contador",
    "posto-col-tipo"
  ];

  [...container.querySelectorAll(".posto-table-row")].forEach(row => {
    const spans = [...row.querySelectorAll(":scope > span")];
    spans.forEach((span, index) => {
      if (classes[index]) {
        span.classList.add(classes[index]);
      }
    });

    if (row.querySelector(".posto-row-toggle")) return;

    const valores = {
      data: spans[0]?.textContent?.trim() || "-",
      hora: spans[1]?.textContent?.trim() || "-",
      motorista: spans[3]?.textContent?.trim() || "-",
      setor: spans[4]?.textContent?.trim() || "-",
      contador: spans[6]?.textContent?.trim() || "-",
      tipo: spans[7]?.textContent?.trim() || "-"
    };

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "posto-row-toggle posto-col-acao";
    toggle.textContent = "Ver";
    toggle.setAttribute("aria-expanded", "false");

    const details = document.createElement("div");
    details.className = "posto-row-details";
    details.hidden = true;
    details.innerHTML = `
      <div class="posto-row-detail"><small>Data</small><strong>${escaparHtml(valores.data)}</strong></div>
      <div class="posto-row-detail"><small>Horario</small><strong>${escaparHtml(valores.hora)}</strong></div>
      <div class="posto-row-detail"><small>Motorista</small><strong>${escaparHtml(valores.motorista)}</strong></div>
      <div class="posto-row-detail"><small>Setor</small><strong>${escaparHtml(valores.setor)}</strong></div>
      <div class="posto-row-detail"><small>Contador</small><strong>${escaparHtml(valores.contador)}</strong></div>
      <div class="posto-row-detail"><small>Tipo</small><strong>${escaparHtml(valores.tipo)}</strong></div>
    `;

    toggle.addEventListener("click", () => {
      const aberto = row.classList.toggle("is-expanded");
      details.hidden = !aberto;
      toggle.setAttribute("aria-expanded", aberto ? "true" : "false");
      toggle.textContent = aberto ? "Ocultar" : "Ver";
    });

    row.appendChild(toggle);
    row.appendChild(details);
  });
}

function renderPlantoesPosto(registros) {
  const container = getById("listaPostoPlantoes");
  if (!container) return;
  limparConteudoElemento(container);

  const lista = Object.values(registros || {})
    .sort((a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0))
    .slice(0, 6);

  if (!lista.length) {
    const empty = document.createElement("div");
    empty.className = "empilhadeira-table-empty";
    empty.textContent = "Nenhum plantão registrado até o momento.";
    container.appendChild(empty);
    return;
  }

  lista.forEach(item => {
    const row = document.createElement("div");
    row.className = "empilhadeira-table-row posto-table-row posto-table-row--plantao";
    row.innerHTML = `
      <span>${escaparHtml(formatarDataISOParaBR(item.data) || item.data || "-")}</span>
      <span>${escaparHtml(item.turno || "-")}</span>
      <span>${escaparHtml(item.porteiro || "-")}</span>
      <span>${escaparHtml(formatarEstoquePosto(item.s10?.estoqueFinal || 0))}</span>
      <span>${escaparHtml(formatarEstoquePosto(item.s500?.estoqueFinal || 0))}</span>
      <span>${escaparHtml(formatarEstoquePosto(item.arla?.estoqueFinal || 0))}</span>
    `;
    container.appendChild(row);
  });
}

function atualizarResumoPosto(movimentacoes = {}, plantoes = {}) {
  const resumo = obterResumoCalculadoPosto(movimentacoes, plantoes);
  const saldo = resumo.saldo;
  const contador = resumo.contador;

  POSTO_TIPOS.forEach(tipo => {
    const refs = POSTO_PRODUTOS[tipo];
    const estoqueEl = getById(refs.estoque);
    const contadorEl = getById(refs.contador);
    if (estoqueEl) estoqueEl.textContent = formatarEstoquePosto(Math.max(saldo[tipo], 0));
    if (contadorEl) contadorEl.textContent = formatarContadorPosto(contador[tipo]);
  });

  sincronizarCamposPlantaoPosto();
  sincronizarContadorMovimentacaoPosto();
  if (typeof aplicarContrasteCamposTema === "function") aplicarContrasteCamposTema();
}

function obterMovimentosDiaOperacionalPosto(modo) {
  const { inicio, fim } = obterJanelaOperacionalPosto();
  return Object.values(postoState.movimentacoes || {})
    .filter(item => {
      if (modo && item.modo !== modo) return false;
      const timestamp = obterTimestampRegistroPosto(item);
      return timestamp >= inicio.getTime() && timestamp < fim.getTime();
    })
    .sort((a, b) => Number(a.criadoEm || 0) - Number(b.criadoEm || 0));
}

function obterBasesPlantaoRelatorioPosto() {
  const baseConfig = obterConfiguracaoBasePosto();
  const plantaoAtual = obterPlantaoAtualPosto();
  const plantaoAnterior = obterPlantaoAnteriorPosto();
  const resolver = produto => {
    const atual = plantaoAtual?.[produto.toLowerCase()];
    const anterior = plantaoAnterior?.[produto.toLowerCase()];
    const base = obterBaseProdutoPosto(baseConfig, produto);
    if (atual) return { inicial: atual.estoqueInicial, contadorInicial: atual.contadorInicial, final: atual.estoqueFinal, contadorFinal: atual.contadorFinal };
    if (produtoPlantaoTemBase(anterior)) {
      return {
        inicial: anterior.estoqueFinal,
        contadorInicial: anterior.contadorFinal,
        final: anterior.estoqueFinal,
        contadorFinal: anterior.contadorFinal
      };
    }
    return {
      inicial: base?.estoqueInicial || 0,
      contadorInicial: base?.contadorInicial || 0,
      final: base?.estoqueInicial || 0,
      contadorFinal: base?.contadorInicial || 0
    };
  };

  return {
    S10: resolver("S10"),
    S500: resolver("S500"),
    ARLA: resolver("ARLA")
  };
}

function montarLinhasRelatorioPosto(lista, tipo) {
  const linhas = lista.map(item => {
    const base = [
      `<div class="posto-relatorio-cell">${escaparHtml(formatarDataISOParaBR(item.data) || item.data || "-")}</div>`,
      `<div class="posto-relatorio-cell">${escaparHtml(item.hora || "-")}</div>`,
      `<div class="posto-relatorio-cell">${escaparHtml(item.placa || "-")}</div>`,
      `<div class="posto-relatorio-cell posto-relatorio-cell--left posto-relatorio-span-2">${escaparHtml(item.motorista || "-")}</div>`
    ];

    if (tipo === "entrada") {
      base.push(
        `<div class="posto-relatorio-cell posto-relatorio-span-2">${escaparHtml(formatarNumeroPosto(obterQuantidadeMovimentoPosto(item), "L", 3))}</div>`,
        `<div class="posto-relatorio-cell posto-relatorio-span-3">${escaparHtml(formatarContadorPosto(item.contador || 0))}</div>`,
        `<div class="posto-relatorio-cell posto-relatorio-span-2">${escaparHtml(item.tipo || "-")}</div>`
      );
    } else {
      base.push(
        `<div class="posto-relatorio-cell posto-relatorio-cell--left posto-relatorio-span-2">${escaparHtml(item.setor || "-")}</div>`,
        `<div class="posto-relatorio-cell">${escaparHtml(formatarNumeroPosto(obterQuantidadeMovimentoPosto(item), "L", 3))}</div>`,
        `<div class="posto-relatorio-cell posto-relatorio-span-3">${escaparHtml(formatarContadorPosto(item.contador || 0))}</div>`,
        `<div class="posto-relatorio-cell">${escaparHtml(item.tipo || "-")}</div>`
      );
    }

    return `<div class="posto-relatorio-row">${base.join("")}</div>`;
  });

  return linhas.join("");
}

function montarRelatorioPostoHtml() {
  const emissao = new Date();
  const bases = obterBasesPlantaoRelatorioPosto();
  const resumo = obterResumoCalculadoPosto();
  const entradas = obterMovimentosDiaOperacionalPosto("recebimento");
  const saidas = obterMovimentosDiaOperacionalPosto("abastecimento");
  const turnoAtual = resumo.turnoAtual === "DIA" ? "1º TURNO" : "2º TURNO";
  const outroTurno = resumo.turnoAtual === "DIA" ? "2º TURNO" : "1º TURNO";
  const blocoEntrada = entradas.length ? `
      <div class="posto-relatorio-section-title">INFORMAÇÕES SOBRE A ENTRADA DE COMBUSTÍVEL</div>
      <div class="posto-relatorio-table posto-relatorio-table--entrada">
        <div class="posto-relatorio-row posto-relatorio-row--head">
          <div class="posto-relatorio-cell">DATA</div>
          <div class="posto-relatorio-cell">HORÁRIO</div>
          <div class="posto-relatorio-cell">PLACA</div>
          <div class="posto-relatorio-cell posto-relatorio-span-2">MOTORISTA</div>
          <div class="posto-relatorio-cell posto-relatorio-span-2">QTDE. (L)</div>
          <div class="posto-relatorio-cell posto-relatorio-span-3">CONTADOR</div>
          <div class="posto-relatorio-cell posto-relatorio-span-2">TIPO</div>
        </div>
        ${montarLinhasRelatorioPosto(entradas, "entrada")}
      </div>
  ` : "";
  const blocoSaida = saidas.length ? `
      <div class="posto-relatorio-section-title">INFORMAÇÕES SOBRE A SAÍDA DE COMBUSTÍVEL</div>
      <div class="posto-relatorio-table posto-relatorio-table--saida">
        <div class="posto-relatorio-row posto-relatorio-row--head">
          <div class="posto-relatorio-cell">DATA</div>
          <div class="posto-relatorio-cell">HORÁRIO</div>
          <div class="posto-relatorio-cell">PLACA</div>
          <div class="posto-relatorio-cell posto-relatorio-span-2">MOTORISTA</div>
          <div class="posto-relatorio-cell posto-relatorio-span-2">SETOR</div>
          <div class="posto-relatorio-cell">QTDE. (L)</div>
          <div class="posto-relatorio-cell posto-relatorio-span-3">CONTADOR</div>
          <div class="posto-relatorio-cell">TIPO</div>
        </div>
        ${montarLinhasRelatorioPosto(saidas, "saida")}
      </div>
  ` : "";

  const geralLinha = (titulo, valores = {}) => `
    <div class="posto-relatorio-row">
      <div class="posto-relatorio-cell">${titulo}</div>
      <div class="posto-relatorio-cell">${escaparHtml(valores.s10 ?? "")}</div>
      <div class="posto-relatorio-cell">${escaparHtml(valores.s500 ?? "")}</div>
      <div class="posto-relatorio-cell">${escaparHtml(valores.arla ?? "")}</div>
      <div class="posto-relatorio-cell">${titulo === "INICIAL" ? turnoAtual : outroTurno}</div>
      <div class="posto-relatorio-cell">${escaparHtml(valores.cs10 ?? "")}</div>
      <div class="posto-relatorio-cell">${escaparHtml(valores.cs500 ?? "")}</div>
      <div class="posto-relatorio-cell">${escaparHtml(valores.carla ?? "")}</div>
      <div class="posto-relatorio-cell">${titulo === "INICIAL" ? turnoAtual : outroTurno}</div>
      <div class="posto-relatorio-cell">${escaparHtml(valores.fs10 ?? "")}</div>
      <div class="posto-relatorio-cell">${escaparHtml(valores.fs500 ?? "")}</div>
      <div class="posto-relatorio-cell">${escaparHtml(valores.farla ?? "")}</div>
    </div>
  `;

  return `
    <div class="posto-relatorio-sheet">
      <div class="posto-relatorio-header">
        <div class="posto-relatorio-logo">
          <img src="imagens/logo-nortefrut.png" alt="Nortefrut">
        </div>
        <div class="posto-relatorio-title">CONTROLE DE ABASTECIMENTO</div>
        <div class="posto-relatorio-meta">
          <span>Código: CON026POR</span>
          <span>Página: 1/2</span>
          <span>Revisão: 03</span>
          <span>Data da aprovação: 20/01/2023</span>
          <span>Data de Atualização: 14/02/2025</span>
        </div>
      </div>

      <div class="posto-relatorio-section-title">INFORMAÇÕES GERAIS</div>
      <div class="posto-relatorio-table posto-relatorio-table--geral">
        <div class="posto-relatorio-row posto-relatorio-row--head">
          <div class="posto-relatorio-cell">ESTOQUE FÍSICO</div>
          <div class="posto-relatorio-cell">S-10</div>
          <div class="posto-relatorio-cell">S-500</div>
          <div class="posto-relatorio-cell">ARLA 32</div>
          <div class="posto-relatorio-cell">CONTADOR INICIAL</div>
          <div class="posto-relatorio-cell">S-10</div>
          <div class="posto-relatorio-cell">S-500</div>
          <div class="posto-relatorio-cell">ARLA 32</div>
          <div class="posto-relatorio-cell">CONTADOR FINAL</div>
          <div class="posto-relatorio-cell">S-10</div>
          <div class="posto-relatorio-cell">S-500</div>
          <div class="posto-relatorio-cell">ARLA 32</div>
        </div>
        ${geralLinha("INICIAL", {
          s10: formatarEstoquePosto(bases.S10.inicial),
          s500: formatarEstoquePosto(bases.S500.inicial),
          arla: formatarEstoquePosto(bases.ARLA.inicial),
          cs10: formatarContadorPosto(bases.S10.contadorInicial),
          cs500: formatarContadorPosto(bases.S500.contadorInicial),
          carla: formatarContadorPosto(bases.ARLA.contadorInicial)
        })}
        ${geralLinha("FINAL", {
          fs10: formatarContadorPosto(resumo.contador.S10),
          fs500: formatarContadorPosto(resumo.contador.S500),
          farla: formatarContadorPosto(resumo.contador.ARLA),
          s10: formatarEstoquePosto(resumo.saldo.S10),
          s500: formatarEstoquePosto(resumo.saldo.S500),
          arla: formatarEstoquePosto(resumo.saldo.ARLA)
        })}
      </div>

      ${blocoEntrada}
      ${blocoSaida}
    </div>
  `;
}

function renderRelatorioPosto(targetId = "postoRelatorioPreview") {
  const preview = getById(targetId);
  if (!preview) return;
  preview.innerHTML = montarRelatorioPostoHtml();
}

function renderRelatorioPostoCentral() {
  renderRelatorioPosto("postoRelatorioCentralPreview");
}

function abrirRelatorioPosto() {
  ocultarElemento("postoMovForm");
  ocultarElemento("postoPlantaoForm");
  alternarHistoricoPosto(false);
  alternarResumoPosto(false);
  alternarAcoesPosto(false);
  alternarRelatorioPosto(true);
  renderRelatorioPosto();
}

function fecharRelatorioPosto() {
  alternarRelatorioPosto(false);
  alternarHistoricoPosto(true);
  alternarResumoPosto(true);
  alternarAcoesPosto(true);
}

function imprimirRelatorioPosto() {
  const html = montarRelatorioPostoHtml();
  const win = window.open("", "_blank", "width=1280,height=900");
  if (!win) return avisoErro("Nao foi possivel abrir a impressao do relatorio.");
  win.document.write(`
    <html>
      <head>
        <title>Controle de Abastecimento</title>
        <link rel="stylesheet" href="styles.css">
        <style>body{margin:0;padding:16px;background:#fff;} .posto-relatorio-preview{padding:0;border:none;background:#fff;} </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

window.addEventListener("DOMContentLoaded", () => {
  configurarCamposAutomaticosPlantaoPosto();
  const campoContador = getById("postoMovContador");
  if (campoContador) {
    campoContador.readOnly = true;
    campoContador.classList.add("readonly-field");
    campoContador.tabIndex = -1;
  }

  getById("postoMovPlaca")?.addEventListener("input", event => {
    event.target.value = formatarPlacaPosto(event.target.value);
  });

  [
    "postoS10EstoqueInicial", "postoS10EstoqueFinal", "postoS500EstoqueInicial", "postoS500EstoqueFinal",
    "postoArlaEstoqueInicial", "postoArlaEstoqueFinal",
    "cadastroPostoS10Estoque", "cadastroPostoS500Estoque", "cadastroPostoArlaEstoque"
  ].forEach(id => {
    getById(id)?.addEventListener("input", event => limitarNumeroInteiroCampo(event.target, 5));
  });

  [
    "postoMovContador", "postoS10ContadorInicial", "postoS10ContadorFinal", "postoS500ContadorInicial", "postoS500ContadorFinal",
    "postoArlaContadorInicial", "postoArlaContadorFinal",
    "cadastroPostoS10Contador", "cadastroPostoS500Contador", "cadastroPostoArlaContador"
  ].forEach(id => {
    getById(id)?.addEventListener("input", event => limitarNumeroInteiroCampo(event.target, 9));
  });

  getById("postoMovQuantidade")?.addEventListener("input", event => {
    limitarNumeroDecimalCampo(event.target, 5, 3);
    sincronizarContadorMovimentacaoPosto();
  });
  getById("postoMovTipo")?.addEventListener("change", sincronizarContadorMovimentacaoPosto);

  let cacheMov = {};
  let cachePlantoes = {};

  db.ref("cadastros/postoConfig").on("value", snap => {
    window.postoConfigCadastro = snap.val() || {};
    atualizarResumoPosto(cacheMov, cachePlantoes);
    atualizarTituloPlantaoPosto();
    sincronizarPlantoesAutomaticosPosto(cacheMov, cachePlantoes, { forcar: true });
  });

  db.ref("posto_movimentacoes").on("value", snap => {
    cacheMov = snap.val() || {};
    postoState.movimentacoes = cacheMov;
    renderMovimentacoesPosto(cacheMov);
    ajustarTabelaMovimentacoesPostoMobile();
    atualizarResumoPosto(cacheMov, cachePlantoes);
    sincronizarPlantoesAutomaticosPosto(cacheMov, cachePlantoes);
  });

  db.ref("posto_plantoes").on("value", snap => {
    cachePlantoes = snap.val() || {};
    postoState.plantoes = cachePlantoes;
    renderPlantoesPosto(cachePlantoes);
    atualizarResumoPosto(cacheMov, cachePlantoes);
    atualizarTituloPlantaoPosto();
    sincronizarPlantoesAutomaticosPosto(cacheMov, cachePlantoes);
  });

  setInterval(() => {
    sincronizarPlantoesAutomaticosPosto(cacheMov, cachePlantoes);
  }, 60000);
});




