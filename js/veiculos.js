let statusVeiculosAtual = {};

function pesagemDisponivelNoDispositivoAtual() {
  return window.innerWidth > 720;
}

// --- Navegacao ---
function abrir(id) {
  if (id === "pesagemManual" && !pesagemDisponivelNoDispositivoAtual()) {
    avisoInfo("A pesagem manual está disponível apenas no desktop.", "monitor-smartphone");
    return;
  }

  const secao = getById(id);
  if (!secao) {
    console.error(`Seção não encontrada: ${id}`);
    avisoErro("Tela não encontrada.");
    return;
  }

  ocultarSecoes();
  secao.classList.add("section-active");
  secao.style.display = "block";

  if (id === "veiculosGeral") {
    ocultarElemento("listaVeiculosContent");
    ocultarElemento("agendamentoVeiculosContent");
    getById("containerBotoesVeiculos").style.display = "grid";
  }

  if (id === "pesagemManual" && typeof abrirListaPesagemManual === "function") {
    abrirListaPesagemManual();
  }

  if (id === "relatorioPosto" && typeof renderRelatorioPostoResumo === "function") {
    renderRelatorioPostoResumo();
  }

  atualizarNavegacaoAtiva(id);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function voltarVeiculos() {
  limparFormularioVeiculos();
  abrir("veiculosGeral");
  exibirSubVeiculos("listaVeiculosContent");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- Veiculos ---
function exibirSubVeiculos(idSub) {
  getById("containerBotoesVeiculos").style.display = "none";
  ui.vehicleSubsections.forEach(ocultarElemento);
  mostrarElemento(idSub);
  if (idSub === "listaVeiculosContent") {
    renderListaVeiculos(statusVeiculosAtual);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fecharSubVeiculos() {
  ui.vehicleSubsections.forEach(ocultarElemento);
  getById("containerBotoesVeiculos").style.display = "grid";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function preencherSelectAgendamentoVeiculos() {
  const select = getById("ag_veiculo");
  if (!select) return;

  const valorAtual = select.value;
  limparConteudoElemento(select);

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecione o Veículo...";
  select.appendChild(placeholder);

  veiculosCadastrados.forEach(veiculo => {
    const option = document.createElement("option");
    option.value = `${veiculo.nome} (${veiculo.placa})`;
    option.textContent = `${veiculo.nome} (${veiculo.placa})`;
    select.appendChild(option);
  });

  if (valorAtual && Array.from(select.options).some(option => option.value === valorAtual)) {
    select.value = valorAtual;
  }
}

function renderListaVeiculos(statusOnline = {}) {
  const container = getById("renderListaVeiculos");
  if (!container) return;
  limparConteudoElemento(container);

  veiculosCadastrados.forEach(v => {
    const emUso = statusOnline[v.placa] && statusOnline[v.placa].emUso;
    const card = criarCardBase("veiculo");
    card.dataset.itemAction = "abrir-veiculo";
    card.dataset.placa = v.placa;

    const icone = document.createElement("div");
    icone.className = "icone";
    const imagem = document.createElement("img");
    const imgSrc = String(v.img || "").trim();
    imagem.src = imgSrc.startsWith("http") || imgSrc.startsWith("data:")
      ? imgSrc
      : `imagens/${imgSrc || "carro.png"}`;
    imagem.alt = v.nome;
    imagem.addEventListener("error", () => {
      imagem.src = "https://cdn-icons-png.flaticon.com/512/741/741407.png";
    }, { once: true });

    const info = document.createElement("div");
    info.className = "info";
    const nome = document.createElement("b");
    nome.textContent = v.nome;
    const placa = document.createElement("small");
    placa.textContent = v.placa;

    info.append(nome, placa);
    icone.appendChild(imagem);
    card.append(icone, info);

    if (emUso) {
      const status = document.createElement("span");
      status.className = "status-badge status-rua";
      status.textContent = "NA RUA";
      card.appendChild(status);
    }

    container.appendChild(card);
  });
}

db.ref("status_veiculos").on("value", snap => {
  statusVeiculosAtual = snap.val() || {};
  atualizarIndicador("statVeiculosRua", Object.values(statusVeiculosAtual).filter(v => v && v.emUso).length);
  atualizarPainelPendencias();
  renderListaVeiculos(statusVeiculosAtual);
});

function prepararForm(placa) {
  limparFormularioVeiculos();
  abrir("veiculosForm");
  getById("v_placa").value = placa;

  db.ref(`status_veiculos/${placa}`).once("value").then(snap => {
    const d = snap.val();
    if (d && d.emUso) {
      modoAtual = "RETORNO";
      getById("campos_saida").style.display = "none";
      mostrarElemento("campos_retorno");
      getById("info_saida").innerText = `Condutor: ${d.condutor} | KM Saída: ${d.kmSaida}`;
    } else {
      modoAtual = "SAIDA";
      getById("campos_saida").style.display = "block";
      ocultarElemento("campos_retorno");
    }
  });
}

function limparFormularioVeiculos() {
  ["v_km_saida", "v_condutor", "v_destino", "v_km_retorno", "v_porteiro_retorno", "v_obs"].forEach(id => {
    getById(id).value = "";
  });
  getById("info_saida").innerText = "";
  ["lista_condutores", "lista_porteiros_retorno"].forEach(id => {
    limparConteudoElemento(id);
    ocultarListaAutocomplete(getById(id));
  });
  document.querySelectorAll('input[name="c_luz"], input[name="c_pneu"], input[name="c_limp"], input[name="c_pneu_visual"]').forEach(r => {
    r.checked = false;
  });
}

function processarVeiculo() {
  const placa = getById("v_placa").value;
  const botao = document.activeElement;

  if (modoAtual === "SAIDA") {
    const kmSaida = getById("v_km_saida").value.trim();
    const condutor = getById("v_condutor").value.trim().toUpperCase();
    const destino = getById("v_destino").value.trim();

    if (!kmSaida || !condutor || !destino) {
      avisoValidacao("Preencha KM, condutor e destino.");
      return;
    }
    if (!validarNumeroPositivo(kmSaida)) {
      avisoValidacao("Informe um KM de saída válido.");
      return;
    }
    if (!condutoresAutorizados.includes(condutor)) {
      avisoValidacao("Selecione um condutor válido na lista.");
      return;
    }

    const dados = {
      emUso: true,
      placa,
      kmSaida,
      condutor,
      destino,
      horaSaida: new Date().toLocaleTimeString("pt-BR", { hour12: false })
    };

    alternarBotaoCarregando(botao, true);
    db.ref(`status_veiculos/${placa}`).set(dados).then(() => {
      avisoSucesso("Saída registrada com sucesso.");
      limparFormularioVeiculos();
      abrir("veiculosGeral");
      exibirSubVeiculos("listaVeiculosContent");
    }).catch(() => {
      avisoErro("Erro ao salvar o registro.");
    }).finally(() => {
      alternarBotaoCarregando(botao, false, "Gravar Registro");
    });
    return;
  }

  alternarBotaoCarregando(botao, true);
  db.ref(`status_veiculos/${placa}`).once("value").then(snap => {
    const registroSaida = snap.val();
    if (!registroSaida) {
      avisoErro("Veículo não encontrado para retorno.");
      alternarBotaoCarregando(botao, false, "Gravar Registro");
      return;
    }

    const kmRetorno = getById("v_km_retorno").value.trim();
    const porteiroRetorno = getById("v_porteiro_retorno").value.trim().toUpperCase();
    if (!kmRetorno) {
      avisoValidacao("Informe o KM do retorno.");
      alternarBotaoCarregando(botao, false, "Gravar Registro");
      return;
    }
    if (!validarNumeroPositivo(kmRetorno)) {
      avisoValidacao("Informe um KM de retorno válido.");
      alternarBotaoCarregando(botao, false, "Gravar Registro");
      return;
    }
    if (Number(kmRetorno) < Number(registroSaida.kmSaida || 0)) {
      avisoValidacao("O KM de retorno não pode ser menor que o KM de saída.");
      alternarBotaoCarregando(botao, false, "Gravar Registro");
      return;
    }
    if (!porteiroRetorno) {
      avisoValidacao("Informe o porteiro do retorno.");
      alternarBotaoCarregando(botao, false, "Gravar Registro");
      return;
    }
    if (!validarPorteiroAutorizado(porteiroRetorno)) {
      avisoValidacao("Selecione um porteiro válido na lista.");
      alternarBotaoCarregando(botao, false, "Gravar Registro");
      return;
    }

    const historico = {
      ...registroSaida,
      kmRetorno,
      porteiroRetorno,
      dataRetorno: new Date().toLocaleDateString("pt-BR"),
      horaRetorno: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
      checklist_luz: document.querySelector('input[name="c_luz"]:checked')?.value || "N/A",
      checklist_pneu: document.querySelector('input[name="c_pneu"]:checked')?.value || "N/A",
      checklist_limp: document.querySelector('input[name="c_limp"]:checked')?.value || "N/A",
      checklist_visual: document.querySelector('input[name="c_pneu_visual"]:checked')?.value || "N/A",
      obs: getById("v_obs").value
    };

    db.ref("historico_viagens").push(historico)
      .then(() => db.ref(`status_veiculos/${placa}`).remove())
      .then(() => {
        avisoSucesso("Retorno registrado com sucesso.");
        limparFormularioVeiculos();
        abrir("veiculosGeral");
        exibirSubVeiculos("listaVeiculosContent");
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(() => {
        avisoErro("Erro ao registrar o retorno.");
      })
      .finally(() => {
        alternarBotaoCarregando(botao, false, "Gravar Registro");
      });
  }).catch(() => {
    avisoErro("Erro ao consultar o veículo.");
    alternarBotaoCarregando(botao, false, "Gravar Registro");
  });
}

// --- Agendamentos ---
function limparFormAgendamento() {
  ["ag_veiculo", "ag_data", "ag_hora", "ag_local", "ag_quem"].forEach(id => {
    getById(id).value = "";
  });
}

function abrirFormAgendamento() {
  mostrarElemento("formAgendamentoBox");
  ocultarElemento("btnAbrirAgendamento");
  ocultarElemento("blocoReservasAgendamento");
  ocultarElemento("btnVoltarAgendamento");
  preencherSelectAgendamentoVeiculos();
}

function fecharFormAgendamento() {
  ocultarElemento("formAgendamentoBox");
  mostrarElemento("btnAbrirAgendamento");
  mostrarElemento("blocoReservasAgendamento");
  mostrarElemento("btnVoltarAgendamento");
}

function salvarAgendamento() {
  const botao = document.activeElement;
  const ag = {
    veiculo: getById("ag_veiculo").value,
    data: getById("ag_data").value,
    hora: getById("ag_hora").value,
    local: normalizarTexto(getById("ag_local").value),
    quem: normalizarTexto(getById("ag_quem").value)
  };

  if (!ag.veiculo || !ag.data || !ag.hora || !ag.local || !ag.quem) {
    avisoValidacao("Preencha veículo, data, hora, local e condutor.");
    return;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataAgendada = new Date(`${ag.data}T00:00:00`);
  if (Number.isNaN(dataAgendada.getTime())) {
    avisoValidacao("Informe uma data de agendamento válida.");
    return;
  }
  if (dataAgendada < hoje) {
    avisoValidacao("A data do agendamento não pode estar no passado.");
    return;
  }

  alternarBotaoCarregando(botao, true);
  db.ref("agendamentos_veiculos").once("value").then(snap => {
    const registros = Object.values(snap.val() || {});
    const conflito = registros.some(item =>
      item.veiculo === ag.veiculo &&
      item.data === ag.data &&
      item.hora === ag.hora
    );
    if (conflito) {
      avisoValidacao("Já existe um agendamento para esse veículo nessa data e horário.");
      return;
    }

    return db.ref("agendamentos_veiculos").push(ag).then(() => {
      avisoSucesso("Agendamento realizado com sucesso.", "calendar-days");
      limparFormAgendamento();
      fecharFormAgendamento();
    });
  }).catch(() => {
    avisoErro("Erro ao salvar o agendamento.");
  }).finally(() => {
    alternarBotaoCarregando(botao, false, "Confirmar Agendamento");
  });
}

function renderListaAgendamentos(dados) {
  const container = getById("listaAgendamentos");
  if (!container) return;
  limparConteudoElemento(container);

  if (!dados) {
    container.appendChild(criarParagrafoVazio("Nenhum veículo agendado no momento."));
    return;
  }

  Object.entries(dados).forEach(([id, agendamento]) => {
    const dataBR = formatarDataISOParaBR(agendamento.data) || "-";
    container.appendChild(criarCardRegistro({
      classes: "card-agenda",
      titulo: agendamento.veiculo || "Veículo",
      linhas: [
        { icon: "calendar-days", text: `Data: ${dataBR} às ${agendamento.hora || "-"}` },
        { icon: "map-pin", text: `Local: ${agendamento.local || "-"}` },
        { icon: "user-round", text: `Condutor: ${agendamento.quem || "-"}` }
      ],
      actionText: "Finalizar Agendamento",
      actionName: "finalizar-agendamento",
      actionId: id
    }));
  });
}

db.ref("agendamentos_veiculos").on("value", snap => {
  const dados = snap.val();
  atualizarIndicador("statAgendamentos", dados ? Object.keys(dados).length : 0);
  atualizarPainelPendencias();
  renderListaAgendamentos(dados);
  refreshLucideIcons();
});

window.addEventListener("DOMContentLoaded", () => {
  preencherSelectAgendamentoVeiculos();
});

function finalizarAgendamento(id) {
  db.ref(`agendamentos_veiculos/${id}`).once("value").then(snap => {
    const dados = {
      ...snap.val(),
      dataFinalizacao: new Date().toLocaleDateString("pt-BR"),
      horaFinalizacao: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
      status: "Concluído"
    };
    db.ref("historico_agendamentos").push(dados).then(() => {
      db.ref(`agendamentos_veiculos/${id}`).remove();
      avisoSucesso("Agendamento finalizado com sucesso.");
    });
  });
}

renderListaVeiculos(statusVeiculosAtual);



