// --- Guarda-chuvas ---
function abrirFormGuarda() {
  limparFormGuarda();
  configurarAutocompletesGuarda();
  preencherOpcoesGuarda();
  atualizarEstadoCampoGuarda();
  mostrarElemento("formGuarda");
  ocultarElemento("btnAbrirGuarda");
}

function fecharFormGuarda() {
  limparFormGuarda();
  ocultarElemento("formGuarda");
  mostrarElemento("btnAbrirGuarda");
}

function limparFormGuarda() {
  ["gu_num", "gu_quem", "gu_setor"].forEach(id => {
    getById(id).value = "";
  });
  if (typeof preencherCamposOperadorAtual === "function") preencherCamposOperadorAtual();
  ["lista_guardas_num", "lista_guardas_setor"].forEach(id => {
    const lista = getById(id);
    if (!lista) return;
    limparConteudoElemento(lista);
    ocultarListaAutocomplete(lista);
  });
}

function atualizarEstadoCampoGuarda() {
  const campo = getById("gu_num");
  const botaoSalvar = document.querySelector('#formGuarda [data-action="salvar-guarda"]');
  if (!campo) return;

  obterGuardasLivres().then(disponiveis => {
    const limiteAtingido = disponiveis.length === 0;
    campo.disabled = limiteAtingido;
    campo.placeholder = limiteAtingido
      ? "Sem guarda-chuva disponíveis"
      : "Selecione o guarda-chuva...";

    if (limiteAtingido) {
      campo.value = "";
      const lista = getById("lista_guardas_num");
      if (lista) {
        limparConteudoElemento(lista);
        ocultarListaAutocomplete(lista);
      }
    }

    if (botaoSalvar) {
      botaoSalvar.disabled = limiteAtingido;
    }
  });
}

function configurarAutocompleteGuarda(inputId, listaId, getOpcoes) {
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
    const resultados = termo
      ? opcoes.filter(opcao => opcao.includes(termo))
      : opcoes;

    if (resultados.length === 0) {
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

function configurarAutocompletesGuarda() {
  configurarAutocompleteGuarda("gu_num", "lista_guardas_num", obterGuardasLivres);
  configurarAutocompleteGuarda("gu_setor", "lista_guardas_setor", () => setoresGuardas);
}

function obterGuardasLivres() {
  return db.ref("guardachuvas_em_uso").once("value").then(snap => {
    const ativos = Object.values(snap.val() || {});
    const numerosEmUso = new Set(ativos.map(item => normalizarTexto(item.numero || "")));
    return guardasDisponiveis.filter(numero => !numerosEmUso.has(numero));
  });
}

function preencherOpcoesGuarda() {
  ["gu_num", "gu_setor"].forEach(id => {
    const campo = getById(id);
    if (campo) campo.value = "";
  });
  if (typeof preencherCamposOperadorAtual === "function") preencherCamposOperadorAtual();
}

function salvarGuarda() {
  const botao = document.activeElement;
  const assinatura = typeof obterAssinaturaUsuarioAtual === "function"
    ? obterAssinaturaUsuarioAtual()
    : { usuarioUid: "", usuarioLogin: "", usuarioNome: "" };
  const gu = {
    numero: normalizarTexto(getById("gu_num").value),
    quem: normalizarTexto(getById("gu_quem").value),
    setor: normalizarTexto(getById("gu_setor").value),
    porteiro: normalizarTexto(assinatura.usuarioNome || getById("gu_porteiro").value || ""),
    usuarioUid: assinatura.usuarioUid || "",
    usuarioLogin: assinatura.usuarioLogin || "",
    usuarioNome: assinatura.usuarioNome || "",
    dataRetirada: new Date().toLocaleDateString("pt-BR"),
    horaRetirada: new Date().toLocaleTimeString("pt-BR", { hour12: false })
  };

  if (!gu.numero || !gu.quem || !gu.setor || !gu.porteiro) {
    avisoValidacao("Preencha número, quem retirou e setor.");
    return;
  }

  if (!guardasDisponiveis.includes(gu.numero)) {
    avisoValidacao("Selecione um guarda-chuva válido da lista.");
    return;
  }

  if (!setoresGuardas.includes(gu.setor)) {
    avisoValidacao("Selecione um setor válido na lista.");
    return;
  }

  alternarBotaoCarregando(botao, true);
  db.ref("guardachuvas_em_uso").once("value").then(snap => {
    const ativos = Object.values(snap.val() || {});
    if (ativos.length >= guardasDisponiveis.length) {
      avisoValidacao("Sem guarda-chuva disponíveis.");
      return;
    }
    const patrimonioEmUso = ativos.some(item => normalizarTexto(item.numero || "") === gu.numero);
    if (patrimonioEmUso) {
      avisoValidacao("Esse guarda-chuva já está em uso no momento.");
      return;
    }

    return db.ref("guardachuvas_em_uso").push(gu).then(() => {
      avisoSucesso("Retirada de guarda-chuva registrada com sucesso.", "umbrella");
      fecharFormGuarda();
    });
  }).catch(() => {
    avisoErro("Erro ao salvar a retirada.");
  }).finally(() => {
    alternarBotaoCarregando(botao, false, "Salvar Retirada");
  });
}

function renderGuardasAtivos(dados) {
  const container = getById("guardasAtivos");
  if (!container) return;
  limparConteudoElemento(container);

  if (!dados) {
    container.appendChild(criarParagrafoVazio("Nenhum guarda-chuva em uso no momento."));
    return;
  }

  Object.entries(dados).forEach(([id, guarda]) => {
    container.appendChild(criarCardRegistro({
      classes: "card-chave card-chave--guarda",
      titulo: `Nº ${guarda.numero}`,
      linhas: [
        { icon: "user-round", text: `Retirado por: ${guarda.quem || "-"}` },
        { icon: "map-pin", text: `Setor: ${guarda.setor || "-"}` },
        { icon: "shield-check", text: `Registrado por: ${guarda.usuarioNome || guarda.porteiro || "-"}` }
      ],
      actionText: "Registrar devolução",
      actionName: "devolver-guarda",
      actionId: id
    }));
  });
}

db.ref("guardachuvas_em_uso").on("value", snap => {
  const dados = snap.val();
  atualizarIndicador("statGuardasUso", dados ? Object.keys(dados).length : 0);
  atualizarPainelPendencias();
  renderGuardasAtivos(dados);
  atualizarEstadoCampoGuarda();
  refreshLucideIcons();
});

function devolverGuarda(id) {
  db.ref(`guardachuvas_em_uso/${id}`).once("value").then(snap => {
    const original = snap.val();
    if (!original) {
      avisoErro("Guarda-chuva não encontrado.");
      return;
    }

    const assinatura = typeof obterAssinaturaUsuarioAtual === "function"
      ? obterAssinaturaUsuarioAtual()
      : { usuarioUid: "", usuarioLogin: "", usuarioNome: "" };
    const dados = {
      ...original,
      usuarioDevolucaoUid: assinatura.usuarioUid || "",
      usuarioDevolucaoLogin: assinatura.usuarioLogin || "",
      usuarioDevolucaoNome: assinatura.usuarioNome || "",
      dataDevolucao: new Date().toLocaleDateString("pt-BR"),
      horaDevolucao: new Date().toLocaleTimeString("pt-BR", { hour12: false })
    };

    db.ref("historico_guardachuvas").push(dados)
      .then(() => db.ref(`guardachuvas_em_uso/${id}`).remove())
      .then(() => avisoSucesso("Guarda-chuva devolvido com sucesso.", "umbrella"))
      .catch(error => {
        console.error("Erro ao devolver guarda-chuva:", error);
        avisoErro("Erro ao registrar a devolução.");
      });
  });
}





