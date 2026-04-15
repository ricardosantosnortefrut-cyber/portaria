// --- Jogos ---
function configurarAutocompleteNomeJogos() {
  const input = getById("jo_jogo");
  const lista = getById("lista_jogos_nome");
  if (!input || !lista || input.dataset.autocompleteJogosReady === "true") return;
  habilitarTecladoAutocomplete(input, lista);

  function renderResultados() {
    const termo = normalizarTexto(input.value || "");
    const resultados = termo
      ? jogosDisponiveis.filter(nome => nome.includes(termo))
      : jogosDisponiveis;

    if (!resultados.length) {
      limparConteudoElemento(lista);
      ocultarListaAutocomplete(lista);
      return;
    }

    preencherAutocompleteLista(lista, resultados.map(nome =>
      criarItemAutocomplete(nome, () => {
        input.value = nome;
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

  input.dataset.autocompleteJogosReady = "true";
}

function configurarAutocompletePorteiroJogos() {
  const input = getById("jo_porteiro");
  const lista = getById("lista_jogos_porteiro");
  if (!input || !lista || input.dataset.autocompleteReady === "true") return;
  habilitarTecladoAutocomplete(input, lista);

  function renderResultados() {
    const termo = normalizarTexto(input.value || "");
    const resultados = termo
      ? porteirosAutorizados.filter(nome => nome.includes(termo))
      : porteirosAutorizados;

    if (!resultados.length) {
      limparConteudoElemento(lista);
      ocultarListaAutocomplete(lista);
      return;
    }

    preencherAutocompleteLista(lista, resultados.map(nome =>
      criarItemAutocomplete(nome, () => {
        input.value = nome;
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

function salvarJogo() {
  const botao = document.activeElement;
  const jo = {
    funcionario: normalizarTexto(getById("jo_func").value),
    autorizador: normalizarTexto(getById("jo_aut").value),
    jogo: normalizarTexto(getById("jo_jogo").value),
    porteiro: normalizarTexto(getById("jo_porteiro").value),
    data: new Date().toLocaleDateString("pt-BR"),
    hora: new Date().toLocaleTimeString("pt-BR", { hour12: false })
  };

  if (!jo.funcionario || !jo.autorizador || !jo.jogo || !jo.porteiro) {
    avisoValidacao("Preencha funcionário, autorizador, jogo e porteiro.");
    return;
  }

  if (!jogosDisponiveis.includes(jo.jogo)) {
    avisoValidacao("Selecione um jogo válido na lista.");
    return;
  }

  if (!validarPorteiroAutorizado(jo.porteiro)) {
    avisoValidacao("Selecione um porteiro válido na lista.");
    return;
  }

  alternarBotaoCarregando(botao, true);
  db.ref("jogos_em_uso").once("value").then(snap => {
    const jogosAtivos = Object.values(snap.val() || {});
    const jogoJaEmUso = jogosAtivos.some(item => normalizarTexto(item.jogo || "") === jo.jogo);
    if (jogoJaEmUso) {
      avisoValidacao("Esse jogo já está em uso no momento.");
      return;
    }

    return db.ref("jogos_em_uso").push(jo).then(() => {
      avisoSucesso("Retirada de jogo registrada com sucesso.", "gamepad-2");
      fecharFormJogo();
    });
  }).catch(() => {
    avisoErro("Erro ao salvar a retirada.");
  }).finally(() => {
    alternarBotaoCarregando(botao, false, "Salvar Retirada");
  });
}

function renderJogosAtivos(jogos) {
  const container = getById("jogosAtivos");
  if (!container) return;
  limparConteudoElemento(container);

  if (!jogos) {
    container.appendChild(criarParagrafoVazio("Nenhum jogo em uso no momento."));
    return;
  }

  Object.entries(jogos).forEach(([id, jogo]) => {
    container.appendChild(criarCardRegistro({
      classes: "card-chave card-chave--jogo",
      titulo: jogo.jogo || "-",
      linhas: [
        { icon: "user-round", text: `Funcionário: ${jogo.funcionario || "-"}` },
        { icon: "shield-check", text: `Autorizador: ${jogo.autorizador || "-"}` },
        { icon: "badge-check", text: `Porteiro: ${jogo.porteiro || "-"}` },
        { icon: "calendar-days", text: `Data: ${jogo.data || "-"} às ${jogo.hora || "-"}`.trim() }
      ],
      actionText: "Registrar devolução",
      actionName: "devolver-jogo",
      actionId: id
    }));
  });
}

db.ref("jogos_em_uso").on("value", snap => {
  const jogos = snap.val();
  atualizarIndicador("statJogosUso", jogos ? Object.keys(jogos).length : 0);
  atualizarPainelPendencias();
  renderJogosAtivos(jogos);
  refreshLucideIcons();
});

function devolverJogo(id) {
  db.ref(`jogos_em_uso/${id}`).once("value").then(snap => {
    const original = snap.val();
    if (!original) {
      avisoErro("Jogo não encontrado.");
      return;
    }

    const dados = {
      ...original,
      dataDevolucao: new Date().toLocaleDateString("pt-BR"),
      horaDevolucao: new Date().toLocaleTimeString("pt-BR", { hour12: false })
    };

    db.ref("historico_jogos").push(dados)
      .then(() => db.ref(`jogos_em_uso/${id}`).remove())
      .then(() => avisoSucesso("Jogo devolvido com sucesso.", "gamepad-2"))
      .catch(error => {
        console.error("Erro ao devolver jogo:", error);
        avisoErro("Erro ao registrar a devolução.");
      });
  });
}

function abrirFormJogo() {
  getById("formJogoReal")?.reset();
  const jogo = getById("jo_jogo");
  if (jogo) jogo.value = "";
  const porteiro = getById("jo_porteiro");
  if (porteiro) porteiro.value = "";
  const listaJogos = getById("lista_jogos_nome");
  if (listaJogos) {
    limparConteudoElemento(listaJogos);
    ocultarListaAutocomplete(listaJogos);
  }
  const lista = getById("lista_jogos_porteiro");
  if (lista) {
    limparConteudoElemento(lista);
    ocultarListaAutocomplete(lista);
  }
  configurarAutocompleteNomeJogos();
  configurarAutocompletePorteiroJogos();
  mostrarElemento("formJogoContainer");
  ocultarElemento("btnAbrirJogo");
}

function fecharFormJogo() {
  getById("formJogoReal")?.reset();
  const jogo = getById("jo_jogo");
  if (jogo) jogo.value = "";
  const porteiro = getById("jo_porteiro");
  if (porteiro) porteiro.value = "";
  const listaJogos = getById("lista_jogos_nome");
  if (listaJogos) {
    limparConteudoElemento(listaJogos);
    ocultarListaAutocomplete(listaJogos);
  }
  const lista = getById("lista_jogos_porteiro");
  if (lista) {
    limparConteudoElemento(lista);
    ocultarListaAutocomplete(lista);
  }
  ocultarElemento("formJogoContainer");
  mostrarElemento("btnAbrirJogo");
}



