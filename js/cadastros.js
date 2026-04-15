// --- Cadastros ---
const cadastroRefs = {
  porteiros: "cadastros/porteiros",
  condutores: "cadastros/condutores",
  setores: "cadastros/setores",
  postoSetores: "cadastros/postoSetores",
  jogos: "cadastros/jogos",
  chaves: "cadastros/chaves",
  empilhadeiras: "cadastros/empilhadeiras",
  guardas: "cadastros/guardas",
  veiculos: "cadastros/veiculos",
  postoConfig: "cadastros/postoConfig"
};

const cadastroState = {
  porteiros: {},
  condutores: {},
  setores: {},
  postoSetores: {},
  jogos: {},
  chaves: {},
  empilhadeiras: {},
  guardas: {},
  veiculos: {},
  postoConfig: {}
};

const cadastroEditando = {
  chaves: null,
  empilhadeiras: null,
  guardas: null,
  veiculos: null
};

const cadastroPainelPadrao = "veiculos";
const cadastroSubPainelPadrao = "posto-setores";

function criarCadastroKey(nome) {
  return normalizarTexto(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function selecionarPainelCadastro(tipo) {
  document.querySelectorAll("[data-cadastro-panel]").forEach(panel => {
    panel.classList.toggle("is-active", panel.dataset.cadastroPanel === tipo);
  });

  document.querySelectorAll("[data-cadastro-panel-trigger]").forEach(botao => {
    botao.classList.toggle("active", botao.dataset.cadastroPanelTrigger === tipo);
  });
}

function selecionarSubPainelCadastro(tipo) {
  document.querySelectorAll("[data-cadastro-subpanel]").forEach(panel => {
    panel.classList.toggle("is-active", panel.dataset.cadastroSubpanel === tipo);
  });

  document.querySelectorAll("[data-cadastro-subpanel-trigger]").forEach(botao => {
    botao.classList.toggle("active", botao.dataset.cadastroSubpanelTrigger === tipo);
  });
}

function ordenarCadastrosAtivos(dados) {
  return Object.values(dados || {})
    .filter(item => item && item.ativo !== false)
    .map(item => normalizarTexto(item.nome || ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function ordenarChavesAtivas(dados) {
  return Object.values(dados || {})
    .filter(item => item && item.ativo !== false)
    .map(item => ({
      numero: String(item.numero || "").trim(),
      sala: normalizarTexto(item.sala || "")
    }))
    .filter(item => item.numero && item.sala)
    .sort((a, b) => {
      const numeroA = Number(a.numero);
      const numeroB = Number(b.numero);
      if (Number.isFinite(numeroA) && Number.isFinite(numeroB) && numeroA !== numeroB) {
        return numeroA - numeroB;
      }
      return String(a.numero).localeCompare(String(b.numero), "pt-BR", { numeric: true });
    });
}

function sincronizarArrayCadastro(destino, valores) {
  destino.splice(0, destino.length, ...valores);
}

function ordenarVeiculosAtivos(dados) {
  return Object.values(dados || {})
    .filter(item => item && item.ativo !== false)
    .map(item => ({
      placa: normalizarTexto(item.placa || ""),
      nome: normalizarTexto(item.nome || ""),
      img: String(item.img || "").trim() || "carro.png"
    }))
    .filter(item => item.placa && item.nome)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function ordenarEmpilhadeirasAtivas(dados) {
  return Object.values(dados || {})
    .filter(item => item && item.ativo !== false)
    .map(item => ({
      numero: String(item.numero || "").trim().padStart(2, "0"),
      nome: normalizarTexto(item.nome || "")
    }))
    .filter(item => item.numero)
    .sort((a, b) => String(a.numero).localeCompare(String(b.numero), "pt-BR", { numeric: true }));
}


function ordenarGuardasAtivos(dados) {
  return Object.values(dados || {})
    .filter(item => item && item.ativo !== false)
    .map(item => ({
      numero: String(item.numero || "").trim().padStart(2, "0"),
      nome: normalizarTexto(item.nome || "")
    }))
    .filter(item => item.numero)
    .sort((a, b) => String(a.numero).localeCompare(String(b.numero), "pt-BR", { numeric: true }));
}
function criarCadastroChaveKey(numero) {
  return `CHAVE_${String(numero || "").trim().replace(/[^A-Z0-9]+/gi, "_").replace(/^_+|_+$/g, "")}`;
}

function criarCadastroVeiculoKey(placa) {
  return `VEICULO_${criarCadastroKey(placa)}`;
}

function criarCadastroEmpilhadeiraKey(numero) {
  return `EMPILHADEIRA_${String(numero || "").trim().replace(/[^A-Z0-9]+/gi, "_").replace(/^_+|_+$/g, "")}`;
}

function criarCadastroGuardaKey(numero) {
  return `GUARDA_${String(numero || "").trim().replace(/[^A-Z0-9]+/gi, "_").replace(/^_+|_+$/g, "")}`;
}

function obterNomeCadastroItem(tipo, item) {
  if (tipo === "chaves") return `NÂº ${item.numero || "-"} - ${item.sala || "-"}`;
  if (tipo === "empilhadeiras") return `Empilhadeira ${item.numero || "-"}${item.nome ? ` - ${item.nome}` : ""}`;
  if (tipo === "guardas") return `Guarda-chuva ${item.numero || "-"}${item.nome ? ` - ${item.nome}` : ""}`;
  if (tipo === "veiculos") return `${item.nome || "-"} - ${item.placa || "-"}`;
  return item.nome || "-";
}

function obterStatusCadastroItem(tipo, item, ativo) {
  if (tipo === "chaves") return ativo ? "DisponÃ­vel nas listas" : "Inativa";
  if (tipo === "empilhadeiras") return ativo ? "Disponivel para abastecimento" : "Inativa";
  if (tipo === "guardas") return ativo ? "Disponivel para retirada" : "Inativo";
  if (tipo === "veiculos") return ativo ? "Disponivel na frota" : "Inativo";
  return ativo ? "Ativo nas listas" : "Inativo";
}

function criarMidiaCadastroVeiculo(item) {
  const media = document.createElement("div");
  media.className = "cadastro-row-media";

  const imagem = document.createElement("img");
  const imgSrc = String(item.img || "").trim();
  imagem.src = imgSrc.startsWith("http") || imgSrc.startsWith("data:")
    ? imgSrc
    : `imagens/${imgSrc || "carro.png"}`;
  imagem.alt = item.nome || "Veiculo";
  imagem.addEventListener("error", () => {
    imagem.src = "https://cdn-icons-png.flaticon.com/512/741/741407.png";
  }, { once: true });

  media.appendChild(imagem);
  return media;
}

function renderCadastroLista(tipo, containerId, vazio) {
  const container = getById(containerId);
  if (!container) return;
  limparConteudoElemento(container);

  const dados = Object.entries(cadastroState[tipo] || {}).sort(([, a], [, b]) => {
    if (tipo === "chaves" || tipo === "empilhadeiras" || tipo === "guardas") {
      return String(a.numero || "").localeCompare(String(b.numero || ""), "pt-BR", { numeric: true });
    }
    if (tipo === "veiculos") {
      return normalizarTexto(a.nome || "").localeCompare(normalizarTexto(b.nome || ""), "pt-BR");
    }
    return normalizarTexto(a.nome || "").localeCompare(normalizarTexto(b.nome || ""), "pt-BR");
  });

  if (!dados.length) {
    container.appendChild(criarParagrafoVazio(vazio));
    return;
  }

  dados.forEach(([id, item]) => {
    const ativo = item.ativo !== false;
    const row = document.createElement("div");
    row.className = `cadastro-row ${ativo ? "" : "is-inactive"}`.trim();
    if (tipo === "veiculos") row.classList.add("cadastro-row--vehicle");

    const info = document.createElement("div");
    info.className = "cadastro-row-info";

    const nome = document.createElement("strong");
    nome.textContent = obterNomeCadastroItem(tipo, item);

    const status = document.createElement("span");
    status.textContent = obterStatusCadastroItem(tipo, item, ativo);

    if (tipo === "veiculos") {
      const placa = document.createElement("span");
      placa.className = "cadastro-row-subline";
      placa.textContent = item.placa || "-";

      const detalhe = document.createElement("span");
      detalhe.className = "cadastro-row-detail";
      detalhe.textContent = item.img ? `Imagem: ${item.img}` : "Sem imagem definida";

      const tags = document.createElement("div");
      tags.className = "cadastro-row-tags";

      const statusTag = document.createElement("span");
      statusTag.className = `cadastro-tag ${ativo ? "is-active" : "is-inactive"}`;
      statusTag.textContent = ativo ? "Ativo" : "Inativo";

      tags.append(statusTag);
      info.append(nome, placa, detalhe, tags);
      row.appendChild(criarMidiaCadastroVeiculo(item));
    } else {
      info.append(nome, status);
    }

    const actions = document.createElement("div");
    actions.className = "cadastro-row-actions";

    if (["chaves", "veiculos", "empilhadeiras", "guardas"].includes(tipo)) {
      const editar = document.createElement("button");
      editar.type = "button";
      editar.className = "cadastro-action";
      editar.textContent = "Editar";
      editar.dataset.cadastroAction =
        tipo === "chaves" ? "editar-chaves" :
        tipo === "veiculos" ? "editar-veiculos" :
        tipo === "empilhadeiras" ? "editar-empilhadeiras" :
        "editar-guardas";
      editar.dataset.id = id;
      actions.appendChild(editar);
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = ativo ? "cadastro-action danger" : "cadastro-action";
    toggle.textContent = ativo ? "Desativar" : "Ativar";
    toggle.dataset.cadastroAction = ativo ? `desativar-${tipo}` : `ativar-${tipo}`;
    toggle.dataset.id = id;

    const excluir = document.createElement("button");
    excluir.type = "button";
    excluir.className = "cadastro-action danger solid";
    excluir.textContent = "Excluir";
    excluir.dataset.cadastroAction = `excluir-${tipo}`;
    excluir.dataset.id = id;

    actions.append(toggle, excluir);
    row.append(info, actions);
    container.appendChild(row);
  });
}

function renderCadastros() {
  renderCadastroLista("porteiros", "listaCadastroPorteiros", "Nenhum porteiro cadastrado.");
  renderCadastroLista("condutores", "listaCadastroCondutores", "Nenhum condutor cadastrado.");
  renderCadastroLista("setores", "listaCadastroSetores", "Nenhum setor cadastrado.");
  renderCadastroLista("postoSetores", "listaCadastroPostoSetores", "Nenhum setor do posto cadastrado.");
  renderCadastroLista("jogos", "listaCadastroJogos", "Nenhum jogo cadastrado.");
  renderCadastroLista("chaves", "listaCadastroChaves", "Nenhuma chave cadastrada.");
  renderCadastroLista("empilhadeiras", "listaCadastroEmpilhadeiras", "Nenhuma empilhadeira cadastrada.");
  renderCadastroLista("guardas", "listaCadastroGuardas", "Nenhum guarda-chuva cadastrado.");
  renderCadastroLista("veiculos", "listaCadastroVeiculos", "Nenhum veÃ­culo cadastrado.");
  preencherFormularioPostoConfig();
  refreshLucideIcons();
}

function atualizarListasDinamicas() {
  sincronizarArrayCadastro(porteirosAutorizados, ordenarCadastrosAtivos(cadastroState.porteiros));
  sincronizarArrayCadastro(condutoresAutorizados, ordenarCadastrosAtivos(cadastroState.condutores));
  sincronizarArrayCadastro(setoresGuardas, ordenarCadastrosAtivos(cadastroState.setores));
  sincronizarArrayCadastro(setoresPosto, ordenarCadastrosAtivos(cadastroState.postoSetores));
  sincronizarArrayCadastro(jogosDisponiveis, ordenarCadastrosAtivos(cadastroState.jogos));
  sincronizarArrayCadastro(chavesCadastradas, ordenarChavesAtivas(cadastroState.chaves));
  sincronizarArrayCadastro(empilhadeirasDisponiveis, ordenarEmpilhadeirasAtivas(cadastroState.empilhadeiras).map(item => item.numero));
  sincronizarArrayCadastro(guardasDisponiveis, ordenarGuardasAtivos(cadastroState.guardas).map(item => item.numero));
  sincronizarArrayCadastro(veiculosCadastrados, ordenarVeiculosAtivos(cadastroState.veiculos));
  window.postoConfigCadastro = cadastroState.postoConfig || {};
  if (typeof renderListaVeiculos === "function") renderListaVeiculos(statusVeiculosAtual || {});
  if (typeof preencherSelectAgendamentoVeiculos === "function") preencherSelectAgendamentoVeiculos();
  if (typeof atualizarEstadoCampoEmpilhadeira === "function") atualizarEstadoCampoEmpilhadeira();
  if (typeof atualizarEstadoCampoGuarda === "function") atualizarEstadoCampoGuarda();
  if (typeof renderRelatorioVeiculosResumo === "function") renderRelatorioVeiculosResumo();
  if (typeof renderRelatorioAgendamentos === "function") renderRelatorioAgendamentos();
  if (typeof renderRelatorioChaves === "function") renderRelatorioChaves();
  if (typeof renderRelatorioGuarda === "function") renderRelatorioGuarda();
}

function obterValorNumericoCadastroPosto(id) {
  let texto = String(getById(id)?.value || "").trim();
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

function preencherFormularioPostoConfig() {
  const config = cadastroState.postoConfig || {};
  const mapa = [
    ["cadastroPostoS10Estoque", config.s10?.estoqueInicial],
    ["cadastroPostoS10Contador", config.s10?.contadorInicial],
    ["cadastroPostoS500Estoque", config.s500?.estoqueInicial],
    ["cadastroPostoS500Contador", config.s500?.contadorInicial],
    ["cadastroPostoArlaEstoque", config.arla?.estoqueInicial],
    ["cadastroPostoArlaContador", config.arla?.contadorInicial]
  ];

  mapa.forEach(([id, valor]) => {
    const campo = getById(id);
    if (!campo) return;
    campo.value = valor != null ? Number(valor).toFixed(2) : "";
  });
}

function limparCadastroPostoConfig() {
  [
    "cadastroPostoS10Estoque",
    "cadastroPostoS10Contador",
    "cadastroPostoS500Estoque",
    "cadastroPostoS500Contador",
    "cadastroPostoArlaEstoque",
    "cadastroPostoArlaContador"
  ].forEach(id => {
    const campo = getById(id);
    if (campo) campo.value = "";
  });
}

function salvarCadastroPostoConfig() {
  const payload = {
    s10: {
      estoqueInicial: obterValorNumericoCadastroPosto("cadastroPostoS10Estoque"),
      contadorInicial: obterValorNumericoCadastroPosto("cadastroPostoS10Contador")
    },
    s500: {
      estoqueInicial: obterValorNumericoCadastroPosto("cadastroPostoS500Estoque"),
      contadorInicial: obterValorNumericoCadastroPosto("cadastroPostoS500Contador")
    },
    arla: {
      estoqueInicial: obterValorNumericoCadastroPosto("cadastroPostoArlaEstoque"),
      contadorInicial: obterValorNumericoCadastroPosto("cadastroPostoArlaContador")
    },
    atualizadoEm: new Date().toLocaleString("pt-BR")
  };

  db.ref(cadastroRefs.postoConfig).set(payload)
    .then(() => {
      window.postoConfigCadastro = payload;
      cadastroState.postoConfig = payload;
      avisoSucesso("Base do posto salva com sucesso.", "fuel");
    })
    .catch(() => avisoErro("Erro ao salvar a base do posto."));
}

function semearCadastroSeVazio(tipo, valores) {
  const ref = db.ref(cadastroRefs[tipo]);
  return ref.once("value").then(snap => {
    if (snap.exists()) return;
    const payload = {};
    valores.forEach(nome => {
      const nomeNormalizado = normalizarTexto(nome);
      payload[criarCadastroKey(nomeNormalizado)] = {
        nome: nomeNormalizado,
        ativo: true,
        origem: "inicial"
      };
    });
    return ref.set(payload);
  });
}

function semearChavesSeVazio() {
  const ref = db.ref(cadastroRefs.chaves);
  return ref.once("value").then(snap => {
    if (snap.exists()) return;
    const payload = {};
    chavesCadastradas.forEach(item => {
      const numero = String(item.numero || "").trim();
      const sala = normalizarTexto(item.sala || "");
      if (!numero || !sala) return;
      payload[criarCadastroChaveKey(numero)] = {
        numero,
        sala,
        ativo: true,
        origem: "inicial"
      };
    });
    return ref.set(payload);
  });
}

function semearVeiculosSeVazio() {
  const ref = db.ref(cadastroRefs.veiculos);
  return ref.once("value").then(snap => {
    if (snap.exists()) return;
    const payload = {};
    veiculosCadastrados.forEach(item => {
      const placa = normalizarTexto(item.placa || "");
      const nome = normalizarTexto(item.nome || "");
      if (!placa || !nome) return;
      payload[criarCadastroVeiculoKey(placa)] = {
        placa,
        nome,
        img: item.img || "",
        ativo: true,
        origem: "inicial"
      };
    });
    return ref.set(payload);
  });
}

function semearEmpilhadeirasSeVazio() {
  const ref = db.ref(cadastroRefs.empilhadeiras);
  return ref.once("value").then(snap => {
    if (snap.exists()) return;
    const payload = {};
    empilhadeirasDisponiveis.forEach(numero => {
      const numeroNormalizado = String(numero || "").trim().padStart(2, "0");
      if (!numeroNormalizado) return;
      payload[criarCadastroEmpilhadeiraKey(numeroNormalizado)] = {
        numero: numeroNormalizado,
        nome: `EMPILHADEIRA ${numeroNormalizado}`,
        ativo: true,
        origem: "inicial"
      };
    });
    return ref.set(payload);
  });
}


function semearGuardasSeVazio() {
  const ref = db.ref(cadastroRefs.guardas);
  return ref.once("value").then(snap => {
    if (snap.exists()) return;
    const payload = {};
    guardasDisponiveis.forEach(numero => {
      const numeroNormalizado = String(numero || "").trim().padStart(2, "0");
      if (!numeroNormalizado) return;
      payload[criarCadastroGuardaKey(numeroNormalizado)] = {
        numero: numeroNormalizado,
        nome: `GUARDA-CHUVA ${numeroNormalizado}`,
        ativo: true,
        origem: "inicial"
      };
    });
    return ref.set(payload);
  });
}

function iniciarCadastroListener(tipo) {
  db.ref(cadastroRefs[tipo]).on("value", snap => {
    cadastroState[tipo] = snap.val() || {};
    atualizarListasDinamicas();
    renderCadastros();
  });
}

function salvarCadastro(tipo, inputId, label) {
  const input = getById(inputId);
  const nome = normalizarTexto(input?.value || "");
  if (!nome) {
    avisoValidacao(`Informe o nome do ${label}.`);
    return;
  }

  const id = criarCadastroKey(nome);
  db.ref(`${cadastroRefs[tipo]}/${id}`).once("value").then(snap => {
    if (snap.exists()) {
      avisoValidacao(`${label[0].toUpperCase()}${label.slice(1)} jÃ¡ estÃ¡ ativo na lista.`);
      return;
    }

    return db.ref(`${cadastroRefs[tipo]}/${id}`).set({
      nome,
      ativo: true,
      atualizadoEm: new Date().toLocaleString("pt-BR")
    }).then(() => {
      if (input) input.value = "";
      avisoSucesso(`${label[0].toUpperCase()}${label.slice(1)} cadastrado com sucesso.`, "check-circle-2");
    });
  }).catch(() => avisoErro(`Erro ao salvar ${label}.`));
}

function salvarCadastroChave() {
  const inputNumero = getById("cadastroChaveNumero");
  const inputSala = getById("cadastroChaveSala");
  const numero = String(inputNumero?.value || "").trim();
  const sala = normalizarTexto(inputSala?.value || "");

  if (!numero || !sala) {
    avisoValidacao("Informe o nÃºmero e a sala/setor da chave.");
    return;
  }

  const id = criarCadastroChaveKey(numero);
  if (cadastroEditando.chaves && cadastroEditando.chaves !== id) {
    avisoValidacao("Para trocar o numero da chave, exclua o cadastro antigo e crie outro.");
    return;
  }

  db.ref(`${cadastroRefs.chaves}/${id}`).once("value").then(snap => {
    if (snap.exists() && cadastroEditando.chaves !== id) {
      avisoValidacao("Essa chave ja existe no cadastro.");
      return;
    }

    return db.ref(`${cadastroRefs.chaves}/${id}`).set({
      numero,
      sala,
      ativo: true,
      atualizadoEm: new Date().toLocaleString("pt-BR")
    }).then(() => {
      if (inputNumero) inputNumero.value = "";
      if (inputSala) inputSala.value = "";
      cadastroEditando.chaves = null;
      avisoSucesso("Chave salva com sucesso.", "key-round");
    });
  }).catch(() => avisoErro("Erro ao salvar chave."));
}

function editarCadastroChave(id) {
  const item = cadastroState.chaves?.[id];
  if (!item) return;
  const inputNumero = getById("cadastroChaveNumero");
  const inputSala = getById("cadastroChaveSala");
  if (inputNumero) inputNumero.value = item.numero || "";
  if (inputSala) {
    inputSala.value = item.sala || "";
    inputSala.focus();
  }
  cadastroEditando.chaves = id;
}

function salvarCadastroVeiculo() {
  const inputPlaca = getById("cadastroVeiculoPlaca");
  const inputNome = getById("cadastroVeiculoNome");
  const inputImagem = getById("cadastroVeiculoImagem");
  const placa = normalizarTexto(inputPlaca?.value || "");
  const nome = normalizarTexto(inputNome?.value || "");
  const img = String(inputImagem?.value || "").trim();

  if (!placa || !nome) {
    avisoValidacao("Informe a placa e o nome do veiculo.");
    return;
  }

  const id = criarCadastroVeiculoKey(placa);
  if (cadastroEditando.veiculos && cadastroEditando.veiculos !== id) {
    avisoValidacao("Para trocar a placa, exclua o cadastro antigo e crie outro.");
    return;
  }

  db.ref(`${cadastroRefs.veiculos}/${id}`).once("value").then(snap => {
    if (snap.exists() && cadastroEditando.veiculos !== id) {
      avisoValidacao("Esse veiculo ja existe no cadastro.");
      return;
    }

    return db.ref(`${cadastroRefs.veiculos}/${id}`).set({
      placa,
      nome,
      img,
      ativo: true,
      atualizadoEm: new Date().toLocaleString("pt-BR")
    }).then(() => {
      if (inputPlaca) inputPlaca.value = "";
      if (inputNome) inputNome.value = "";
      if (inputImagem) inputImagem.value = "";
      cadastroEditando.veiculos = null;
      avisoSucesso("Veiculo salvo com sucesso.", "car-front");
    });
  }).catch(() => avisoErro("Erro ao salvar veiculo."));
}

function editarCadastroVeiculo(id) {
  const item = cadastroState.veiculos?.[id];
  if (!item) return;
  const inputPlaca = getById("cadastroVeiculoPlaca");
  const inputNome = getById("cadastroVeiculoNome");
  const inputImagem = getById("cadastroVeiculoImagem");
  if (inputPlaca) inputPlaca.value = item.placa || "";
  if (inputNome) inputNome.value = item.nome || "";
  if (inputImagem) inputImagem.value = item.img || "";
  inputNome?.focus();
  cadastroEditando.veiculos = id;
}

function salvarCadastroEmpilhadeira() {
  const inputNumero = getById("cadastroEmpilhadeiraNumero");
  const inputNome = getById("cadastroEmpilhadeiraNome");
  const numero = String(inputNumero?.value || "").trim().padStart(2, "0");
  const nome = normalizarTexto(inputNome?.value || "") || `EMPILHADEIRA ${numero}`;

  if (!numero) {
    avisoValidacao("Informe o numero da empilhadeira.");
    return;
  }

  const id = criarCadastroEmpilhadeiraKey(numero);
  if (cadastroEditando.empilhadeiras && cadastroEditando.empilhadeiras !== id) {
    avisoValidacao("Para trocar o numero, exclua o cadastro antigo e crie outro.");
    return;
  }

  db.ref(`${cadastroRefs.empilhadeiras}/${id}`).once("value").then(snap => {
    if (snap.exists() && cadastroEditando.empilhadeiras !== id) {
      avisoValidacao("Essa empilhadeira ja existe no cadastro.");
      return;
    }

    return db.ref(`${cadastroRefs.empilhadeiras}/${id}`).set({
      numero,
      nome,
      ativo: true,
      atualizadoEm: new Date().toLocaleString("pt-BR")
    }).then(() => {
      if (inputNumero) inputNumero.value = "";
      if (inputNome) inputNome.value = "";
      cadastroEditando.empilhadeiras = null;
      avisoSucesso("Empilhadeira salva com sucesso.", "forklift");
    });
  }).catch(() => avisoErro("Erro ao salvar empilhadeira."));
}

function editarCadastroEmpilhadeira(id) {
  const item = cadastroState.empilhadeiras?.[id];
  if (!item) return;
  const inputNumero = getById("cadastroEmpilhadeiraNumero");
  const inputNome = getById("cadastroEmpilhadeiraNome");
  if (inputNumero) inputNumero.value = item.numero || "";
  if (inputNome) inputNome.value = item.nome || "";
  inputNome?.focus();
  cadastroEditando.empilhadeiras = id;
}


function salvarCadastroGuarda() {
  const inputNumero = getById("cadastroGuardaNumero");
  const inputNome = getById("cadastroGuardaNome");
  const numero = String(inputNumero?.value || "").trim().padStart(2, "0");
  const nome = normalizarTexto(inputNome?.value || "") || `GUARDA-CHUVA ${numero}`;

  if (!numero) {
    avisoValidacao("Informe o numero do guarda-chuva.");
    return;
  }

  const id = criarCadastroGuardaKey(numero);
  if (cadastroEditando.guardas && cadastroEditando.guardas !== id) {
    avisoValidacao("Para trocar o numero, exclua o cadastro antigo e crie outro.");
    return;
  }

  db.ref(`${cadastroRefs.guardas}/${id}`).once("value").then(snap => {
    if (snap.exists() && cadastroEditando.guardas !== id) {
      avisoValidacao("Esse guarda-chuva ja existe no cadastro.");
      return;
    }

    return db.ref(`${cadastroRefs.guardas}/${id}`).set({
      numero,
      nome,
      ativo: true,
      atualizadoEm: new Date().toLocaleString("pt-BR")
    }).then(() => {
      if (inputNumero) inputNumero.value = "";
      if (inputNome) inputNome.value = "";
      cadastroEditando.guardas = null;
      avisoSucesso("Guarda-chuva salvo com sucesso.", "umbrella");
    });
  }).catch(() => avisoErro("Erro ao salvar guarda-chuva."));
}

function editarCadastroGuarda(id) {
  const item = cadastroState.guardas?.[id];
  if (!item) return;
  const inputNumero = getById("cadastroGuardaNumero");
  const inputNome = getById("cadastroGuardaNome");
  if (inputNumero) inputNumero.value = item.numero || "";
  if (inputNome) inputNome.value = item.nome || "";
  inputNome?.focus();
  cadastroEditando.guardas = id;
}

function alternarCadastro(tipo, id, ativo) {
  db.ref(`${cadastroRefs[tipo]}/${id}`).update({
    ativo,
    atualizadoEm: new Date().toLocaleString("pt-BR")
  }).then(() => {
    avisoSucesso(ativo ? "Cadastro ativado." : "Cadastro desativado.");
  }).catch(() => avisoErro("Erro ao atualizar cadastro."));
}

async function excluirCadastro(tipo, id) {
  const item = cadastroState[tipo]?.[id];
  if (!item) return;

  const nome = tipo === "chaves"
    ? `Chave ${item.numero || ""} - ${item.sala || ""}`
    : tipo === "veiculos"
      ? `${item.nome || ""} - ${item.placa || ""}`
      : tipo === "empilhadeiras"
        ? `Empilhadeira ${item.numero || ""}${item.nome ? ` - ${item.nome}` : ""}`
        : tipo === "guardas"
          ? `Guarda-chuva ${item.numero || ""}${item.nome ? ` - ${item.nome}` : ""}`
        : item.nome || "Cadastro";
  const confirmado = await confirmarAcao({
    titulo: "Excluir cadastro?",
    mensagem: nome,
    detalhe: "Essa acao remove o item da lista de cadastros.",
    confirmarTexto: "Excluir",
    cancelarTexto: "Cancelar"
  });

  if (!confirmado) return;

  const remover = () => db.ref(`${cadastroRefs[tipo]}/${id}`).remove().then(() => {
    if (tipo === "chaves" && cadastroEditando.chaves === id) cadastroEditando.chaves = null;
    if (tipo === "empilhadeiras" && cadastroEditando.empilhadeiras === id) cadastroEditando.empilhadeiras = null;
    if (tipo === "guardas" && cadastroEditando.guardas === id) cadastroEditando.guardas = null;
    if (tipo === "veiculos" && cadastroEditando.veiculos === id) cadastroEditando.veiculos = null;
    avisoSucesso("Cadastro excluido.");
  });

  if (tipo !== "chaves" && tipo !== "veiculos" && tipo !== "empilhadeiras" && tipo !== "guardas") {
    remover().catch(() => avisoErro("Erro ao excluir cadastro."));
    return;
  }

  if (tipo === "guardas") {
    db.ref("guardachuvas_em_uso").once("value").then(snap => {
      const emUso = Object.values(snap.val() || {}).some(itemUso => String(itemUso.numero || "") === String(item.numero));
      if (emUso) {
        avisoValidacao("Nao e possivel excluir um guarda-chuva que esta em uso.");
        return;
      }
      return remover();
    }).catch(() => avisoErro("Erro ao excluir cadastro."));
    return;
  }

  if (tipo === "empilhadeiras") {
    const hoje = new Date().toLocaleDateString("pt-BR");
    db.ref("abastecimentos").once("value").then(snap => {
      const abastecidaHoje = Object.values(snap.val() || {}).some(itemAbast => itemAbast.data === hoje && String(itemAbast.num || "") === String(item.numero));
      if (abastecidaHoje) {
        avisoValidacao("Nao e possivel excluir uma empilhadeira ja abastecida hoje.");
        return;
      }
      return remover();
    }).catch(() => avisoErro("Erro ao excluir cadastro."));
    return;
  }

  if (tipo === "veiculos") {
    db.ref("status_veiculos").once("value").then(snap => {
      const emUso = Object.values(snap.val() || {}).some(veiculo => String(veiculo.placa) === String(item.placa) && veiculo.emUso);
      if (emUso) {
        avisoValidacao("Nao e possivel excluir um veiculo que esta na rua.");
        return;
      }
      return remover();
    }).catch(() => avisoErro("Erro ao excluir cadastro."));
    return;
  }

  db.ref("chaves_em_uso").once("value").then(snap => {
    const emUso = Object.values(snap.val() || {}).some(chave => String(chave.num) === String(item.numero));
    if (emUso) {
      avisoValidacao("Nao e possivel excluir uma chave que esta em uso.");
      return;
    }
    return remover();
  }).catch(() => avisoErro("Erro ao excluir cadastro."));
}

function vincularAcoesCadastros() {
  document.addEventListener("click", event => {
    const tab = event.target.closest("[data-cadastro-panel-trigger]");
    if (tab) {
      selecionarPainelCadastro(tab.dataset.cadastroPanelTrigger);
      return;
    }

    const subtab = event.target.closest("[data-cadastro-subpanel-trigger]");
    if (subtab) {
      selecionarSubPainelCadastro(subtab.dataset.cadastroSubpanelTrigger);
      return;
    }

    const trigger = event.target.closest("[data-cadastro-action]");
    if (!trigger) return;

    const action = trigger.dataset.cadastroAction;
    if (action === "salvar-porteiro") return salvarCadastro("porteiros", "cadastroPorteiroNome", "porteiro");
    if (action === "salvar-condutor") return salvarCadastro("condutores", "cadastroCondutorNome", "condutor");
    if (action === "salvar-setor") return salvarCadastro("setores", "cadastroSetorNome", "setor");
    if (action === "salvar-posto-setor") return salvarCadastro("postoSetores", "cadastroPostoSetorNome", "setor do posto");
    if (action === "salvar-posto-config") return salvarCadastroPostoConfig();
    if (action === "limpar-posto-config") return limparCadastroPostoConfig();
    if (action === "salvar-jogo-cadastro") return salvarCadastro("jogos", "cadastroJogoNome", "jogo");
    if (action === "salvar-chave-cadastro") return salvarCadastroChave();
    if (action === "salvar-empilhadeira-cadastro") return salvarCadastroEmpilhadeira();
    if (action === "salvar-guarda-cadastro") return salvarCadastroGuarda();
    if (action === "salvar-veiculo-cadastro") return salvarCadastroVeiculo();
    if (action === "editar-chaves") return editarCadastroChave(trigger.dataset.id);
    if (action === "editar-empilhadeiras") return editarCadastroEmpilhadeira(trigger.dataset.id);
    if (action === "editar-guardas") return editarCadastroGuarda(trigger.dataset.id);
    if (action === "editar-veiculos") return editarCadastroVeiculo(trigger.dataset.id);
    if (action === "desativar-porteiros") return alternarCadastro("porteiros", trigger.dataset.id, false);
    if (action === "ativar-porteiros") return alternarCadastro("porteiros", trigger.dataset.id, true);
    if (action === "desativar-condutores") return alternarCadastro("condutores", trigger.dataset.id, false);
    if (action === "ativar-condutores") return alternarCadastro("condutores", trigger.dataset.id, true);
    if (action === "desativar-setores") return alternarCadastro("setores", trigger.dataset.id, false);
    if (action === "ativar-setores") return alternarCadastro("setores", trigger.dataset.id, true);
    if (action === "desativar-postoSetores") return alternarCadastro("postoSetores", trigger.dataset.id, false);
    if (action === "ativar-postoSetores") return alternarCadastro("postoSetores", trigger.dataset.id, true);
    if (action === "desativar-jogos") return alternarCadastro("jogos", trigger.dataset.id, false);
    if (action === "ativar-jogos") return alternarCadastro("jogos", trigger.dataset.id, true);
    if (action === "desativar-chaves") return alternarCadastro("chaves", trigger.dataset.id, false);
    if (action === "ativar-chaves") return alternarCadastro("chaves", trigger.dataset.id, true);
    if (action === "desativar-empilhadeiras") return alternarCadastro("empilhadeiras", trigger.dataset.id, false);
    if (action === "ativar-empilhadeiras") return alternarCadastro("empilhadeiras", trigger.dataset.id, true);
    if (action === "desativar-guardas") return alternarCadastro("guardas", trigger.dataset.id, false);
    if (action === "ativar-guardas") return alternarCadastro("guardas", trigger.dataset.id, true);
    if (action === "desativar-veiculos") return alternarCadastro("veiculos", trigger.dataset.id, false);
    if (action === "ativar-veiculos") return alternarCadastro("veiculos", trigger.dataset.id, true);
    if (action === "excluir-porteiros") return excluirCadastro("porteiros", trigger.dataset.id);
    if (action === "excluir-condutores") return excluirCadastro("condutores", trigger.dataset.id);
    if (action === "excluir-setores") return excluirCadastro("setores", trigger.dataset.id);
    if (action === "excluir-postoSetores") return excluirCadastro("postoSetores", trigger.dataset.id);
    if (action === "excluir-jogos") return excluirCadastro("jogos", trigger.dataset.id);
    if (action === "excluir-chaves") return excluirCadastro("chaves", trigger.dataset.id);
    if (action === "excluir-empilhadeiras") return excluirCadastro("empilhadeiras", trigger.dataset.id);
    if (action === "excluir-guardas") return excluirCadastro("guardas", trigger.dataset.id);
    if (action === "excluir-veiculos") return excluirCadastro("veiculos", trigger.dataset.id);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  vincularAcoesCadastros();
  selecionarPainelCadastro(cadastroPainelPadrao);
  selecionarSubPainelCadastro(cadastroSubPainelPadrao);
  Promise.all([
    semearCadastroSeVazio("porteiros", porteirosAutorizados),
    semearCadastroSeVazio("condutores", condutoresAutorizados),
    semearCadastroSeVazio("setores", setoresGuardas),
    semearCadastroSeVazio("postoSetores", setoresPosto),
    semearCadastroSeVazio("jogos", jogosDisponiveis),
    semearChavesSeVazio(),
    semearEmpilhadeirasSeVazio(),
    semearGuardasSeVazio(),
    semearVeiculosSeVazio()
  ]).finally(() => {
    iniciarCadastroListener("porteiros");
    iniciarCadastroListener("condutores");
    iniciarCadastroListener("setores");
    iniciarCadastroListener("postoSetores");
    iniciarCadastroListener("jogos");
    iniciarCadastroListener("chaves");
    iniciarCadastroListener("empilhadeiras");
    iniciarCadastroListener("guardas");
    iniciarCadastroListener("veiculos");
    db.ref(cadastroRefs.postoConfig).on("value", snap => {
      cadastroState.postoConfig = snap.val() || {};
      atualizarListasDinamicas();
      renderCadastros();
    });
  });
});


















