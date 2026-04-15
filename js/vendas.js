const vendasState = {
  registros: {},
  atual: null,
  itensPedido: [],
  previewOculto: false
};

function formatarMoedaBR(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function obterProdutoVenda(id) {
  return produtosVendaMamao.find(item => item.id === id) || null;
}

function resumirCaracteristicaVenda(texto) {
  const valor = String(texto || "").trim();
  if (!valor) return "-";
  return valor.replace(/\s*\([^)]*\)\s*/g, "").replace(/\s{2,}/g, " ").trim();
}

function gerarCodigoVenda() {
  const agora = new Date();
  const dd = String(agora.getDate()).padStart(2, "0");
  const mm = String(agora.getMonth() + 1).padStart(2, "0");
  const yy = String(agora.getFullYear()).slice(-2);
  const hh = String(agora.getHours()).padStart(2, "0");
  const mi = String(agora.getMinutes()).padStart(2, "0");
  const ss = String(agora.getSeconds()).padStart(2, "0");
  return `VDA-${dd}${mm}${yy}-${hh}${mi}${ss}`;
}

function popularSelectVenda(id, opcoes, placeholder) {
  const select = getById(id);
  if (!select) return;
  limparConteudoElemento(select);

  const primeira = document.createElement("option");
  primeira.value = "";
  primeira.textContent = placeholder;
  select.appendChild(primeira);

  opcoes.forEach(opcao => {
    const option = document.createElement("option");
    if (typeof opcao === "string") {
      option.value = opcao;
      option.textContent = opcao;
    } else {
      option.value = opcao.id;
      option.textContent = `${opcao.nome} • ${formatarMoedaBR(opcao.preco)}`;
    }
    select.appendChild(option);
  });
}

function normalizarVendaRegistro(id, dados) {
  const itens = Array.isArray(dados?.itens) && dados.itens.length
    ? dados.itens.map(item => ({
        produtoId: item.produtoId || "",
        produtoNome: item.produtoNome || item.produtoDescricao || "-",
        produtoDescricao: item.produtoDescricao || item.produtoNome || "-",
        caracteristica: resumirCaracteristicaVenda(item.caracteristica || item.maturacao || "-"),
        quantidade: Number(item.quantidade || 0) || 0,
        valorUnitario: Number(item.valorUnitario || 0) || 0,
        subtotal: Number(item.subtotal || (Number(item.valorUnitario || 0) * Number(item.quantidade || 0))) || 0
      }))
    : [{
        produtoId: dados?.produtoId || "",
        produtoNome: dados?.produtoNome || dados?.produtoDescricao || "-",
        produtoDescricao: dados?.produtoDescricao || dados?.produtoNome || "-",
        caracteristica: resumirCaracteristicaVenda(dados?.caracteristica || dados?.maturacao || "-"),
        quantidade: Number(dados?.quantidade || 0) || 0,
        valorUnitario: Number(dados?.valorUnitario || 0) || 0,
        subtotal: Number(dados?.valorTotal || 0) || 0
      }];

  const valorTotal = itens.reduce((total, item) => total + Number(item.subtotal || 0), 0);

  return {
    id,
    codigo: dados?.codigo || gerarCodigoVenda(),
    cliente: dados?.cliente || "-",
    itens,
    pagamento: dados?.pagamento || "-",
    observacao: dados?.observacao || "",
    data: dados?.data || "-",
    hora: dados?.hora || "-",
    criadoEm: Number(dados?.criadoEm || 0) || 0,
    valorTotal
  };
}

function atualizarResumoVenda() {
  const produto = obterProdutoVenda(getById("vd_produto")?.value || "");
  const quantidade = Math.max(1, Number(getById("vd_quantidade")?.value || 1));
  const campoUnitario = getById("vd_valor_unitario");
  const campoItem = getById("vd_valor_item");
  const campoTotal = getById("vd_valor_total");

  if (campoUnitario) campoUnitario.value = produto ? formatarMoedaBR(produto.preco) : "";
  if (campoItem) campoItem.value = produto ? formatarMoedaBR(produto.preco * quantidade) : "";

  const totalPedido = vendasState.itensPedido.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  if (campoTotal) campoTotal.value = totalPedido ? formatarMoedaBR(totalPedido) : "";
}

function limparItemVendaForm() {
  const produto = getById("vd_produto");
  const caracteristica = getById("vd_maturacao");
  const quantidade = getById("vd_quantidade");
  if (produto) produto.value = "";
  if (caracteristica) caracteristica.value = "";
  if (quantidade) quantidade.value = "1";
  atualizarResumoVenda();
}

function limparFormVenda() {
  const nome = getById("vd_nome");
  const pagamento = getById("vd_pagamento");
  const obs = getById("vd_obs");

  if (nome) nome.value = "";
  if (pagamento) pagamento.value = "";
  if (obs) obs.value = "";

  vendasState.itensPedido = [];
  limparItemVendaForm();
  renderItensPedidoVenda();
}

function montarTextoPedidoVenda(venda) {
  const linhas = [
    "PEDIDO DE VENDA CAIXA DE MAMÃO",
    `CLIENTE: ${venda.cliente}`,
    "",
    "ITENS:"
  ];

  venda.itens.forEach(item => {
    const qtd = String(item.quantidade).padStart(2, "0");
    linhas.push(`- ${qtd} CX ${item.produtoNome} - ${item.caracteristica}`);
  });

  linhas.push("");
  linhas.push(`VALOR TOTAL: ${formatarMoedaBR(venda.valorTotal)}`);
  linhas.push(`PAGAMENTO: ${venda.pagamento}`);

  if (venda.observacao) {
    linhas.push(`OBS: ${venda.observacao}`);
  }

  return linhas.join("\n");
}

function renderCupomVenda(venda) {
  const container = getById("vendaCupomPreview");
  const painelPreview = container?.closest(".venda-card-preview");
  const botaoOcultar = painelPreview?.querySelector("[data-action='ocultar-preview-venda']");
  if (!container) return;
  limparConteudoElemento(container);

  if (!venda) {
    painelPreview?.classList.add("is-empty");
    painelPreview?.classList.remove("is-collapsed");
    if (botaoOcultar) botaoOcultar.hidden = false;
    container.appendChild(criarParagrafoVazio("Nenhum pedido gerado ainda."));
    return;
  }

  painelPreview?.classList.remove("is-empty");
  painelPreview?.classList.toggle("is-collapsed", vendasState.previewOculto);
  if (botaoOcultar) botaoOcultar.hidden = vendasState.previewOculto;

  const card = document.createElement("div");
  card.className = "venda-cupom-card";

  const badge = document.createElement("span");
  badge.className = "venda-cupom-badge";
  badge.textContent = venda.codigo;

  const titulo = document.createElement("strong");
  titulo.textContent = venda.cliente;

  const meta = document.createElement("p");
  meta.className = "venda-cupom-meta";
  meta.textContent = `${venda.data} às ${venda.hora}`;

  const detalhes = document.createElement("div");
  detalhes.className = "venda-cupom-details";
  [
    `Itens: ${venda.itens.length}`,
    `Caixas: ${venda.itens.reduce((total, item) => total + Number(item.quantidade || 0), 0)}`,
    `Pagamento: ${venda.pagamento}`,
    `Total: ${formatarMoedaBR(venda.valorTotal)}`
  ].forEach(texto => {
    const linha = document.createElement("span");
    linha.textContent = texto;
    detalhes.appendChild(linha);
  });

  const texto = document.createElement("pre");
  texto.className = "venda-cupom-text";
  texto.textContent = montarTextoPedidoVenda(venda);

  card.append(badge, titulo, meta, detalhes, texto);
  container.append(card);
}

function focarPreviewVenda() {
  const painelPreview = document.querySelector(".venda-card-preview");
  if (!painelPreview) return;
  vendasState.previewOculto = false;
  painelPreview.classList.remove("is-collapsed");
  const botaoOcultar = painelPreview.querySelector("[data-action='ocultar-preview-venda']");
  if (botaoOcultar) botaoOcultar.hidden = false;
  if (!window.matchMedia("(max-width: 720px)").matches) return;
  setTimeout(() => {
    const top = painelPreview.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth"
    });
  }, 80);
}

function renderItensPedidoVenda() {
  const container = getById("vendaItensPedido");
  const resumo = getById("vendaResumoItens");
  if (!container || !resumo) return;
  limparConteudoElemento(container);

  if (!vendasState.itensPedido.length) {
    resumo.textContent = "Adicione os itens para montar o pedido.";
    atualizarResumoVenda();
    return;
  }

  const totalCaixas = vendasState.itensPedido.reduce((total, item) => total + Number(item.quantidade || 0), 0);
  const totalValor = vendasState.itensPedido.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  resumo.textContent = `${vendasState.itensPedido.length} item(ns) • ${totalCaixas} caixa(s) • ${formatarMoedaBR(totalValor)}`;

  vendasState.itensPedido.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "venda-item-card";

    const info = document.createElement("div");
    info.className = "venda-item-card-info";

    const titulo = document.createElement("strong");
    titulo.textContent = `${String(item.quantidade).padStart(2, "0")} CX ${item.produtoNome}`;

    const detalhe = document.createElement("span");
    detalhe.textContent = item.caracteristica;

    const subtotal = document.createElement("small");
    subtotal.textContent = `${formatarMoedaBR(item.valorUnitario)} cada • subtotal ${formatarMoedaBR(item.subtotal)}`;

    info.append(titulo, detalhe, subtotal);

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "cadastro-action danger";
    remover.textContent = "Remover";
    remover.dataset.itemAction = "remover-item-venda";
    remover.dataset.id = String(index);

    card.append(info, remover);
    container.appendChild(card);
  });

  atualizarResumoVenda();
}

function coletarItemVendaFormulario() {
  const produto = obterProdutoVenda(getById("vd_produto")?.value || "");
  const caracteristica = resumirCaracteristicaVenda(getById("vd_maturacao")?.value || "");
  const quantidade = Math.max(1, Number(getById("vd_quantidade")?.value || 1));

  if (!produto || !caracteristica || !quantidade) {
    return null;
  }

  return {
    produtoId: produto.id,
    produtoNome: produto.nome,
    produtoDescricao: produto.descricao,
    caracteristica,
    quantidade,
    valorUnitario: produto.preco,
    subtotal: produto.preco * quantidade
  };
}

function adicionarItemVenda() {
  const item = coletarItemVendaFormulario();
  if (!item) {
    avisoValidacao("Selecione produto, característica e quantidade para adicionar o item.");
    return;
  }

  vendasState.itensPedido.push(item);
  renderItensPedidoVenda();
  limparItemVendaForm();
  avisoSucesso("Item adicionado ao pedido.", "package-plus");
}

function removerItemVenda(index) {
  const posicao = Number(index);
  if (!Number.isInteger(posicao) || posicao < 0 || posicao >= vendasState.itensPedido.length) return;
  vendasState.itensPedido.splice(posicao, 1);
  renderItensPedidoVenda();
}

function abrirCupomVenda(id) {
  const dados = vendasState.registros?.[id];
  if (!dados) return;
  vendasState.atual = normalizarVendaRegistro(id, dados);
  vendasState.previewOculto = false;
  renderCupomVenda(vendasState.atual);
  abrir("vendas");
  focarPreviewVenda();
}

function ocultarPreviewVenda() {
  const painelPreview = document.querySelector(".venda-card-preview");
  const botaoOcultar = painelPreview?.querySelector("[data-action='ocultar-preview-venda']");
  if (!painelPreview || painelPreview.classList.contains("is-empty")) return;

  vendasState.previewOculto = true;
  painelPreview.classList.add("is-collapsed");
  if (botaoOcultar) botaoOcultar.hidden = true;
}


function copiarCupomVenda() {
  if (!vendasState.atual) {
    avisoInfo("Gere ou abra um pedido para copiar.", "copy");
    return;
  }

  const texto = montarTextoPedidoVenda(vendasState.atual);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(texto)
      .then(() => avisoSucesso("Pedido copiado com sucesso.", "copy"))
      .catch(() => copiarCupomVendaFallback(texto));
    return;
  }

  copiarCupomVendaFallback(texto);
}

function copiarCupomVendaFallback(texto) {
  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.opacity = "0";
  campo.style.pointerEvents = "none";
  document.body.appendChild(campo);
  campo.select();

  try {
    const copiado = document.execCommand("copy");
    if (copiado) {
      avisoSucesso("Pedido copiado com sucesso.", "copy");
    } else {
      avisoErro("Não foi possível copiar o pedido.");
    }
  } catch {
    avisoErro("Não foi possível copiar o pedido.");
  } finally {
    document.body.removeChild(campo);
  }
}

function imprimirCupomVenda() {
  if (!vendasState.atual) {
    avisoInfo("Gere ou abra um pedido para imprimir.", "printer");
    return;
  }

  const popup = window.open("", "_blank", "width=720,height=840");
  if (!popup) {
    avisoErro("Não foi possível abrir a impressão do pedido.");
    return;
  }

  const texto = montarTextoPedidoVenda(vendasState.atual)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  popup.document.write(`
    <html lang="pt-br">
      <head>
        <title>${vendasState.atual.codigo}</title>
        <style>
          body { font-family: Segoe UI, Arial, sans-serif; padding: 24px; color: #22384e; }
          .cupom { border: 1px solid #d9e4ef; border-radius: 16px; padding: 22px; }
          .badge { display:inline-block; padding: 6px 10px; border-radius: 999px; background:#e7f1ff; color:#1565c0; font-weight:700; font-size:12px; margin-bottom: 12px; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          p { margin: 0 0 12px; color: #5f7891; }
          pre { white-space: pre-wrap; font-family: Segoe UI, Arial, sans-serif; line-height: 1.6; font-size: 14px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="cupom">
          <span class="badge">${vendasState.atual.codigo}</span>
          <h1>Pedido de Venda</h1>
          <p>Portaria Nortefrut</p>
          <pre>${texto}</pre>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);
  popup.document.close();
}

function salvarVenda() {
  const botao = document.activeElement;
  const cliente = normalizarTexto(getById("vd_nome")?.value || "");
  const pagamento = getById("vd_pagamento")?.value || "";
  const observacao = normalizarTexto(getById("vd_obs")?.value || "");

  if (!cliente) {
    avisoValidacao("Preencha o nome do cliente.");
    return;
  }

  if (!vendasState.itensPedido.length) {
    avisoValidacao("Adicione ao menos um item ao pedido.");
    return;
  }

  if (!pagamento) {
    avisoValidacao("Selecione a forma de pagamento.");
    return;
  }

  const venda = {
    codigo: gerarCodigoVenda(),
    cliente,
    itens: vendasState.itensPedido.map(item => ({ ...item })),
    pagamento,
    observacao,
    valorTotal: vendasState.itensPedido.reduce((total, item) => total + Number(item.subtotal || 0), 0),
    data: new Date().toLocaleDateString("pt-BR"),
    hora: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
    criadoEm: Date.now()
  };

  alternarBotaoCarregando(botao, true);
  db.ref("vendas_caixas_mamao").push(venda)
    .then(ref => {
      vendasState.atual = { id: ref.key, ...venda };
      vendasState.previewOculto = false;
      renderCupomVenda(vendasState.atual);
      avisoSucesso("Pedido de venda gerado com sucesso.", "receipt-text");
      limparFormVenda();
    })
    .catch(() => avisoErro("Erro ao gerar o pedido de venda."))
    .finally(() => alternarBotaoCarregando(botao, false, "Gerar Pedido"));
}

function renderListaVendas(registros) {
  const container = getById("listaVendas");
  if (!container) return;
  limparConteudoElemento(container);

  const lista = Object.entries(registros || {})
    .map(([id, dados]) => normalizarVendaRegistro(id, dados))
    .sort((a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0))
    .slice(0, 10);

  if (!lista.length) {
    container.appendChild(criarParagrafoVazio("Nenhum pedido de venda registrado ainda."));
    return;
  }

  lista.forEach(venda => {
    const totalCaixas = venda.itens.reduce((total, item) => total + Number(item.quantidade || 0), 0);
    const item = document.createElement("button");
    item.type = "button";
    item.className = "venda-list-row";
    item.dataset.itemAction = "abrir-venda";
    item.dataset.id = venda.id;

    const principal = document.createElement("div");
    principal.className = "venda-list-main";

    const titulo = document.createElement("strong");
    titulo.textContent = venda.cliente || "-";

    const subtitulo = document.createElement("span");
    subtitulo.textContent = `${venda.itens.length} item(ns) • ${totalCaixas} caixa(s) • ${venda.pagamento || "-"} • ${venda.data || "-"} às ${venda.hora || "-"}`;

    principal.append(titulo, subtitulo);

    const valor = document.createElement("span");
    valor.className = "venda-list-total";
    valor.textContent = formatarMoedaBR(venda.valorTotal);

    item.append(principal, valor);
    container.appendChild(item);
  });
}

function inicializarVendaForm() {
  popularSelectVenda("vd_produto", produtosVendaMamao, "Selecione o tipo de mamão...");
  popularSelectVenda("vd_maturacao", opcoesMaturacaoVenda, "Selecione a característica do mamão...");
  popularSelectVenda("vd_pagamento", formasPagamentoVenda, "Forma de pagamento");

  getById("vd_produto")?.addEventListener("change", atualizarResumoVenda);
  getById("vd_quantidade")?.addEventListener("input", atualizarResumoVenda);
  getById("vd_quantidade")?.addEventListener("change", atualizarResumoVenda);

  renderItensPedidoVenda();
  atualizarResumoVenda();
  renderCupomVenda(null);
}

db.ref("vendas_caixas_mamao").on("value", snap => {
  vendasState.registros = snap.val() || {};
  renderListaVendas(vendasState.registros);
});

window.addEventListener("DOMContentLoaded", () => {
  inicializarVendaForm();
});




