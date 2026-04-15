// --- Relatorios ---
function formatarDataBR(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = date.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function parseBRDate(dateStr) {
  if (!dateStr || !dateStr.includes("/")) return null;
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  return new Date(yy, mm - 1, dd);
}

function parseDateTime(dateStr, timeStr) {
  const date = parseBRDate(dateStr) || new Date(0);
  const [h = 0, m = 0, s = 0] = (timeStr && timeStr.includes(":")) ? timeStr.split(":").map(Number) : [0, 0, 0];
  date.setHours(h || 0, m || 0, s || 0, 0);
  return date;
}

function aplicarCabecalhoRelatorio(ws, titulo, periodo, color) {
  const lastColumn = String.fromCharCode(64 + ws.columns.length);
  ws.mergeCells(`A1:${lastColumn}1`);
  ws.getCell("A1").value = titulo;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells(`A2:${lastColumn}2`);
  ws.getCell("A2").value = periodo;
  ws.getCell("A2").font = { italic: true, size: 11 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  const headerRow = ws.getRow(3);
  headerRow.values = ws.columns.map(c => c.header);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 34;
  headerRow.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
}

function aplicarEstiloLinhas(ws) {
  ws.eachRow((row, i) => {
    if (i < 3) return;
    if (i > 3) row.height = 24;
    row.eachCell(cell => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
  });
}

async function exportarRelatorioVeiculosSemanal(offsetSemana = 0) {
  const snap = await db.ref("historico_viagens").once("value");
  const raw = snap.val() || {};
  const hoje = new Date();
  const day = (hoje.getDay() + 6) % 7;
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - day + (offsetSemana * 7));
  inicioSemana.setHours(0, 0, 0, 0);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);
  fimSemana.setHours(23, 59, 59, 999);

  const lista = Object.values(raw)
    .filter(i => i.dataSaida && i.dataRetorno)
    .filter(i => {
      const data = parseDateTime(i.dataSaida, i.horaSaida);
      return data >= inicioSemana && data <= fimSemana;
    })
    .sort((a, b) => parseDateTime(a.dataSaida, a.horaSaida) - parseDateTime(b.dataSaida, b.horaSaida))
    .map(i => ({
      dataSaida: i.dataSaida || "",
      horaSaida: i.horaSaida || "",
      dataRetorno: i.dataRetorno || "",
      horaRetorno: i.horaRetorno || "",
      veiculo: i.veiculo || "",
      condutor: i.condutor || "",
      destino: i.destino || "",
      kmSaida: i.kmSaida || "",
      kmRetorno: i.kmRetorno || "",
      porteiro: i.porteiro || "",
      checklistLuzes: i.checklist_luz || "",
      checklistPneus: i.checklist_pneu || "",
      checklistLimpeza: i.checklist_limp || "",
      checklistVisual: i.checklist_visual || "",
      observacoes: i.obs || ""
    }));

  if (!lista.length) {
    avisoInfo("Nenhuma viagem finalizada nesta semana.", "car-front");
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Veículos", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data Saída", key: "dataSaida", width: 14 },
    { header: "Hora Saída", key: "horaSaida", width: 12 },
    { header: "Data Retorno", key: "dataRetorno", width: 14 },
    { header: "Hora Retorno", key: "horaRetorno", width: 12 },
    { header: "Veículo", key: "veiculo", width: 30 },
    { header: "Condutor", key: "condutor", width: 22 },
    { header: "Destino", key: "destino", width: 26 },
    { header: "KM Saída", key: "kmSaida", width: 12 },
    { header: "KM Retorno", key: "kmRetorno", width: 12 },
    { header: "Porteiro", key: "porteiro", width: 18 },
    { header: "Buzina/Ar Condicionado", key: "checklistLuzes", width: 13 },
    { header: "Farol/Luzes", key: "checklistPneus", width: 11 },
    { header: "Lataria/Retrovisores", key: "checklistLimpeza", width: 13 },
    { header: "Limpeza/Pneus", key: "checklistVisual", width: 12 },
    { header: "Observações", key: "observacoes", width: 30 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - VEÍCULOS (SEMANAL)", `Período: ${formatarDataBR(inicioSemana)} até ${formatarDataBR(fimSemana)}`, "FF2E7D32");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), offsetSemana === -1 ? "Relatorio_Veiculos_Semana_Passada.xlsx" : "Relatorio_Veiculos_Semana_Atual.xlsx");
}

async function exportarRelatorioAgendamentosMensal(offsetMes = 0) {
  const [snapAtivos, snapHistorico] = await Promise.all([
    db.ref("agendamentos_veiculos").once("value"),
    db.ref("historico_agendamentos").once("value")
  ]);
  const ativos = snapAtivos.val() || {};
  const historico = snapHistorico.val() || {};
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes, 1);
  inicioMes.setHours(0, 0, 0, 0);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes + 1, 0);
  fimMes.setHours(23, 59, 59, 999);

  const lista = [...Object.values(ativos), ...Object.values(historico)]
    .filter(i => {
      const data = i.data ? new Date(`${i.data}T00:00:00`) : parseBRDate(i.data);
      return data && data >= inicioMes && data <= fimMes;
    })
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`))
    .map(i => ({
      data: formatarDataISOParaBR(i.data) || i.data || "",
      hora: i.hora || "",
      local: i.local || i.destino || "",
      veiculo: i.veiculo || "",
      condutor: i.quem || i.condutor || "",
      status: i.status || "ATIVO"
    }));

  if (!lista.length) {
    avisoInfo("Nenhum agendamento neste mês.", "calendar-days");
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Agendamentos", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data", key: "data", width: 14 },
    { header: "Hora", key: "hora", width: 12 },
    { header: "Local", key: "local", width: 28 },
    { header: "Veículo", key: "veiculo", width: 30 },
    { header: "Condutor", key: "condutor", width: 24 },
    { header: "Status", key: "status", width: 16 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - AGENDAMENTOS (MENSAL)", `Período: ${formatarDataBR(inicioMes)} até ${formatarDataBR(fimMes)}`, "FF1565C0");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), offsetMes === -1 ? "Relatorio_Agendamentos_Mes_Passado.xlsx" : "Relatorio_Agendamentos_Mes_Atual.xlsx");
}

async function exportarRelatorioEmpilhadeirasMensal(offsetMes = 0) {
  const snap = await db.ref("abastecimentos").once("value");
  const raw = snap.val() || {};
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes, 1);
  inicioMes.setHours(0, 0, 0, 0);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes + 1, 0);
  fimMes.setHours(23, 59, 59, 999);

  const lista = Object.values(raw)
    .filter(i => {
      const data = parseBRDate(i.data);
      return data && data >= inicioMes && data <= fimMes;
    })
    .map(i => ({ data: i.data || "", empilhadeira: i.num || "", motorista: i.motorista || "", porteiro: i.porteiro || "" }));

  if (!lista.length) {
    avisoInfo("Nenhum registro de empilhadeiras neste mês.", "forklift");
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Empilhadeiras", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data", key: "data", width: 14 },
    { header: "Nº Empilhadeira", key: "empilhadeira", width: 16 },
    { header: "Motorista", key: "motorista", width: 22 },
    { header: "Porteiro", key: "porteiro", width: 18 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - EMPILHADEIRAS (MENSAL)", `Período: ${formatarDataBR(inicioMes)} até ${formatarDataBR(fimMes)}`, "FF455A64");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), offsetMes === -1 ? "Relatorio_Empilhadeiras_Mes_Passado.xlsx" : "Relatorio_Empilhadeiras_Mes_Atual.xlsx");
}

async function exportarRelatorioChavesMensal(offsetMes = 0) {
  const snapHist = await db.ref("historico_chaves").once("value");
  const snapAtivas = await db.ref("chaves_em_uso").once("value");
  const historico = snapHist.val() || {};
  const ativas = snapAtivas.val() || {};
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes, 1);
  inicioMes.setHours(0, 0, 0, 0);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes + 1, 0);
  fimMes.setHours(23, 59, 59, 999);

  const lista = [];
  Object.values(ativas).forEach(c => {
    const dt = parseBRDate(c.dataRetirada);
    if (!dt || dt < inicioMes || dt > fimMes) return;
    lista.push({ dataRetirada: c.dataRetirada || "", horaRetirada: c.horaRetirada || "", numero: c.num || "", sala: c.sala || "", retirou: c.quem || "", porteiro: c.porteiro || "", dataDev: "", horaDev: "", status: "EM USO" });
  });
  Object.values(historico).forEach(c => {
    const dt = parseBRDate(c.dataRetirada);
    if (!dt || dt < inicioMes || dt > fimMes) return;
    lista.push({ dataRetirada: c.dataRetirada || "", horaRetirada: c.horaRetirada || "", numero: c.num || "", sala: c.sala || "", retirou: c.quem || "", porteiro: c.porteiro || "", dataDev: c.dataDevolucao || "", horaDev: c.horaDevolucao || "", status: "DEVOLVIDO" });
  });

  if (!lista.length) {
    avisoInfo("Nenhum registro de chaves neste mês.", "key-round");
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Chaves", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data Retirada", key: "dataRetirada", width: 14 },
    { header: "Hora Retirada", key: "horaRetirada", width: 12 },
    { header: "Nº Chave", key: "numero", width: 18 },
    { header: "Sala / Setor", key: "sala", width: 34 },
    { header: "Quem Retirou", key: "retirou", width: 22 },
    { header: "Porteiro Retirada", key: "porteiro", width: 20 },
    { header: "Data Devolução", key: "dataDev", width: 16 },
    { header: "Hora Devolução", key: "horaDev", width: 16 },
    { header: "Status", key: "status", width: 12 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - CONTROLE DE CHAVES (MENSAL)", `Período: ${formatarDataBR(inicioMes)} até ${formatarDataBR(fimMes)}`, "FF0288D1");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), offsetMes === -1 ? "Relatorio_Chaves_Mes_Passado.xlsx" : "Relatorio_Chaves_Mes_Atual.xlsx");
}

async function exportarRelatorioGuardaMensal(offsetMes = 0) {
  const snapAtivos = await db.ref("guardachuvas_em_uso").once("value");
  const snapHist = await db.ref("historico_guardachuvas").once("value");
  const ativos = snapAtivos.val() || {};
  const historico = snapHist.val() || {};
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes, 1);
  inicioMes.setHours(0, 0, 0, 0);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes + 1, 0);
  fimMes.setHours(23, 59, 59, 999);

  const lista = [];
  Object.values(ativos).forEach(g => {
    const dt = parseBRDate(g.dataRetirada);
    if (!dt || dt < inicioMes || dt > fimMes) return;
    lista.push({ dataRetirada: g.dataRetirada || "", horaRetirada: g.horaRetirada || "", numero: g.numero || "", retirou: g.quem || "", setor: g.setor || "", porteiro: g.porteiro || "", dataDevolucao: "", horaDevolucao: "", status: "EM USO" });
  });
  Object.values(historico).forEach(g => {
    const dt = parseBRDate(g.dataRetirada);
    if (!dt || dt < inicioMes || dt > fimMes) return;
    lista.push({ dataRetirada: g.dataRetirada || "", horaRetirada: g.horaRetirada || "", numero: g.numero || "", retirou: g.quem || "", setor: g.setor || "", porteiro: g.porteiro || "", dataDevolucao: g.dataDevolucao || "", horaDevolucao: g.horaDevolucao || "", status: "DEVOLVIDO" });
  });

  if (!lista.length) {
    avisoInfo("Nenhum registro de guarda-chuva neste mês.", "umbrella");
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Guarda-Chuva", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data Retirada", key: "dataRetirada", width: 14 },
    { header: "Hora Retirada", key: "horaRetirada", width: 14 },
    { header: "Nº Patrimônio", key: "numero", width: 16 },
    { header: "Quem Retirou", key: "retirou", width: 22 },
    { header: "Setor", key: "setor", width: 18 },
    { header: "Porteiro", key: "porteiro", width: 18 },
    { header: "Data Devolução", key: "dataDevolucao", width: 14 },
    { header: "Hora Devolução", key: "horaDevolucao", width: 14 },
    { header: "Status", key: "status", width: 12 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - CONTROLE DE GUARDA-CHUVA (MENSAL)", `Período: ${formatarDataBR(inicioMes)} até ${formatarDataBR(fimMes)}`, "FF546E7A");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), offsetMes === -1 ? "Relatorio_GuardaChuva_Mes_Passado.xlsx" : "Relatorio_GuardaChuva_Mes_Atual.xlsx");
}

async function exportarRelatorioJogosMensal(offsetMes = 0) {
  const snapAtivos = await db.ref("jogos_em_uso").once("value");
  const snapHist = await db.ref("historico_jogos").once("value");
  const ativos = snapAtivos.val() || {};
  const historico = snapHist.val() || {};
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes, 1);
  inicioMes.setHours(0, 0, 0, 0);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes + 1, 0);
  fimMes.setHours(23, 59, 59, 999);

  const lista = [];
  Object.values(ativos).forEach(j => {
    const dt = parseBRDate(j.data);
    if (!dt || dt < inicioMes || dt > fimMes) return;
    lista.push({ dataRetirada: j.data || "", horaRetirada: j.hora || "", jogo: j.jogo || "", funcionario: j.funcionario || "", autorizador: j.autorizador || "", dataDevolucao: "", horaDevolucao: "", status: "EM USO" });
  });
  Object.values(historico).forEach(j => {
    const dt = parseBRDate(j.data);
    if (!dt || dt < inicioMes || dt > fimMes) return;
    lista.push({ dataRetirada: j.data || "", horaRetirada: j.hora || "", jogo: j.jogo || "", funcionario: j.funcionario || "", autorizador: j.autorizador || "", dataDevolucao: j.dataDevolucao || "", horaDevolucao: j.horaDevolucao || "", status: "DEVOLVIDO" });
  });

  if (!lista.length) {
    avisoInfo("Nenhum registro de jogos neste mês.", "gamepad-2");
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jogos", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data Retirada", key: "dataRetirada", width: 14 },
    { header: "Hora Retirada", key: "horaRetirada", width: 14 },
    { header: "Jogo", key: "jogo", width: 26 },
    { header: "Funcionário", key: "funcionario", width: 22 },
    { header: "Autorizador", key: "autorizador", width: 22 },
    { header: "Data Devolução", key: "dataDevolucao", width: 14 },
    { header: "Hora Devolução", key: "horaDevolucao", width: 14 },
    { header: "Status", key: "status", width: 12 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - CONTROLE DE JOGOS (MENSAL)", `Período: ${formatarDataBR(inicioMes)} até ${formatarDataBR(fimMes)}`, "FF7B1FA2");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), offsetMes === -1 ? "Relatorio_Jogos_Mes_Passado.xlsx" : "Relatorio_Jogos_Mes_Atual.xlsx");
}

const relatoriosState = {
  veiculosEmUso: {},
  agendamentosAtivos: {},
  chavesEmUso: {},
  jogosEmUso: {},
  guardasEmUso: {},
  abastecimentos: {}
};

function isHojeBR(dateStr) {
  return dateStr === new Date().toLocaleDateString("pt-BR");
}

function isHojeISO(dateStr) {
  if (!dateStr) return false;
  const hoje = new Date();
  const isoHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  return dateStr === isoHoje;
}

function criarBotaoPainel(texto, nav, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "botao relatorio relatorio-menu report-link-button";
  button.dataset.nav = nav;
  button.append(criarIconeLucide(icon), document.createElement("span"));
  button.querySelector("span").textContent = texto;
  return button;
}

function criarInsightRelatorio(icon, label, value, tone = "") {
  const item = document.createElement("div");
  item.className = `report-insight-item ${tone}`.trim();

  const iconWrap = document.createElement("div");
  iconWrap.className = "report-insight-icon";
  iconWrap.appendChild(criarIconeLucide(icon));

  const content = document.createElement("div");
  content.className = "report-insight-content";

  const labelEl = document.createElement("span");
  labelEl.className = "report-insight-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("strong");
  valueEl.className = "report-insight-value";
  valueEl.textContent = value;

  content.append(labelEl, valueEl);
  item.append(iconWrap, content);
  return item;
}

function renderRelatorioHero() {
  const container = getById("reportHeroCard");
  if (!container) return;
  limparConteudoElemento(container);

  const totaisAbertos =
    Object.keys(relatoriosState.veiculosEmUso).length +
    Object.keys(relatoriosState.agendamentosAtivos).length +
    Object.keys(relatoriosState.chavesEmUso).length +
    Object.keys(relatoriosState.jogosEmUso).length +
    Object.keys(relatoriosState.guardasEmUso).length;

  const proximosAgendamentos = Object.values(relatoriosState.agendamentosAtivos)
    .sort((a, b) => new Date(`${a.data}T${a.hora || "00:00"}`) - new Date(`${b.data}T${b.hora || "00:00"}`));
  const proximo = proximosAgendamentos[0];

  const badge = document.createElement("span");
  badge.className = "report-hero-badge";
  badge.textContent = "Operação agora";

  const title = document.createElement("strong");
  title.textContent = `${totaisAbertos} movimentações abertas`;

  const text = document.createElement("p");
  text.textContent = proximo
    ? `Próximo agendamento: ${proximo.veiculo || "Veículo"} em ${formatarDataISOParaBR(proximo.data) || "-"} às ${proximo.hora || "-"}.`
    : "Nenhum agendamento futuro pendente no momento.";

  container.append(badge, title, text);
}

function criarResumoRelatorioCard(rotulo, valor, apoio) {
  const card = criarCardBase("report-summary-card");
  const label = document.createElement("span");
  label.textContent = rotulo;
  const strong = document.createElement("strong");
  strong.textContent = String(valor);
  const small = document.createElement("small");
  small.textContent = apoio;
  card.append(label, strong, small);
  return card;
}

function criarGrupoRelatorioAberto(titulo, cards, vazio) {
  const group = criarCardBase("report-open-group");
  const heading = document.createElement("h4");
  heading.textContent = titulo;
  const list = criarCardBase("report-open-list");

  if (cards.length) {
    cards.forEach(card => list.appendChild(card));
  } else {
    const empty = document.createElement("p");
    empty.className = "report-open-empty";
    empty.textContent = vazio;
    list.appendChild(empty);
  }

  group.append(heading, list);
  return group;
}

function renderRelatorioPainel() {
  const container = getById("reportSummaryGrid");
  if (!container) return;
  limparConteudoElemento(container);

  renderRelatorioHero();

  const cards = [
    criarResumoRelatorioCard("Veículos na rua", Object.keys(relatoriosState.veiculosEmUso).length, "Saídas aguardando retorno"),
    criarResumoRelatorioCard("Agendamentos ativos", Object.keys(relatoriosState.agendamentosAtivos).length, "Reservas futuras registradas"),
    criarResumoRelatorioCard("Chaves em uso", Object.keys(relatoriosState.chavesEmUso).length, "Retiradas ainda abertas"),
    criarResumoRelatorioCard("Jogos em uso", Object.keys(relatoriosState.jogosEmUso).length, "Itens aguardando devolução"),
    criarResumoRelatorioCard("Guarda-chuvas", Object.keys(relatoriosState.guardasEmUso).length, "Empréstimos em aberto"),
    criarResumoRelatorioCard("Abastecimentos", Object.keys(relatoriosState.abastecimentos).length, "Registros no histórico")
  ];

  cards.forEach(card => container.appendChild(card));

  const dailyGrid = getById("reportDailyGrid");
  if (dailyGrid) {
    limparConteudoElemento(dailyGrid);
    const hojeCards = [
      criarResumoRelatorioCard(
        "Saídas hoje",
        Object.values(relatoriosState.veiculosEmUso).filter(item => isHojeBR(item.dataSaida)).length,
        "Veículos com saída registrada hoje"
      ),
      criarResumoRelatorioCard(
        "Agendados hoje",
        Object.values(relatoriosState.agendamentosAtivos).filter(item => isHojeISO(item.data)).length,
        "Reservas programadas para hoje"
      ),
      criarResumoRelatorioCard(
        "Abastecimentos hoje",
        Object.values(relatoriosState.abastecimentos).filter(item => isHojeBR(item.data)).length,
        "Registros lançados hoje"
      )
    ];
    hojeCards.forEach(card => dailyGrid.appendChild(card));
  }

  const quickLinks = getById("reportQuickLinks");
  if (quickLinks) {
    limparConteudoElemento(quickLinks);
    [
      criarBotaoPainel("Ver em aberto", "relatorioEmAberto", "clipboard-check"),
      criarBotaoPainel("Histórico de veículos", "relatorioFrota", "car-front"),
      criarBotaoPainel("Histórico de agendamentos", "relatorioAgendamentos", "calendar-days")
    ].forEach(button => quickLinks.appendChild(button));
  }

  refreshLucideIcons();
}

function criarCardVeiculoEmAberto([placa, dados]) {
  return criarCardRegistro({
    classes: "card-chave",
    titulo: placa,
    linhas: [
      { icon: "user-round", text: `Condutor: ${dados.condutor || "-"}` },
      { icon: "map-pin", text: `Destino: ${dados.destino || "-"}` },
      { icon: "calendar-days", text: `Saída: ${dados.dataSaida || "-"} às ${dados.horaSaida || "-"}` }
    ]
  });
}

const relatorioVeiculosState = {
  historico: {},
  filtros: {
    dataInicio: "",
    dataFim: "",
    veiculo: ""
  }
};

function obterDataHojeIso() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function preencherFiltroVeiculos() {
  const select = getById("reportVeiculosSelect");
  const inputInicio = getById("reportVeiculosDataInicio");
  const inputFim = getById("reportVeiculosDataFim");
  if (!select || !inputInicio || !inputFim) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="">Todos os veículos</option>';

  veiculosCadastrados.forEach(item => {
    const option = document.createElement("option");
    option.value = item.placa;
    option.textContent = `${item.nome} - ${item.placa}`;
    select.appendChild(option);
  });

  if (valorAtual) select.value = valorAtual;

  if (!inputInicio.value && !inputFim.value) {
    const hoje = obterDataHojeIso();
    inputInicio.value = hoje;
    inputFim.value = hoje;
    relatorioVeiculosState.filtros.dataInicio = hoje;
    relatorioVeiculosState.filtros.dataFim = hoje;
  }
}

function normalizarRegistroVeiculo(item) {
  const kmSaida = Number(item.kmSaida || 0);
  const kmRetorno = Number(item.kmRetorno || 0);
  return {
    dataSaida: item.dataSaida || "",
    horaSaida: item.horaSaida || "",
    dataRetorno: item.dataRetorno || "",
    horaRetorno: item.horaRetorno || "",
    veiculo: item.veiculo || item.placa || "",
    placa: item.placa || "",
    condutor: item.condutor || "",
    destino: item.destino || "",
    kmSaida: item.kmSaida || "",
    kmRetorno: item.kmRetorno || "",
    kmRodado: Number.isFinite(kmSaida) && Number.isFinite(kmRetorno) ? Math.max(0, kmRetorno - kmSaida) : 0,
    porteiro: item.porteiroRetorno || item.porteiro || "",
    checklistLuzes: item.checklist_luz || "",
    checklistPneus: item.checklist_pneu || "",
    checklistLimpeza: item.checklist_limp || "",
    checklistVisual: item.checklist_visual || "",
    observacoes: item.obs || ""
  };
}

function obterHistoricoVeiculosFiltrado() {
  const { dataInicio, dataFim, veiculo } = relatorioVeiculosState.filtros;
  const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
  const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

  const lista = Object.values(relatorioVeiculosState.historico || {})
    .map(normalizarRegistroVeiculo)
    .filter(item => item.dataSaida && item.dataRetorno)
    .filter(item => {
      const data = parseDateTime(item.dataSaida, item.horaSaida);
      const passouInicio = !inicio || data >= inicio;
      const passouFim = !fim || data <= fim;
      const passouVeiculo = !veiculo || item.placa === veiculo || item.veiculo.includes(veiculo);
      return passouInicio && passouFim && passouVeiculo;
    })
    .sort((a, b) => parseDateTime(b.dataSaida, b.horaSaida) - parseDateTime(a.dataSaida, a.horaSaida));

  const labelInicio = dataInicio ? formatarDataISOParaBR(dataInicio) : "Início livre";
  const labelFim = dataFim ? formatarDataISOParaBR(dataFim) : "Fim livre";
  const labelVeiculo = veiculo ? ` • Veículo: ${veiculo}` : " • Todos os veículos";

  return { inicio, fim, label: `Período: ${labelInicio} até ${labelFim}${labelVeiculo}`, lista };
}

function aplicarFiltrosRelatorioVeiculos() {
  const inputInicio = getById("reportVeiculosDataInicio");
  const inputFim = getById("reportVeiculosDataFim");
  const select = getById("reportVeiculosSelect");
  if (!inputInicio || !inputFim || !select) return;

  if (inputInicio.value && inputFim.value && inputInicio.value > inputFim.value) {
    avisoValidacao("A data inicial não pode ser maior que a data final.");
    return;
  }

  relatorioVeiculosState.filtros = {
    dataInicio: inputInicio.value,
    dataFim: inputFim.value,
    veiculo: select.value
  };

  renderRelatorioVeiculosResumo();
}

function renderRelatorioVeiculosResumo() {
  const summary = getById("reportVeiculosSummary");
  const insights = getById("reportVeiculosInsights");
  const period = getById("reportVeiculosPeriod");
  if (!summary || !insights || !period) return;

  preencherFiltroVeiculos();
  const { label, lista } = obterHistoricoVeiculosFiltrado();
  limparConteudoElemento(summary);
  limparConteudoElemento(insights);
  period.textContent = label;

  const kmTotal = lista.reduce((acc, item) => acc + (Number(item.kmRodado) || 0), 0);
  const viagensPorVeiculo = new Map();
  const viagensPorCondutor = new Map();

  lista.forEach(item => {
    const chaveVeiculo = item.placa || item.veiculo;
    if (chaveVeiculo) {
      viagensPorVeiculo.set(chaveVeiculo, (viagensPorVeiculo.get(chaveVeiculo) || 0) + 1);
    }
    if (item.condutor) {
      viagensPorCondutor.set(item.condutor, (viagensPorCondutor.get(item.condutor) || 0) + 1);
    }
  });

  const veiculoMaisUsado = [...viagensPorVeiculo.entries()].sort((a, b) => b[1] - a[1])[0];
  const condutorMaisAtivo = [...viagensPorCondutor.entries()].sort((a, b) => b[1] - a[1])[0];
  const veiculosSemUso = veiculosCadastrados.filter(item => !viagensPorVeiculo.has(item.placa));

  [
    criarResumoRelatorioCard("Viagens", lista.length, "Registros finalizados no período"),
    criarResumoRelatorioCard("KM rodados", kmTotal, "Soma total no recorte")
  ].forEach(card => summary.appendChild(card));

  const textosInsights = [
    criarInsightRelatorio(
      "car-front",
      "Carro Mais Usado",
      veiculoMaisUsado
        ? `${veiculoMaisUsado[0]} com ${veiculoMaisUsado[1]} viagem(ns)`
        : "Nenhum registro no período",
      "is-blue"
    ),
    criarInsightRelatorio(
      "user-round",
      "Condutor Com Mais Uso",
      condutorMaisAtivo
        ? `${condutorMaisAtivo[0]} com ${condutorMaisAtivo[1]} saída(s)`
        : "Nenhum registro no período",
      "is-green"
    )
  ];

  textosInsights.forEach(item => insights.appendChild(item));

  refreshLucideIcons();
}

async function exportarRelatorioVeiculosFiltrado() {
  const { inicio, fim, lista } = obterHistoricoVeiculosFiltrado();
  if (!lista.length) {
    avisoInfo("Nenhuma viagem finalizada para exportar nesse período.", "car-front");
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Veículos", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data Saída", key: "dataSaida", width: 14 },
    { header: "Hora Saída", key: "horaSaida", width: 12 },
    { header: "Data Retorno", key: "dataRetorno", width: 14 },
    { header: "Hora Retorno", key: "horaRetorno", width: 12 },
    { header: "Veículo", key: "veiculo", width: 30 },
    { header: "Condutor", key: "condutor", width: 22 },
    { header: "Destino", key: "destino", width: 26 },
    { header: "KM Saída", key: "kmSaida", width: 12 },
    { header: "KM Retorno", key: "kmRetorno", width: 12 },
    { header: "KM Rodado", key: "kmRodado", width: 12 },
    { header: "Porteiro", key: "porteiro", width: 18 },
    { header: "Buzina/Ar Condicionado", key: "checklistLuzes", width: 13 },
    { header: "Farol/Luzes", key: "checklistPneus", width: 11 },
    { header: "Lataria/Retrovisores", key: "checklistLimpeza", width: 13 },
    { header: "Limpeza/Pneus", key: "checklistVisual", width: 12 },
    { header: "Observações", key: "observacoes", width: 30 }
  ];
  const inicioLabel = inicio ? formatarDataBR(inicio) : "Início livre";
  const fimLabel = fim ? formatarDataBR(fim) : "Fim livre";
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - VEÍCULOS", `Período: ${inicioLabel} até ${fimLabel}`, "FF2E7D32");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "Relatorio_Veiculos_Filtrado.xlsx");
}

function preencherIntervaloPadrao(prefixo) {
  const inicio = getById(`${prefixo}DataInicio`);
  const fim = getById(`${prefixo}DataFim`);
  if (!inicio || !fim) return;
  if (!inicio.value && !fim.value) {
    const hoje = obterDataHojeIso();
    inicio.value = hoje;
    fim.value = hoje;
  }
}

function validarIntervalo(inicio, fim) {
  return !(inicio && fim && inicio > fim);
}

function formatarPeriodoLabel(dataInicio, dataFim, complemento = "") {
  const inicio = dataInicio ? formatarDataISOParaBR(dataInicio) : "Início livre";
  const fim = dataFim ? formatarDataISOParaBR(dataFim) : "Fim livre";
  return `Período: ${inicio} até ${fim}${complemento}`;
}

function filtrarPorIntervaloBR(lista, campoData, dataInicio, dataFim) {
  const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
  const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;
  return lista.filter(item => {
    const data = parseBRDate(item[campoData]);
    if (!data) return false;
    return (!inicio || data >= inicio) && (!fim || data <= fim);
  });
}

function filtrarPorIntervaloISO(lista, campoData, dataInicio, dataFim) {
  const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
  const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;
  return lista.filter(item => {
    const data = item[campoData] ? new Date(`${item[campoData]}T00:00:00`) : null;
    if (!data || Number.isNaN(data.getTime())) return false;
    return (!inicio || data >= inicio) && (!fim || data <= fim);
  });
}

function renderResumoModulo(containerId, cards) {
  const container = getById(containerId);
  if (!container) return;
  limparConteudoElemento(container);
  cards.forEach(card => container.appendChild(card));
}

function renderInsightsModulo(containerId, items) {
  const container = getById(containerId);
  if (!container) return;
  limparConteudoElemento(container);
  items.forEach(item => container.appendChild(item));
  refreshLucideIcons();
}

const relatorioAgendamentosState = { ativos: {}, historico: {}, filtros: { dataInicio: "", dataFim: "", veiculo: "" } };
const relatorioEmpilhadeirasState = { historico: {}, filtros: { dataInicio: "", dataFim: "", numero: "" } };
const relatorioChavesState = { ativas: {}, historico: {}, filtros: { dataInicio: "", dataFim: "", numero: "" } };
const relatorioGuardasState = { ativos: {}, historico: {}, filtros: { dataInicio: "", dataFim: "", numero: "" } };
const relatorioJogosState = { ativos: {}, historico: {}, filtros: { dataInicio: "", dataFim: "", jogo: "" } };
const relatorioPostoState = { filtros: { dataInicio: "", dataFim: "", modo: "", tipo: "" } };

function preencherFiltrosRelatorioPosto() {
  preencherIntervaloPadrao("reportPosto");
  const inicio = getById("reportPostoDataInicio");
  const fim = getById("reportPostoDataFim");
  const modo = getById("reportPostoModo");
  const tipo = getById("reportPostoTipo");
  if (!relatorioPostoState.filtros.dataInicio && inicio?.value) relatorioPostoState.filtros.dataInicio = inicio.value;
  if (!relatorioPostoState.filtros.dataFim && fim?.value) relatorioPostoState.filtros.dataFim = fim.value;
  if (!relatorioPostoState.filtros.modo && modo?.value) relatorioPostoState.filtros.modo = modo.value;
  if (!relatorioPostoState.filtros.tipo && tipo?.value) relatorioPostoState.filtros.tipo = tipo.value;
}

function obterIntervaloOperacionalFiltroPosto(dataInicio, dataFim) {
  const inicio = dataInicio ? new Date(`${dataInicio}T06:00:00`) : null;
  const fim = dataFim ? new Date(`${dataFim}T06:00:00`) : null;
  if (fim) fim.setDate(fim.getDate() + 1);
  return { inicio, fim };
}

function formatarPeriodoOperacionalPosto(dataInicio, dataFim, complemento = "") {
  const inicio = dataInicio ? `${formatarDataISOParaBR(dataInicio)} 06:00` : "Início livre";
  const fimData = dataFim ? new Date(`${dataFim}T06:00:00`) : null;
  if (fimData) fimData.setDate(fimData.getDate() + 1);
  const fim = fimData
    ? `${formatarDataBR(fimData)} 06:00`
    : "Fim livre";
  return `Período operacional: ${inicio} até ${fim}${complemento}`;
}

function obterMovimentacoesPostoFiltradas() {
  preencherFiltrosRelatorioPosto();
  const { dataInicio, dataFim, modo, tipo } = relatorioPostoState.filtros;
  const { inicio, fim } = obterIntervaloOperacionalFiltroPosto(dataInicio, dataFim);

  const lista = Object.values(postoState?.movimentacoes || {})
    .filter(item => {
      const timestamp = obterTimestampRegistroPosto(item);
      const passouInicio = !inicio || timestamp >= inicio.getTime();
      const passouFim = !fim || timestamp < fim.getTime();
      const passouModo = !modo || item.modo === modo;
      const passouTipo = !tipo || item.tipo === tipo;
      return passouInicio && passouFim && passouModo && passouTipo;
    })
    .sort((a, b) => parseDateTime(b.data, b.hora) - parseDateTime(a.data, a.hora));

  return { inicio, fim, lista };
}

function renderRelatorioPostoResumo() {
  preencherFiltrosRelatorioPosto();
  const { lista } = obterMovimentacoesPostoFiltradas();
  const period = getById("reportPostoPeriod");
  const { dataInicio, dataFim, modo, tipo } = relatorioPostoState.filtros;
  const modoLabel = modo ? ` • ${modo === "abastecimento" ? "Abastecimento" : "Recebimento"}` : " • Todos os movimentos";
  const tipoLabel = tipo ? ` • ${tipo}` : " • Todos os combustíveis";

  if (period) period.textContent = formatarPeriodoOperacionalPosto(dataInicio, dataFim, `${modoLabel}${tipoLabel}`);

  const porTipo = new Map();
  lista.forEach(item => {
    if (item.tipo) {
      porTipo.set(item.tipo, (porTipo.get(item.tipo) || 0) + obterQuantidadeMovimentoPosto(item));
    }
  });

  const litrosS10 = porTipo.get("S10") || 0;
  const litrosS500 = porTipo.get("S500") || 0;
  const litrosArla = porTipo.get("ARLA") || 0;

  renderResumoModulo("reportPostoSummary", [
    criarResumoRelatorioCard("S10", formatarNumeroPosto(litrosS10, "L", 3), "Volume movimentado"),
    criarResumoRelatorioCard("S500", formatarNumeroPosto(litrosS500, "L", 3), "Volume movimentado"),
    criarResumoRelatorioCard("ARLA", formatarNumeroPosto(litrosArla, "L", 3), "Volume movimentado")
  ]);

  renderInsightsModulo("reportPostoInsights", []);
}

function aplicarFiltrosRelatorioPosto() {
  const inicio = getById("reportPostoDataInicio")?.value || "";
  const fim = getById("reportPostoDataFim")?.value || "";
  if (!validarIntervalo(inicio, fim)) return avisoValidacao("A data inicial não pode ser maior que a data final.");

  relatorioPostoState.filtros = {
    dataInicio: inicio,
    dataFim: fim,
    modo: getById("reportPostoModo")?.value || "",
    tipo: getById("reportPostoTipo")?.value || ""
  };

  renderRelatorioPostoResumo();
}

function aplicarBordaCompletaCelula(cell) {
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" }
  };
}

function estilizarIntervaloPlanilha(ws, inicioLinha, fimLinha, inicioColuna, fimColuna) {
  for (let linha = inicioLinha; linha <= fimLinha; linha += 1) {
    for (let coluna = inicioColuna; coluna <= fimColuna; coluna += 1) {
      const cell = ws.getCell(linha, coluna);
      aplicarBordaCompletaCelula(cell);
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
  }
}

function preencherLinhaPlanilha(ws, linha, valores, cinza = false) {
  valores.forEach((valor, indice) => {
    const cell = ws.getCell(linha, indice + 1);
    cell.value = valor;
    cell.font = { bold: cinza };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (cinza) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
    aplicarBordaCompletaCelula(cell);
  });
}

function preencherLinhaMescladaPlanilha(ws, linha, colunas, cinza = false) {
  colunas.forEach(({ inicio, fim = inicio, valor }) => {
    if (fim > inicio) {
      ws.mergeCells(linha, inicio, linha, fim);
    }

    const cell = ws.getCell(linha, inicio);
    cell.value = valor;
    cell.font = { bold: cinza };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (cinza) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    }
  });

  estilizarIntervaloPlanilha(ws, linha, linha, 1, 12);
}

function obterColunasMovimentacaoPostoPlanilha(tipoSecao, item) {
  if (tipoSecao === "entrada") {
    return [
      { inicio: 1, valor: formatarDataISOParaBR(item.data) || item.data || "" },
      { inicio: 2, valor: item?.hora || "" },
      { inicio: 3, valor: item?.placa || "" },
      { inicio: 4, fim: 5, valor: item?.motorista || "" },
      { inicio: 6, fim: 7, valor: formatarNumeroPosto(obterQuantidadeMovimentoPosto(item), "L", 3) },
      { inicio: 8, fim: 10, valor: formatarContadorPosto(item.contador || 0) },
      { inicio: 11, fim: 12, valor: item?.tipo || "" }
    ];
  }

  return [
    { inicio: 1, valor: formatarDataISOParaBR(item.data) || item.data || "" },
    { inicio: 2, valor: item?.hora || "" },
    { inicio: 3, valor: item?.placa || "" },
    { inicio: 4, fim: 5, valor: item?.motorista || "" },
    { inicio: 6, fim: 7, valor: item?.setor || "" },
    { inicio: 8, valor: formatarNumeroPosto(obterQuantidadeMovimentoPosto(item), "L", 3) },
    { inicio: 9, fim: 11, valor: formatarContadorPosto(item.contador || 0) },
    { inicio: 12, valor: item?.tipo || "" }
  ];
}

function adicionarLinhasMovimentacaoPostoPlanilha(ws, linhaInicial, lista, tipoSecao) {
  for (let indice = 0; indice < lista.length; indice += 1) {
    const item = lista[indice];
    const linha = linhaInicial + indice;
    preencherLinhaMescladaPlanilha(ws, linha, obterColunasMovimentacaoPostoPlanilha(tipoSecao, item), false);
    ws.getRow(linha).height = 24;
  }

  return linhaInicial + lista.length - 1;
}

async function exportarRelatorioPostoFiltrado() {
  const { lista } = obterMovimentacoesPostoFiltradas();
  if (!lista.length) return avisoInfo("Nenhuma movimentação do posto para exportar nesse período.", "fuel");

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Posto", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  ws.columns = Array.from({ length: 12 }, () => ({ width: 15 }));

  const entradas = lista.filter(item => item.modo === "recebimento");
  const saidas = lista.filter(item => item.modo === "abastecimento");
  const bases = typeof obterBasesPlantaoRelatorioPosto === "function" ? obterBasesPlantaoRelatorioPosto() : null;
  const resumo = typeof obterResumoCalculadoPosto === "function" ? obterResumoCalculadoPosto() : null;

  ws.mergeCells("A1:L1");
  ws.getCell("A1").value = "RELATÓRIO - POSTO";
  ws.getCell("A1").font = { bold: true, size: 16 };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A2:L2");
  ws.getCell("A2").value = formatarPeriodoOperacionalPosto(relatorioPostoState.filtros.dataInicio, relatorioPostoState.filtros.dataFim);
  ws.getCell("A2").font = { italic: true, size: 11 };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A4:L4");
  ws.getCell("A4").value = "INFORMAÇÕES GERAIS";
  ws.getCell("A4").font = { bold: true, size: 12 };
  ws.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
  estilizarIntervaloPlanilha(ws, 4, 4, 1, 12);

  preencherLinhaPlanilha(ws, 5, [
    "ESTOQUE FÍSICO", "S-10", "S-500", "ARLA 32",
    "CONTADOR INICIAL", "S-10", "S-500", "ARLA 32",
    "CONTADOR FINAL", "S-10", "S-500", "ARLA 32"
  ], true);

  preencherLinhaPlanilha(ws, 6, [
    "INICIAL",
    bases ? Math.round(Number(bases.S10?.inicial || 0)) : "",
    bases ? Math.round(Number(bases.S500?.inicial || 0)) : "",
    bases ? Math.round(Number(bases.ARLA?.inicial || 0)) : "",
    "1º TURNO",
    bases ? formatarContadorPosto(bases.S10?.contadorInicial || 0) : "",
    bases ? formatarContadorPosto(bases.S500?.contadorInicial || 0) : "",
    bases ? formatarContadorPosto(bases.ARLA?.contadorInicial || 0) : "",
    "1º TURNO",
    resumo ? formatarContadorPosto(resumo.contador?.S10 || 0) : "",
    resumo ? formatarContadorPosto(resumo.contador?.S500 || 0) : "",
    resumo ? formatarContadorPosto(resumo.contador?.ARLA || 0) : ""
  ], false);

  preencherLinhaPlanilha(ws, 7, [
    "FINAL",
    resumo ? Math.round(Number(resumo.saldo?.S10 || 0)) : "",
    resumo ? Math.round(Number(resumo.saldo?.S500 || 0)) : "",
    resumo ? Math.round(Number(resumo.saldo?.ARLA || 0)) : "",
    "2º TURNO",
    "", "", "",
    "2º TURNO",
    "", "", ""
  ], false);

  let proximaLinha = 9;

  if (entradas.length) {
    ws.mergeCells(`A${proximaLinha}:L${proximaLinha}`);
    ws.getCell(`A${proximaLinha}`).value = "INFORMAÇÕES SOBRE A ENTRADA DE COMBUSTÍVEL";
    ws.getCell(`A${proximaLinha}`).font = { bold: true, size: 12 };
    ws.getCell(`A${proximaLinha}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`A${proximaLinha}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    estilizarIntervaloPlanilha(ws, proximaLinha, proximaLinha, 1, 12);
    ws.getRow(proximaLinha).height = 24;

    proximaLinha += 1;
    preencherLinhaMescladaPlanilha(ws, proximaLinha, [
      { inicio: 1, valor: "DATA" },
      { inicio: 2, valor: "HORÁRIO" },
      { inicio: 3, valor: "PLACA" },
      { inicio: 4, fim: 5, valor: "MOTORISTA" },
      { inicio: 6, fim: 7, valor: "QTDE. (L)" },
      { inicio: 8, fim: 10, valor: "CONTADOR" },
      { inicio: 11, fim: 12, valor: "TIPO" }
    ], true);
    ws.getRow(proximaLinha).height = 28;

    proximaLinha = adicionarLinhasMovimentacaoPostoPlanilha(ws, proximaLinha + 1, entradas, "entrada") + 2;
  }

  if (saidas.length) {
    ws.mergeCells(`A${proximaLinha}:L${proximaLinha}`);
    ws.getCell(`A${proximaLinha}`).value = "INFORMAÇÕES SOBRE A SAÍDA DE COMBUSTÍVEL";
    ws.getCell(`A${proximaLinha}`).font = { bold: true, size: 12 };
    ws.getCell(`A${proximaLinha}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`A${proximaLinha}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    estilizarIntervaloPlanilha(ws, proximaLinha, proximaLinha, 1, 12);
    ws.getRow(proximaLinha).height = 24;

    proximaLinha += 1;
    preencherLinhaMescladaPlanilha(ws, proximaLinha, [
      { inicio: 1, valor: "DATA" },
      { inicio: 2, valor: "HORÁRIO" },
      { inicio: 3, valor: "PLACA" },
      { inicio: 4, fim: 5, valor: "MOTORISTA" },
      { inicio: 6, fim: 7, valor: "SETOR" },
      { inicio: 8, valor: "QTDE. (L)" },
      { inicio: 9, fim: 11, valor: "CONTADOR" },
      { inicio: 12, valor: "TIPO" }
    ], true);
    ws.getRow(proximaLinha).height = 28;

    proximaLinha = adicionarLinhasMovimentacaoPostoPlanilha(ws, proximaLinha + 1, saidas, "saida") + 2;
  }

  ws.getRow(1).height = 28;
  ws.getRow(2).height = 22;
  ws.getRow(4).height = 24;
  ws.getRow(5).height = 28;
  ws.getRow(6).height = 28;
  ws.getRow(7).height = 28;
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "Relatorio_Posto_Filtrado.xlsx");
}

function preencherSelectAgendamentos() {
  preencherIntervaloPadrao("reportAgendamentos");
  const select = getById("reportAgendamentosSelect");
  if (!select) return;
  const atual = select.value;
  select.innerHTML = '<option value="">Todos os veículos</option>';
  veiculosCadastrados.forEach(item => {
    const option = document.createElement("option");
    option.value = item.placa;
    option.textContent = `${item.nome} - ${item.placa}`;
    select.appendChild(option);
  });
  if (atual) select.value = atual;
}

function obterAgendamentosFiltrados() {
  const { dataInicio, dataFim, veiculo } = relatorioAgendamentosState.filtros;
  const lista = filtrarPorIntervaloISO(
    [...Object.values(relatorioAgendamentosState.ativos), ...Object.values(relatorioAgendamentosState.historico)],
    "data",
    dataInicio,
    dataFim
  ).filter(item => !veiculo || (item.veiculo || "").includes(veiculo));
  return lista.sort((a, b) => new Date(`${b.data}T${b.hora || "00:00"}`) - new Date(`${a.data}T${a.hora || "00:00"}`));
}

function renderRelatorioAgendamentos() {
  preencherSelectAgendamentos();
  const lista = obterAgendamentosFiltrados();
  const period = getById("reportAgendamentosPeriod");
  if (period) period.textContent = formatarPeriodoLabel(relatorioAgendamentosState.filtros.dataInicio, relatorioAgendamentosState.filtros.dataFim, relatorioAgendamentosState.filtros.veiculo ? ` • Veículo: ${relatorioAgendamentosState.filtros.veiculo}` : " • Todos os veículos");

  const veiculos = new Set(lista.map(item => item.veiculo).filter(Boolean));

  renderResumoModulo("reportAgendamentosSummary", [
    criarResumoRelatorioCard("Agendamentos", lista.length, "Total no período"),
    criarResumoRelatorioCard("Veículos", veiculos.size, "Veículos envolvidos")
  ]);
  renderInsightsModulo("reportAgendamentosInsights", [
    criarInsightRelatorio("clock-3", "Agendamentos Ativos No Momento", `${Object.keys(relatorioAgendamentosState.ativos).length} registro(s) em aberto agora`, "is-green")
  ]);
}

function aplicarFiltrosRelatorioAgendamentos() {
  const inicio = getById("reportAgendamentosDataInicio")?.value || "";
  const fim = getById("reportAgendamentosDataFim")?.value || "";
  if (!validarIntervalo(inicio, fim)) return avisoValidacao("A data inicial não pode ser maior que a data final.");
  relatorioAgendamentosState.filtros = { dataInicio: inicio, dataFim: fim, veiculo: getById("reportAgendamentosSelect")?.value || "" };
  renderRelatorioAgendamentos();
}

async function exportarRelatorioAgendamentosFiltrado() {
  const lista = obterAgendamentosFiltrados().map(item => ({
    data: formatarDataISOParaBR(item.data) || item.data || "",
    hora: item.hora || "",
    local: item.local || item.destino || "",
    veiculo: item.veiculo || "",
    condutor: item.quem || item.condutor || "",
    status: item.status || "ATIVO"
  }));
  if (!lista.length) return avisoInfo("Nenhum agendamento encontrado para exportar.", "calendar-days");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Agendamentos", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data", key: "data", width: 14 },
    { header: "Hora", key: "hora", width: 12 },
    { header: "Local", key: "local", width: 28 },
    { header: "Veículo", key: "veiculo", width: 30 },
    { header: "Condutor", key: "condutor", width: 24 },
    { header: "Status", key: "status", width: 16 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - AGENDAMENTOS", formatarPeriodoLabel(relatorioAgendamentosState.filtros.dataInicio, relatorioAgendamentosState.filtros.dataFim), "FF1565C0");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "Relatorio_Agendamentos_Filtrado.xlsx");
}

function obterEmpilhadeirasFiltradas() {
  const { dataInicio, dataFim, numero } = relatorioEmpilhadeirasState.filtros;
  return filtrarPorIntervaloBR(Object.values(relatorioEmpilhadeirasState.historico), "data", dataInicio, dataFim)
    .filter(item => !numero || String(item.num || "").includes(numero))
    .sort((a, b) => parseDateTime(b.data, b.hora) - parseDateTime(a.data, a.hora));
}

function renderRelatorioEmpilhadeiras() {
  preencherIntervaloPadrao("reportEmpilhadeiras");
  const lista = obterEmpilhadeirasFiltradas();
  const period = getById("reportEmpilhadeirasPeriod");
  if (period) period.textContent = formatarPeriodoLabel(relatorioEmpilhadeirasState.filtros.dataInicio, relatorioEmpilhadeirasState.filtros.dataFim, relatorioEmpilhadeirasState.filtros.numero ? ` • Empilhadeira: ${relatorioEmpilhadeirasState.filtros.numero}` : " • Todas");
  const porNumero = new Map();
  lista.forEach(item => porNumero.set(item.num, (porNumero.get(item.num) || 0) + 1));
  const numeroTop = [...porNumero.entries()].sort((a, b) => b[1] - a[1])[0];
  renderResumoModulo("reportEmpilhadeirasSummary", [
    criarResumoRelatorioCard("Abastecimentos", lista.length, "Registros no período"),
    criarResumoRelatorioCard(
      "Mais abastecida",
      numeroTop ? numeroTop[0] : "-",
      numeroTop ? `${numeroTop[1]} abastecimento(s) no período` : "Nenhum registro no período"
    )
  ]);
}

function aplicarFiltrosRelatorioEmpilhadeiras() {
  const inicio = getById("reportEmpilhadeirasDataInicio")?.value || "";
  const fim = getById("reportEmpilhadeirasDataFim")?.value || "";
  if (!validarIntervalo(inicio, fim)) return avisoValidacao("A data inicial não pode ser maior que a data final.");
  relatorioEmpilhadeirasState.filtros = { dataInicio: inicio, dataFim: fim, numero: (getById("reportEmpilhadeirasNumero")?.value || "").trim() };
  renderRelatorioEmpilhadeiras();
}

async function exportarRelatorioEmpilhadeirasFiltrado() {
  const lista = obterEmpilhadeirasFiltradas().map(item => ({ data: item.data || "", hora: item.hora || "", empilhadeira: item.num || "", motorista: item.motorista || "", porteiro: item.porteiro || "" }));
  if (!lista.length) return avisoInfo("Nenhum registro de empilhadeiras para exportar.", "forklift");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Empilhadeiras", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data", key: "data", width: 14 },
    { header: "Hora", key: "hora", width: 12 },
    { header: "Nº Empilhadeira", key: "empilhadeira", width: 16 },
    { header: "Motorista", key: "motorista", width: 22 },
    { header: "Porteiro", key: "porteiro", width: 18 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - EMPILHADEIRAS", formatarPeriodoLabel(relatorioEmpilhadeirasState.filtros.dataInicio, relatorioEmpilhadeirasState.filtros.dataFim), "FF455A64");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "Relatorio_Empilhadeiras_Filtrado.xlsx");
}

function preencherSelectChaves() {
  preencherIntervaloPadrao("reportChaves");
  const select = getById("reportChavesSelect");
  if (!select) return;
  const atual = select.value;
  select.innerHTML = '<option value="">Todas as chaves</option>';
  chavesCadastradas.forEach(item => {
    const option = document.createElement("option");
    option.value = item.numero;
    option.textContent = `${item.numero} - ${item.sala}`;
    select.appendChild(option);
  });
  if (atual) select.value = atual;
}

function obterChavesFiltradas() {
  const { dataInicio, dataFim, numero } = relatorioChavesState.filtros;
  const lista = [
    ...Object.values(relatorioChavesState.ativas).map(item => ({ ...item, status: "EM USO" })),
    ...Object.values(relatorioChavesState.historico).map(item => ({ ...item, status: item.dataDevolucao ? "DEVOLVIDO" : "EM USO" }))
  ];
  return filtrarPorIntervaloBR(lista, "dataRetirada", dataInicio, dataFim)
    .filter(item => !numero || String(item.num || "").includes(numero))
    .sort((a, b) => parseDateTime(b.dataRetirada, b.horaRetirada) - parseDateTime(a.dataRetirada, a.horaRetirada));
}

function renderRelatorioChaves() {
  preencherSelectChaves();
  const lista = obterChavesFiltradas();
  const period = getById("reportChavesPeriod");
  if (period) period.textContent = formatarPeriodoLabel(relatorioChavesState.filtros.dataInicio, relatorioChavesState.filtros.dataFim, relatorioChavesState.filtros.numero ? ` • Chave: ${relatorioChavesState.filtros.numero}` : " • Todas");
  const numeros = new Set(lista.map(item => item.num).filter(Boolean));
  const porSala = new Map();
  lista.forEach(item => porSala.set(item.sala, (porSala.get(item.sala) || 0) + 1));
  const salaTop = [...porSala.entries()].sort((a, b) => b[1] - a[1])[0];
  renderResumoModulo("reportChavesSummary", [
    criarResumoRelatorioCard("Movimentações", lista.length, "Total no período"),
    criarResumoRelatorioCard("Chaves", numeros.size, "Chaves movimentadas")
  ]);
  renderInsightsModulo("reportChavesInsights", [
    criarInsightRelatorio("building-2", "Setor Mais Movimentado", salaTop ? `${salaTop[0]} com ${salaTop[1]} movimentação(ões)` : "Nenhum setor no período", "is-blue"),
    criarInsightRelatorio("key-round", "Em Uso Agora", `${Object.keys(relatorioChavesState.ativas).length} chave(s) abertas no momento`, "is-green")
  ]);
}

function aplicarFiltrosRelatorioChaves() {
  const inicio = getById("reportChavesDataInicio")?.value || "";
  const fim = getById("reportChavesDataFim")?.value || "";
  if (!validarIntervalo(inicio, fim)) return avisoValidacao("A data inicial não pode ser maior que a data final.");
  relatorioChavesState.filtros = { dataInicio: inicio, dataFim: fim, numero: getById("reportChavesSelect")?.value || "" };
  renderRelatorioChaves();
}

async function exportarRelatorioChavesFiltrado() {
  const lista = obterChavesFiltradas().map(item => ({
    dataRetirada: item.dataRetirada || "",
    horaRetirada: item.horaRetirada || "",
    numero: item.num || "",
    sala: item.sala || "",
    retirou: item.quem || "",
    porteiro: item.porteiro || "",
    dataDevolucao: item.dataDevolucao || "",
    horaDevolucao: item.horaDevolucao || "",
    status: item.status || ""
  }));
  if (!lista.length) return avisoInfo("Nenhuma movimentação de chaves para exportar.", "key-round");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Chaves", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data Retirada", key: "dataRetirada", width: 14 },
    { header: "Hora Retirada", key: "horaRetirada", width: 12 },
    { header: "Nº Chave", key: "numero", width: 18 },
    { header: "Sala / Setor", key: "sala", width: 34 },
    { header: "Quem Retirou", key: "retirou", width: 22 },
    { header: "Porteiro", key: "porteiro", width: 20 },
    { header: "Data Devolução", key: "dataDevolucao", width: 16 },
    { header: "Hora Devolução", key: "horaDevolucao", width: 16 },
    { header: "Status", key: "status", width: 12 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - CHAVES", formatarPeriodoLabel(relatorioChavesState.filtros.dataInicio, relatorioChavesState.filtros.dataFim), "FF0288D1");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "Relatorio_Chaves_Filtrado.xlsx");
}

function obterGuardasFiltrados() {
  const { dataInicio, dataFim, numero } = relatorioGuardasState.filtros;
  const lista = [
    ...Object.values(relatorioGuardasState.ativos).map(item => ({ ...item, status: "EM USO" })),
    ...Object.values(relatorioGuardasState.historico).map(item => ({ ...item, status: item.dataDevolucao ? "DEVOLVIDO" : "EM USO" }))
  ];
  return filtrarPorIntervaloBR(lista, "dataRetirada", dataInicio, dataFim)
    .filter(item => !numero || String(item.numero || "").includes(numero.toUpperCase()))
    .sort((a, b) => parseDateTime(b.dataRetirada, b.horaRetirada) - parseDateTime(a.dataRetirada, a.horaRetirada));
}

function renderRelatorioGuardas() {
  preencherIntervaloPadrao("reportGuardas");
  const lista = obterGuardasFiltrados();
  const period = getById("reportGuardasPeriod");
  if (period) period.textContent = formatarPeriodoLabel(relatorioGuardasState.filtros.dataInicio, relatorioGuardasState.filtros.dataFim, relatorioGuardasState.filtros.numero ? ` • Patrimônio: ${relatorioGuardasState.filtros.numero}` : " • Todos");
  const patrimonios = new Set(lista.map(item => item.numero).filter(Boolean));
  const setores = new Map();
  lista.forEach(item => setores.set(item.setor, (setores.get(item.setor) || 0) + 1));
  const setorTop = [...setores.entries()].sort((a, b) => b[1] - a[1])[0];
  renderResumoModulo("reportGuardasSummary", [
    criarResumoRelatorioCard("Movimentações", lista.length, "Total no período"),
    criarResumoRelatorioCard("Patrimônios", patrimonios.size, "Itens utilizados")
  ]);
  renderInsightsModulo("reportGuardasInsights", [
    criarInsightRelatorio("map-pin", "Setor Mais Frequente", setorTop ? `${setorTop[0]} com ${setorTop[1]} retirada(s)` : "Nenhum setor no período", "is-blue"),
    criarInsightRelatorio("umbrella", "Em Uso Agora", `${Object.keys(relatorioGuardasState.ativos).length} guarda-chuva(s) abertos`, "is-green")
  ]);
}

function aplicarFiltrosRelatorioGuardas() {
  const inicio = getById("reportGuardasDataInicio")?.value || "";
  const fim = getById("reportGuardasDataFim")?.value || "";
  if (!validarIntervalo(inicio, fim)) return avisoValidacao("A data inicial não pode ser maior que a data final.");
  relatorioGuardasState.filtros = { dataInicio: inicio, dataFim: fim, numero: normalizarTexto(getById("reportGuardasNumero")?.value || "") };
  renderRelatorioGuardas();
}

async function exportarRelatorioGuardasFiltrado() {
  const lista = obterGuardasFiltrados().map(item => ({
    dataRetirada: item.dataRetirada || "",
    horaRetirada: item.horaRetirada || "",
    numero: item.numero || "",
    retirou: item.quem || "",
    setor: item.setor || "",
    porteiro: item.porteiro || "",
    dataDevolucao: item.dataDevolucao || "",
    horaDevolucao: item.horaDevolucao || "",
    status: item.status || ""
  }));
  if (!lista.length) return avisoInfo("Nenhuma movimentação de guarda-chuva para exportar.", "umbrella");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Guarda-Chuva", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data Retirada", key: "dataRetirada", width: 14 },
    { header: "Hora Retirada", key: "horaRetirada", width: 14 },
    { header: "Nº Patrimônio", key: "numero", width: 16 },
    { header: "Quem Retirou", key: "retirou", width: 22 },
    { header: "Setor", key: "setor", width: 18 },
    { header: "Porteiro", key: "porteiro", width: 18 },
    { header: "Data Devolução", key: "dataDevolucao", width: 14 },
    { header: "Hora Devolução", key: "horaDevolucao", width: 14 },
    { header: "Status", key: "status", width: 12 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - GUARDA-CHUVA", formatarPeriodoLabel(relatorioGuardasState.filtros.dataInicio, relatorioGuardasState.filtros.dataFim), "FF546E7A");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "Relatorio_GuardaChuva_Filtrado.xlsx");
}

function obterJogosFiltrados() {
  const { dataInicio, dataFim, jogo } = relatorioJogosState.filtros;
  const lista = [
    ...Object.values(relatorioJogosState.ativos).map(item => ({ ...item, status: "EM USO" })),
    ...Object.values(relatorioJogosState.historico).map(item => ({ ...item, status: item.dataDevolucao ? "DEVOLVIDO" : "EM USO" }))
  ];
  return filtrarPorIntervaloBR(lista, "data", dataInicio, dataFim)
    .filter(item => !jogo || normalizarTexto(item.jogo || "").includes(jogo))
    .sort((a, b) => parseDateTime(b.data, b.hora) - parseDateTime(a.data, a.hora));
}

function renderRelatorioJogos() {
  preencherIntervaloPadrao("reportJogos");
  const lista = obterJogosFiltrados();
  const period = getById("reportJogosPeriod");
  if (period) period.textContent = formatarPeriodoLabel(relatorioJogosState.filtros.dataInicio, relatorioJogosState.filtros.dataFim, relatorioJogosState.filtros.jogo ? ` • Jogo: ${relatorioJogosState.filtros.jogo}` : " • Todos");
  const jogos = new Set(lista.map(item => item.jogo).filter(Boolean));
  const porJogo = new Map();
  lista.forEach(item => porJogo.set(item.jogo, (porJogo.get(item.jogo) || 0) + 1));
  const jogoTop = [...porJogo.entries()].sort((a, b) => b[1] - a[1])[0];
  renderResumoModulo("reportJogosSummary", [
    criarResumoRelatorioCard("Movimentações", lista.length, "Total no período"),
    criarResumoRelatorioCard("Jogos", jogos.size, "Itens utilizados")
  ]);
  renderInsightsModulo("reportJogosInsights", [
    criarInsightRelatorio("gamepad-2", "Jogo Mais Usado", jogoTop ? `${jogoTop[0]} com ${jogoTop[1]} retirada(s)` : "Nenhum jogo no período", "is-blue"),
    criarInsightRelatorio("user-round", "Em Uso Agora", `${Object.keys(relatorioJogosState.ativos).length} jogo(s) ainda em aberto`, "is-green")
  ]);
}

function aplicarFiltrosRelatorioJogos() {
  const inicio = getById("reportJogosDataInicio")?.value || "";
  const fim = getById("reportJogosDataFim")?.value || "";
  if (!validarIntervalo(inicio, fim)) return avisoValidacao("A data inicial não pode ser maior que a data final.");
  relatorioJogosState.filtros = { dataInicio: inicio, dataFim: fim, jogo: normalizarTexto(getById("reportJogosNome")?.value || "") };
  renderRelatorioJogos();
}

async function exportarRelatorioJogosFiltrado() {
  const lista = obterJogosFiltrados().map(item => ({
    dataRetirada: item.data || "",
    horaRetirada: item.hora || "",
    jogo: item.jogo || "",
    funcionario: item.funcionario || "",
    autorizador: item.autorizador || "",
    dataDevolucao: item.dataDevolucao || "",
    horaDevolucao: item.horaDevolucao || "",
    status: item.status || ""
  }));
  if (!lista.length) return avisoInfo("Nenhuma movimentação de jogos para exportar.", "gamepad-2");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jogos", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { header: "Data Retirada", key: "dataRetirada", width: 14 },
    { header: "Hora Retirada", key: "horaRetirada", width: 14 },
    { header: "Jogo", key: "jogo", width: 26 },
    { header: "Funcionário", key: "funcionario", width: 22 },
    { header: "Autorizador", key: "autorizador", width: 22 },
    { header: "Data Devolução", key: "dataDevolucao", width: 14 },
    { header: "Hora Devolução", key: "horaDevolucao", width: 14 },
    { header: "Status", key: "status", width: 12 }
  ];
  aplicarCabecalhoRelatorio(ws, "RELATÓRIO - JOGOS", formatarPeriodoLabel(relatorioJogosState.filtros.dataInicio, relatorioJogosState.filtros.dataFim), "FF7B1FA2");
  lista.forEach(item => ws.addRow(item));
  aplicarEstiloLinhas(ws);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "Relatorio_Jogos_Filtrado.xlsx");
}

function criarCardAgendamentoAtivo([, dados]) {
  return criarCardRegistro({
    classes: "card-agenda",
    titulo: dados.veiculo || "Veículo",
    linhas: [
      { icon: "calendar-days", text: `Data: ${formatarDataISOParaBR(dados.data) || "-"} às ${dados.hora || "-"}` },
      { icon: "map-pin", text: `Local: ${dados.local || "-"}` },
      { icon: "user-round", text: `Condutor: ${dados.quem || "-"}` }
    ]
  });
}

function criarCardChaveAberta([, dados]) {
  return criarCardRegistro({
    classes: "card-chave",
    titulo: `Nº ${dados.num || "-"} - ${dados.sala || "-"}`,
    linhas: [
      { icon: "user-round", text: `Retirado por: ${dados.quem || "-"}` },
      { icon: "shield-check", text: `Porteiro: ${dados.porteiro || "-"}` }
    ]
  });
}

function criarCardJogoAberto([, dados]) {
  return criarCardRegistro({
    classes: "card-chave card-chave--jogo",
    titulo: dados.jogo || "-",
    linhas: [
      { icon: "user-round", text: `Funcionário: ${dados.funcionario || "-"}` },
      { icon: "shield-check", text: `Autorizador: ${dados.autorizador || "-"}` }
    ]
  });
}

function criarCardGuardaAberto([, dados]) {
  return criarCardRegistro({
    classes: "card-chave card-chave--guarda",
    titulo: `Nº ${dados.numero || "-"}`,
    linhas: [
      { icon: "user-round", text: `Retirado por: ${dados.quem || "-"}` },
      { icon: "map-pin", text: `Setor: ${dados.setor || "-"}` }
    ]
  });
}

function renderRelatorioEmAberto() {
  const container = getById("reportOpenGroups");
  if (!container) return;
  limparConteudoElemento(container);

  const grupos = [
    criarGrupoRelatorioAberto(
      "Veículos em aberto",
      Object.entries(relatoriosState.veiculosEmUso).map(criarCardVeiculoEmAberto),
      "Nenhum veículo aguardando retorno."
    ),
    criarGrupoRelatorioAberto(
      "Agendamentos ativos",
      Object.entries(relatoriosState.agendamentosAtivos).map(criarCardAgendamentoAtivo),
      "Nenhum agendamento ativo no momento."
    ),
    criarGrupoRelatorioAberto(
      "Chaves em aberto",
      Object.entries(relatoriosState.chavesEmUso).map(criarCardChaveAberta),
      "Nenhuma chave em uso no momento."
    ),
    criarGrupoRelatorioAberto(
      "Jogos em aberto",
      Object.entries(relatoriosState.jogosEmUso).map(criarCardJogoAberto),
      "Nenhum jogo em uso no momento."
    ),
    criarGrupoRelatorioAberto(
      "Guarda-chuvas em aberto",
      Object.entries(relatoriosState.guardasEmUso).map(criarCardGuardaAberto),
      "Nenhum guarda-chuva em uso no momento."
    )
  ];

  grupos.forEach(grupo => container.appendChild(grupo));
  refreshLucideIcons();
}

function atualizarRelatoriosVisaoGeral() {
  renderRelatorioPainel();
  renderRelatorioEmAberto();
}

db.ref("status_veiculos").on("value", snap => {
  relatoriosState.veiculosEmUso = snap.val() || {};
  atualizarRelatoriosVisaoGeral();
});

db.ref("historico_viagens").on("value", snap => {
  relatorioVeiculosState.historico = snap.val() || {};
  renderRelatorioVeiculosResumo();
});

db.ref("agendamentos_veiculos").on("value", snap => {
  relatoriosState.agendamentosAtivos = snap.val() || {};
  relatorioAgendamentosState.ativos = snap.val() || {};
  renderRelatorioAgendamentos();
  atualizarRelatoriosVisaoGeral();
});

db.ref("chaves_em_uso").on("value", snap => {
  relatoriosState.chavesEmUso = snap.val() || {};
  relatorioChavesState.ativas = snap.val() || {};
  renderRelatorioChaves();
  atualizarRelatoriosVisaoGeral();
});

db.ref("jogos_em_uso").on("value", snap => {
  relatoriosState.jogosEmUso = snap.val() || {};
  relatorioJogosState.ativos = snap.val() || {};
  renderRelatorioJogos();
  atualizarRelatoriosVisaoGeral();
});

db.ref("guardachuvas_em_uso").on("value", snap => {
  relatoriosState.guardasEmUso = snap.val() || {};
  relatorioGuardasState.ativos = snap.val() || {};
  renderRelatorioGuardas();
  atualizarRelatoriosVisaoGeral();
});

db.ref("abastecimentos").on("value", snap => {
  relatoriosState.abastecimentos = snap.val() || {};
  relatorioEmpilhadeirasState.historico = snap.val() || {};
  renderRelatorioEmpilhadeiras();
  atualizarRelatoriosVisaoGeral();
});

db.ref("historico_agendamentos").on("value", snap => {
  relatorioAgendamentosState.historico = snap.val() || {};
  renderRelatorioAgendamentos();
});

db.ref("historico_chaves").on("value", snap => {
  relatorioChavesState.historico = snap.val() || {};
  renderRelatorioChaves();
});

db.ref("historico_guardachuvas").on("value", snap => {
  relatorioGuardasState.historico = snap.val() || {};
  renderRelatorioGuardas();
});

db.ref("historico_jogos").on("value", snap => {
  relatorioJogosState.historico = snap.val() || {};
  renderRelatorioJogos();
});


