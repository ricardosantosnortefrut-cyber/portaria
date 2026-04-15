function abrirFormChave() {
  limparFormChaves();
  mostrarElemento("formChave");
  ocultarElemento("btnAbrirChave");
}

function cancelarFormChave() {
  limparFormChaves();
  ocultarElemento("formChave");
  mostrarElemento("btnAbrirChave");
}

function limparFormChaves() {
  ["ch_sala", "ch_num", "ch_quem", "ch_porteiro"].forEach(id => {
    getById(id).value = "";
  });
  const lista = getById("lista_chaves_setor");
  if (lista) {
    limparConteudoElemento(lista);
    ocultarListaAutocomplete(lista);
  }
}

function salvarChave() {
  const botao = document.activeElement;
  const sala = getById("ch_sala").value.trim().toUpperCase();
  const num = getById("ch_num").value.trim();
  const quem = normalizarTexto(getById("ch_quem").value);
  const porteiro = normalizarTexto(getById("ch_porteiro").value);

  if (!sala || !num || !quem || !porteiro) {
    avisoValidacao("Preencha sala, chave, quem retirou e porteiro.");
    return;
  }

  const chaveExiste = chavesCadastradas.some(item => item.sala.toUpperCase() === sala && String(item.numero) === String(num));
  if (!chaveExiste) {
    avisoValidacao("Selecione uma sala ou setor válido na lista.");
    return;
  }

  if (!validarPorteiroAutorizado(porteiro)) {
    avisoValidacao("Selecione um porteiro válido na lista.");
    return;
  }

  db.ref("chaves_em_uso").once("value").then(snap => {
    const dados = snap.val() || {};
    const chaveJaEmUso = Object.values(dados).some(item => String(item.num) === String(num));
    if (chaveJaEmUso) {
      avisoValidacao("Essa chave já está em uso.");
      return;
    }

    const ch = {
      sala,
      num,
      quem,
      porteiro,
      dataRetirada: new Date().toLocaleDateString("pt-BR"),
      horaRetirada: new Date().toLocaleTimeString("pt-BR", { hour12: false })
    };

    alternarBotaoCarregando(botao, true);
    db.ref("chaves_em_uso").push(ch).then(() => {
      avisoSucesso("Retirada de chave registrada com sucesso.", "key-round");
      limparFormChaves();
      ocultarElemento("formChave");
      mostrarElemento("btnAbrirChave");
    }).catch(() => {
      avisoErro("Erro ao salvar a retirada.");
    }).finally(() => {
      alternarBotaoCarregando(botao, false, "Salvar Retirada");
    });
  });
}

function configurarAutocompletePorteiroChaves() {
  const input = getById("ch_porteiro");
  const lista = getById("lista_porteiros_chaves");
  if (!input || !lista) return;
  habilitarTecladoAutocomplete(input, lista);

  function renderResultados(termo) {
    const busca = termo.trim().toUpperCase();
    const resultados = busca ? porteirosAutorizados.filter(nome => nome.includes(busca)) : porteirosAutorizados;
    if (resultados.length === 0) {
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

  input.addEventListener("input", function () { renderResultados(this.value); });
  input.addEventListener("focus", function () { renderResultados(this.value); });
  document.addEventListener("click", function (e) {
    if (!input.contains(e.target) && !lista.contains(e.target)) ocultarListaAutocomplete(lista);
  });
}

function renderChavesAtivas(dados) {
  const container = getById("chavesAtivas");
  if (!container) return;
  limparConteudoElemento(container);

  if (!dados) {
    container.appendChild(criarParagrafoVazio("Nenhuma chave em uso no momento."));
    return;
  }

  Object.entries(dados).forEach(([id, chave]) => {
    container.appendChild(criarCardRegistro({
      classes: "card-chave",
      titulo: `Nº ${chave.num} - ${chave.sala}`,
      linhas: [
        { icon: "user-round", text: `Retirado por: ${chave.quem || "-"}` },
        { icon: "shield-check", text: `Porteiro: ${chave.porteiro || "-"}` },
        { icon: "calendar-days", text: `Data: ${chave.dataRetirada || "-"} às ${chave.horaRetirada || "-"}` }
      ],
      actionText: "Registrar devolução",
      actionName: "devolver-chave",
      actionId: id
    }));
  });
}

db.ref("chaves_em_uso").on("value", snap => {
  const dados = snap.val();
  atualizarIndicador("statChavesUso", dados ? Object.keys(dados).length : 0);
  atualizarPainelPendencias();
  renderChavesAtivas(dados);
  refreshLucideIcons();
});

function devolverChave(id) {
  db.ref(`chaves_em_uso/${id}`).once("value").then(snap => {
    const dadosOriginais = snap.val();
    if (!dadosOriginais) {
      avisoErro("Chave não encontrada.");
      return;
    }

    const dadosHistorico = {
      ...dadosOriginais,
      dataDevolucao: new Date().toLocaleDateString("pt-BR"),
      horaDevolucao: new Date().toLocaleTimeString("pt-BR", { hour12: false })
    };

    db.ref("historico_chaves").push(dadosHistorico)
      .then(() => db.ref(`chaves_em_uso/${id}`).remove())
      .then(() => avisoSucesso("Chave devolvida com sucesso.", "key-round"))
      .catch(error => {
        console.error("Erro ao devolver chave:", error);
        avisoErro("Erro ao registrar a devolução.");
      });
  });
}

function configurarAutocompleteChaves() {
  const inputSala = getById("ch_sala");
  const inputNumero = getById("ch_num");
  const lista = getById("lista_chaves_setor");
  if (!inputSala || !inputNumero || !lista) return;
  habilitarTecladoAutocomplete(inputSala, lista);

  async function renderResultados(termo) {
    const snap = await db.ref("chaves_em_uso").once("value");
    const emUso = Object.values(snap.val() || {});
    const numerosEmUso = emUso.map(item => String(item.num));
    const chavesDisponiveis = chavesCadastradas.filter(item => !numerosEmUso.includes(String(item.numero)));
    const busca = termo.trim().toUpperCase();
    const resultados = busca
      ? chavesDisponiveis.filter(item => item.sala.toUpperCase().includes(busca) || item.numero.toString().includes(busca))
      : chavesDisponiveis;

    if (resultados.length === 0) {
      limparConteudoElemento(lista);
      ocultarListaAutocomplete(lista);
      return;
    }

    preencherAutocompleteLista(lista, resultados.map(item =>
      criarItemAutocomplete(`- ${item.sala}`, () => {
        inputSala.value = item.sala;
        inputNumero.value = item.numero;
        ocultarListaAutocomplete(lista);
      }, item.numero)
    ));

    mostrarListaAutocomplete(lista);
  }

  inputSala.addEventListener("input", function () {
    inputNumero.value = "";
    renderResultados(this.value);
  });
  inputSala.addEventListener("focus", function () { renderResultados(this.value); });
  document.addEventListener("click", function (e) {
    if (!inputSala.contains(e.target) && !lista.contains(e.target)) ocultarListaAutocomplete(lista);
  });
}

