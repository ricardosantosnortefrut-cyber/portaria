// --- Autocompletes ---
function configurarAutocomplete(inputId, listaId, opcoes) {
  const input = getById(inputId);
  const lista = getById(listaId);
  if (!input || !lista) return;
  habilitarTecladoAutocomplete(input, lista);

  function renderResultados(resultados) {
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

  input.addEventListener("input", function () {
    const termo = this.value.trim().toUpperCase();
    if (!termo) {
      limparConteudoElemento(lista);
      ocultarListaAutocomplete(lista);
      return;
    }
    renderResultados(opcoes.filter(nome => nome.toUpperCase().includes(termo)));
  });

  input.addEventListener("focus", function () {
    const termo = this.value.trim().toUpperCase();
    renderResultados(termo ? opcoes.filter(nome => nome.toUpperCase().includes(termo)) : opcoes);
  });

  document.addEventListener("click", function (e) {
    if (!input.contains(e.target) && !lista.contains(e.target)) ocultarListaAutocomplete(lista);
  });
}
