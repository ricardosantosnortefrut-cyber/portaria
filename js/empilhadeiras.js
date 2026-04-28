// --- Empilhadeiras ---
function limparFormEmpilhadeiraCampos() {
  ["ab_num", "ab_motorista"].forEach(id => {
    const campo = getById(id);
    if (campo) campo.value = "";
  });
  if (typeof preencherCamposOperadorAtual === "function") preencherCamposOperadorAtual();

  ["lista_empilhadeiras_num"].forEach(id => {
    const lista = getById(id);
    if (!lista) return;
    limparConteudoElemento(lista);
    ocultarListaAutocomplete(lista);
  });
}

function atualizarEstadoCampoEmpilhadeira() {
  const campo = getById("ab_num");
  const botaoSalvar = document.querySelector('#formAbast [data-action="salvar-empilhadeira"]');
  if (!campo) return;

  obterEmpilhadeirasDisponiveisHoje().then(disponiveis => {
    const semDisponiveis = disponiveis.length === 0;
    campo.disabled = semDisponiveis;
    campo.placeholder = semDisponiveis
      ? "Sem empilhadeiras disponíveis para abastecer hoje"
      : "Selecione a empilhadeira...";

    if (semDisponiveis) {
      campo.value = "";
      const lista = getById("lista_empilhadeiras_num");
      if (lista) {
        limparConteudoElemento(lista);
        ocultarListaAutocomplete(lista);
      }
    }

    if (botaoSalvar) {
      botaoSalvar.disabled = semDisponiveis;
    }
  });
}

function configurarAutocompleteEmpilhadeira(inputId, listaId, getOpcoes) {
  const input = getById(inputId);
  const lista = getById(listaId);
  if (!input || !lista || input.dataset.autocompleteReady === "true") return;
  habilitarTecladoAutocomplete(input, lista);

  async function renderResultados() {
    if (input.disabled) {
      limparConteudoElemento(lista);
      ocultarListaAutocomplete(lista);
      return;
    }

    const opcoes = await Promise.resolve(getOpcoes());
    const termo = normalizarTexto(input.value || "");
    const resultados = termo ? opcoes.filter(opcao => opcao.includes(termo)) : opcoes;

    if (!resultados.length) {
      limparConteudoElemento(lista);
      ocultarListaAutocomplete(lista);
      return;
    }

    preencherAutocompleteLista(lista, resultados.map(opcao =>
      criarItemAutocomplete(opcao, () => {
        input.value = opcao;
        ocultarListaAutocomplete(lista);
      })
    ));
    mostrarListaAutocomplete(lista);
  }

  input.addEventListener("input", renderResultados);
  input.addEventListener("focus", renderResultados);
  document.addEventListener("click", e => {
    if (!input.contains(e.target) && !lista.contains(e.target)) {
      ocultarListaAutocomplete(lista);
    }
  });

  input.dataset.autocompleteReady = "true";
}

function configurarAutocompletesEmpilhadeira() {
  configurarAutocompleteEmpilhadeira("ab_num", "lista_empilhadeiras_num", obterEmpilhadeirasDisponiveisHoje);
}

function obterEmpilhadeirasDisponiveisHoje() {
  const hoje = new Date().toLocaleDateString("pt-BR");
  return db.ref("abastecimentos").once("value").then(snap => {
    const registrosHoje = Object.values(snap.val() || {}).filter(item => item.data === hoje);
    const abastecidasHoje = new Set(registrosHoje.map(item => normalizarTexto(item.num || "")));
    return empilhadeirasDisponiveis.filter(numero => !abastecidasHoje.has(numero));
  });
}

function renderAbastecimentosRecentes(dados) {
  const container = getById("listaAbastecimentosRecentes");
  if (!container) return;
  limparConteudoElemento(container);

  const registros = Object.values(dados || {}).reverse().slice(0, 5);
  if (!registros.length) {
    const empty = document.createElement("div");
    empty.className = "empilhadeira-table-empty";
    empty.textContent = "Nenhum abastecimento registrado até o momento.";
    container.appendChild(empty);
    return;
  }

  registros.forEach(item => {
    const row = document.createElement("div");
    row.className = "empilhadeira-table-row";

    const data = document.createElement("span");
    data.className = "empilhadeira-cell";
    data.dataset.label = "Data";
    data.textContent = item.data || "-";

    const numero = document.createElement("span");
    numero.className = "empilhadeira-cell";
    numero.dataset.label = "Número";
    numero.textContent = item.num || "-";

    const motorista = document.createElement("span");
    motorista.className = "empilhadeira-cell";
    motorista.dataset.label = "Motorista";
    motorista.textContent = item.motorista || "-";

    const porteiro = document.createElement("span");
    porteiro.className = "empilhadeira-cell";
    porteiro.dataset.label = "Usuario";
    porteiro.textContent = item.usuarioNome || item.porteiro || "-";

    row.append(data, numero, motorista, porteiro);
    container.appendChild(row);
  });
}

function salvarAbastecimento() {
  const botao = document.activeElement;
  const num = normalizarTexto(getById("ab_num").value);
  const motorista = normalizarTexto(getById("ab_motorista").value);
  const assinatura = typeof obterAssinaturaUsuarioAtual === "function"
    ? obterAssinaturaUsuarioAtual()
    : { usuarioUid: "", usuarioLogin: "", usuarioNome: "" };
  const porteiro = normalizarTexto(assinatura.usuarioNome || getById("ab_porteiro").value || "");

  if (!porteiro) {
    avisoValidacao("Nao foi possivel identificar o usuario logado para registrar o abastecimento.");
    return;
  }

  if (!num || !motorista) {
    avisoValidacao("Preencha a empilhadeira e o motorista.");
    return;
  }

  if (!empilhadeirasDisponiveis.includes(num)) {
    avisoValidacao("Selecione uma empilhadeira válida na lista.");
    return;
  }

  const hoje = new Date().toLocaleDateString("pt-BR");

  alternarBotaoCarregando(botao, true);
  db.ref("abastecimentos").once("value").then(snap => {
    const registrosHoje = Object.values(snap.val() || {}).filter(item => item.data === hoje);

    if (registrosHoje.length >= empilhadeirasDisponiveis.length) {
      avisoValidacao("Todas as empilhadeiras ativas já foram abastecidas hoje.");
      return;
    }

    const empilhadeiraJaAbastecida = registrosHoje.some(item => normalizarTexto(item.num || "") === num);
    if (empilhadeiraJaAbastecida) {
      avisoValidacao("Essa empilhadeira já foi abastecida hoje.");
      return;
    }

    const dados = {
      num,
      motorista,
      porteiro,
      usuarioUid: assinatura.usuarioUid || "",
      usuarioLogin: assinatura.usuarioLogin || "",
      usuarioNome: assinatura.usuarioNome || "",
      data: hoje,
      hora: new Date().toLocaleTimeString("pt-BR", { hour12: false })
    };

    return db.ref("abastecimentos").push(dados).then(() => {
      avisoSucesso("Abastecimento registrado com sucesso.", "forklift");
      cancelarFormEmpilhadeira();
    });
  }).catch(() => {
    avisoErro("Erro ao registrar o abastecimento.");
  }).finally(() => {
    alternarBotaoCarregando(botao, false, "Gravar");
  });
}

function abrirFormEmpilhadeira() {
  limparFormEmpilhadeiraCampos();
  configurarAutocompletesEmpilhadeira();
  atualizarEstadoCampoEmpilhadeira();
  mostrarElemento("formAbast");
  ocultarElemento("btnAbrirEmpilhadeira");
}

function cancelarFormEmpilhadeira() {
  ocultarElemento("formAbast");
  mostrarElemento("btnAbrirEmpilhadeira");
  limparFormEmpilhadeiraCampos();
}

db.ref("abastecimentos").on("value", snap => {
  renderAbastecimentosRecentes(snap.val());
  atualizarEstadoCampoEmpilhadeira();
});
