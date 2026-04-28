const AUTH_LOGIN_STORAGE_KEY = "nortefrut-auth-login";
const AUTH_EMAIL_STORAGE_KEY = "nortefrut-auth-email";
const USER_PROFILE_DB_PATH = "usuarios";
const USERNAME_INDEX_DB_PATH = "usuarios_por_login";
const USER_INTERNAL_EMAIL_DOMAIN = "login.portarianortefrut.local";
const AUTH_MIN_PASSWORD_LENGTH = 8;
const AUTH_CREATE_ACCESS_FUNCTION_NAME = "criarAcessoUsuario";
const ACCESS_PERMISSION_LEVELS = ["none", "view", "edit"];
const ACCESS_PERMISSION_LABELS = {
  none: "Sem acesso",
  view: "Visualizar",
  edit: "Editar"
};
const ACCESS_ACTION_LABELS = Object.freeze({
  inclusao: "Inclusao",
  alteracao: "Alteracao",
  exclusao: "Exclusao",
  consulta: "Consulta",
  configuracao: "Configuracao"
});
const ACCESS_SECTION_LABELS = Object.freeze({
  inicio: "Início",
  perfilUsuario: "Perfil",
  veiculosGeral: "Frota",
  posto: "Posto",
  chaves: "Chaves",
  empilhadeiras: "Empilhadeiras",
  jogos: "Jogos",
  guardachuvas: "Guarda-chuvas",
  vendas: "Vendas",
  pesagemManual: "Balança",
  relatorios: "Relatórios",
  cadastros: "Cadastros"
});
const ACCESS_SECTION_ALIASES = Object.freeze({
  relatorioFrota: "veiculosGeral",
  relatorioAgendamentos: "veiculosGeral",
  relatorioPosto: "posto",
  relatorioEmpilhadeiras: "empilhadeiras",
  relatorioChaves: "chaves",
  relatorioGuarda: "guardachuvas",
  relatorioJogos: "jogos",
  relatorioVendas: "vendas",
  veiculosForm: "veiculosGeral"
});
const DEFAULT_ACCESS_PERMISSIONS = Object.freeze({
  inicio: "view",
  perfilUsuario: "edit",
  veiculosGeral: "view",
  posto: "view",
  chaves: "view",
  empilhadeiras: "view",
  jogos: "view",
  guardachuvas: "view",
  vendas: "view",
  pesagemManual: "view",
  relatorios: "view",
  cadastros: "none"
});
const FULL_ACCESS_PERMISSIONS = Object.freeze(
  Object.keys(DEFAULT_ACCESS_PERMISSIONS).reduce((acc, key) => {
    acc[key] = key === "inicio" ? "view" : "edit";
    return acc;
  }, {})
);
const ACCESS_ROLE_PRESETS = Object.freeze({
  viewer: {
    label: "Somente visualizacao",
    description: "Entra para consultar as telas liberadas, sem alterar dados."
  },
  operational: {
    label: "Operacional",
    description: "Pode operar os modulos do turno e atualizar o proprio perfil."
  },
  manager: {
    label: "Gestor",
    description: "Tem controle total da operacao, relatorios, cadastros e acessos."
  }
});
const ACCESS_PERMISSION_GROUPS = Object.freeze([
  {
    key: "base",
    label: "Acesso base",
    description: "Entrada no sistema e manutencao do proprio perfil.",
    sections: ["inicio", "perfilUsuario"]
  },
  {
    key: "operation",
    label: "Operacao",
    description: "Modulos usados durante o turno e nas liberacoes do dia.",
    sections: ["veiculosGeral", "posto", "chaves", "empilhadeiras", "jogos", "guardachuvas", "vendas", "pesagemManual"]
  },
  {
    key: "management",
    label: "Gestao",
    description: "Consulta analitica e configuracoes sensiveis do sistema.",
    sections: ["relatorios", "cadastros"]
  }
]);
const OPERATOR_FIELD_IDS = ["v_porteiro_retorno", "ch_porteiro", "gu_porteiro", "jo_porteiro", "ab_porteiro"];

let authContext = {
  firebaseUser: null,
  profile: null
};
let usuariosSistemaState = {};
let authProfileListener = null;
let authProfileListenerRef = null;
let authUsersListener = null;
let accessCentralState = {
  search: "",
  status: "all",
  role: "all",
  action: "all"
};

window.ACCESS_SECTION_LABELS = ACCESS_SECTION_LABELS;
window.obterUsuariosSistemaAcesso = function obterUsuariosSistemaAcesso() {
  return usuariosSistemaState;
};

function capitalizarPalavra(valor = "") {
  return valor ? valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase() : "";
}

function normalizarNomeExibicao(valor = "") {
  return String(valor || "").trim().replace(/\s+/g, " ");
}

function normalizarLoginUsuario(valor = "") {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
}

function gerarEmailInternoUsuario(login = "") {
  return `${login}@${USER_INTERNAL_EMAIL_DOMAIN}`;
}

function normalizarEmailAcesso(valor = "") {
  return String(valor || "").trim().toLowerCase();
}

function emailAcessoValido(valor = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmailAcesso(valor));
}

function clonarPermissoes(permissoesBase) {
  return Object.keys(DEFAULT_ACCESS_PERMISSIONS).reduce((acc, key) => {
    acc[key] = permissoesBase[key];
    return acc;
  }, {});
}

function criarPermissoesPadrao() {
  return clonarPermissoes(DEFAULT_ACCESS_PERMISSIONS);
}

function criarPermissoesGestor() {
  return clonarPermissoes(FULL_ACCESS_PERMISSIONS);
}

function criarPermissoesOperacionais() {
  return {
    ...criarPermissoesPadrao(),
    perfilUsuario: "edit",
    veiculosGeral: "edit",
    posto: "edit",
    chaves: "edit",
    empilhadeiras: "edit",
    jogos: "edit",
    guardachuvas: "edit",
    vendas: "edit",
    pesagemManual: "edit",
    relatorios: "view",
    cadastros: "none"
  };
}

function criarPermissoesAcaoPadrao() {
  return {
    inclusao: false,
    alteracao: false,
    exclusao: false,
    consulta: true,
    configuracao: false
  };
}

function criarPermissoesAcaoOperacionais() {
  return {
    inclusao: true,
    alteracao: true,
    exclusao: false,
    consulta: true,
    configuracao: false
  };
}

function criarPermissoesAcaoGestor() {
  return Object.keys(ACCESS_ACTION_LABELS).reduce((acc, chave) => {
    acc[chave] = true;
    return acc;
  }, {});
}

function obterPermissoesAcaoPorPreset(preset = "viewer") {
  if (preset === "manager") return criarPermissoesAcaoGestor();
  if (preset === "operational") return criarPermissoesAcaoOperacionais();
  return criarPermissoesAcaoPadrao();
}

function inferirPermissoesAcao(permissoes = {}) {
  const nivelCadastros = normalizarNivelPermissao(permissoes?.cadastros, "none");
  if (nivelCadastros === "edit") return criarPermissoesAcaoGestor();
  if (nivelCadastros === "view") return criarPermissoesAcaoPadrao();
  return {
    ...criarPermissoesAcaoPadrao(),
    consulta: false
  };
}

function mesclarPermissoesAcao(permissoesAcao = null, permissoes = {}) {
  const base = permissoesAcao && typeof permissoesAcao === "object"
    ? criarPermissoesAcaoPadrao()
    : inferirPermissoesAcao(permissoes);

  Object.keys(ACCESS_ACTION_LABELS).forEach(chave => {
    if (Object.prototype.hasOwnProperty.call(permissoesAcao || {}, chave)) {
      base[chave] = Boolean(permissoesAcao[chave]);
    }
  });

  return base;
}

function permissoesAcaoSaoIguais(origem = {}, destino = {}) {
  return Object.keys(ACCESS_ACTION_LABELS).every(chave => Boolean(origem?.[chave]) === Boolean(destino?.[chave]));
}

function normalizarChavePermissaoAcesso(chave = "") {
  return ACCESS_SECTION_ALIASES[chave] || chave;
}

function normalizarNivelPermissao(nivel, fallback = "none") {
  return ACCESS_PERMISSION_LEVELS.includes(nivel) ? nivel : fallback;
}

function mesclarPermissoesUsuario(permissoes = {}) {
  const base = criarPermissoesPadrao();
  Object.keys(base).forEach(chave => {
    base[chave] = normalizarNivelPermissao(permissoes?.[chave], base[chave]);
  });
  return base;
}

function obterPermissoesPorPreset(preset = "viewer") {
  if (preset === "manager") return criarPermissoesGestor();
  if (preset === "operational") return criarPermissoesOperacionais();
  return criarPermissoesPadrao();
}

function obterPacotePermissoesPorPreset(preset = "viewer") {
  return {
    permissoes: obterPermissoesPorPreset(preset),
    permissoesAcao: obterPermissoesAcaoPorPreset(preset)
  };
}

function obterConfigPresetAcesso(preset = "viewer") {
  return ACCESS_ROLE_PRESETS[preset] || ACCESS_ROLE_PRESETS.viewer;
}

function permissoesSaoIguais(origem = {}, destino = {}) {
  return Object.keys(DEFAULT_ACCESS_PERMISSIONS).every(chave => {
    return normalizarNivelPermissao(origem?.[chave], "none") === normalizarNivelPermissao(destino?.[chave], "none");
  });
}

function detectarPresetPermissoes(permissoes = {}) {
  const permissoesNormalizadas = mesclarPermissoesUsuario(permissoes);
  if (permissoesSaoIguais(permissoesNormalizadas, criarPermissoesGestor())) return "manager";
  if (permissoesSaoIguais(permissoesNormalizadas, criarPermissoesOperacionais())) return "operational";
  if (permissoesSaoIguais(permissoesNormalizadas, criarPermissoesPadrao())) return "viewer";
  return "custom";
}

function obterResumoPermissoes(permissoes = {}) {
  return Object.keys(DEFAULT_ACCESS_PERMISSIONS).reduce((acc, chave) => {
    const nivel = normalizarNivelPermissao(permissoes?.[chave], "none");
    acc[nivel] = (acc[nivel] || 0) + 1;
    return acc;
  }, { none: 0, view: 0, edit: 0 });
}

function normalizarBuscaAcesso(valor = "") {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obterPapelAcessoUsuario(profile = null) {
  if (!profile) return "Acesso";
  if (profile.ativo === false) return "Inativo";

  const preset = detectarPresetPermissoes(profile.permissoes);
  if (preset === "manager") return "Gestor";
  if (preset === "operational") return "Operacional";
  if (preset === "viewer") return "Somente leitura";
  return "Personalizado";
}

function obterNomeUsuario(user, profile = null) {
  const nomePerfil = normalizarNomeExibicao(profile?.nome || "");
  if (nomePerfil) return nomePerfil;

  const nomeDireto = normalizarNomeExibicao(user?.displayName || "");
  if (nomeDireto) return nomeDireto;

  const email = String(user?.email || "").trim();
  if (!email) return "Usuario conectado";

  const base = email.split("@")[0] || "";
  const nomeFormatado = base
    .split(/[._-]+/)
    .filter(Boolean)
    .map(capitalizarPalavra)
    .join(" ");

  return nomeFormatado || email;
}

function obterLoginPerfil(profile = null, user = null) {
  const loginPerfil = normalizarLoginUsuario(profile?.login || "");
  if (loginPerfil) return loginPerfil;

  const email = String(user?.email || "").trim();
  if (!email) return "";
  return normalizarLoginUsuario(email.split("@")[0] || "");
}

function obterPerfilUsuarioNormalizado(uid, dados = {}, user = null) {
  const nome = normalizarNomeExibicao(dados?.nome || obterNomeUsuario(user));
  const login = obterLoginPerfil(dados, user);
  const authEmail = normalizarEmailAcesso(dados?.authEmail || user?.email || "");

  return {
    uid,
    nome,
    login,
    authEmail,
    ativo: dados?.ativo !== false,
    permissoes: mesclarPermissoesUsuario(dados?.permissoes || {}),
    permissoesAcao: mesclarPermissoesAcao(dados?.permissoesAcao, dados?.permissoes || {}),
    criadoEm: dados?.criadoEm || "",
    atualizadoEm: dados?.atualizadoEm || "",
    origem: dados?.origem || "sistema",
    criadoPor: dados?.criadoPor || ""
  };
}

function obterNivelPermissaoPerfil(profile, chave) {
  if (!profile || profile.ativo === false) return "none";
  const chaveNormalizada = normalizarChavePermissaoAcesso(chave);
  const permissoes = mesclarPermissoesUsuario(profile.permissoes || {});
  return normalizarNivelPermissao(permissoes[chaveNormalizada], "none");
}

function obterRotuloPermissaoAcesso(chave) {
  return ACCESS_SECTION_LABELS[normalizarChavePermissaoAcesso(chave)] || chave;
}

function obterNivelPermissaoUsuarioAtual(chave) {
  return obterNivelPermissaoPerfil(authContext.profile, chave);
}

function usuarioPodeVerSecao(chave) {
  const nivel = obterNivelPermissaoUsuarioAtual(chave);
  const podeVer = nivel === "view" || nivel === "edit";
  if (podeVer && normalizarChavePermissaoAcesso(chave) === "cadastros") {
    return usuarioPodeAcaoCadastro("consulta");
  }
  return podeVer;
}

function usuarioPodeEditarSecao(chave) {
  return obterNivelPermissaoUsuarioAtual(chave) === "edit";
}

function usuarioPodeAcaoCadastro(chaveAcao = "") {
  const chave = String(chaveAcao || "").trim();
  if (!authContext.profile || authContext.profile.ativo === false) return false;
  const permissoesAcao = mesclarPermissoesAcao(authContext.profile.permissoesAcao, authContext.profile.permissoes || {});
  return Boolean(permissoesAcao[chave]);
}

function usuarioPodeConfigurarCadastros() {
  return obterNivelPermissaoUsuarioAtual("cadastros") === "edit" && usuarioPodeAcaoCadastro("configuracao");
}

function obterAssinaturaUsuarioAtual() {
  const user = authContext.firebaseUser;
  const profile = authContext.profile;
  return {
    usuarioUid: String(user?.uid || "").trim(),
    usuarioLogin: obterLoginPerfil(profile, user),
    usuarioNome: obterNomeUsuario(user, profile)
  };
}

function preencherCamposOperadorAtual() {
  const { usuarioNome } = obterAssinaturaUsuarioAtual();
  OPERATOR_FIELD_IDS.forEach(id => {
    const campo = getById(id);
    if (!campo) return;
    campo.value = usuarioNome || "";
  });
}

function emitirMudancaContextoAuth() {
  window.nortefrutAuthContext = {
    firebaseUser: authContext.firebaseUser,
    profile: authContext.profile
  };
  window.dispatchEvent(new CustomEvent("nortefrut-auth-context", { detail: window.nortefrutAuthContext }));
}

window.normalizarChavePermissaoAcesso = normalizarChavePermissaoAcesso;
window.obterRotuloPermissaoAcesso = obterRotuloPermissaoAcesso;
window.obterNivelPermissaoUsuarioAtual = obterNivelPermissaoUsuarioAtual;
window.usuarioPodeVerSecao = usuarioPodeVerSecao;
window.usuarioPodeEditarSecao = usuarioPodeEditarSecao;
window.usuarioPodeAcaoCadastro = usuarioPodeAcaoCadastro;
window.usuarioPodeConfigurarCadastros = usuarioPodeConfigurarCadastros;
window.obterAssinaturaUsuarioAtual = obterAssinaturaUsuarioAtual;
window.obterNomeUsuarioAtual = () => obterAssinaturaUsuarioAtual().usuarioNome;
window.obterLoginUsuarioAtual = () => obterAssinaturaUsuarioAtual().usuarioLogin;
window.preencherCamposOperadorAtual = preencherCamposOperadorAtual;

function atualizarResumoPerfil(user = null, profile = null) {
  const nomeEl = getById("portalProfileName");
  const metaEl = getById("portalProfileMeta");
  const nomeInput = getById("profileDisplayName");
  const usernameInput = getById("profileUsername");
  const senhaInput = getById("profilePassword");
  const senhaConfirmInput = getById("profilePasswordConfirm");

  const nome = user ? obterNomeUsuario(user, profile) : "Usuario conectado";
  const login = obterLoginPerfil(profile, user);
  const papel = obterPapelAcessoUsuario(profile);

  if (nomeEl) nomeEl.textContent = nome;
  if (metaEl) metaEl.textContent = login ? `@${login} • ${papel}` : "Aguardando autenticacao...";
  if (nomeInput) nomeInput.value = user ? nome : "";
  if (usernameInput) usernameInput.value = user ? (profile?.authEmail || user.email || "") : "";

  if (!user) {
    if (senhaInput) senhaInput.value = "";
    if (senhaConfirmInput) senhaConfirmInput.value = "";
  }
}

function obterMensagemErroAuth(error) {
  const mensagens = {
    "auth/invalid-email": "Digite um email valido para continuar.",
    "auth/missing-password": "Digite sua senha para continuar.",
    "auth/user-not-found": "Email ou senha invalidos.",
    "auth/wrong-password": "Email ou senha invalidos.",
    "auth/invalid-login-credentials": "Email ou senha invalidos.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "auth/network-request-failed": "Falha de conexao. Verifique a internet e tente novamente.",
    "auth/user-disabled": "Este acesso esta desativado no Firebase.",
    "auth/operation-not-allowed": "O login por email e senha nao esta habilitado no Firebase."
  };

  return mensagens[error?.code] || "Nao foi possivel entrar agora. Confira suas credenciais e tente novamente.";
}

function definirEstadoAuth(estado, user = null, profile = null) {
  const body = document.body;
  const gate = getById("authGate");
  const logoutButton = getById("logoutButton");
  const login = obterLoginPerfil(profile, user);

  body.classList.remove("auth-pending", "auth-locked", "auth-ready");
  body.classList.add(`auth-${estado}`);

  if (gate) {
    gate.setAttribute("aria-hidden", estado === "ready" ? "true" : "false");
  }

  if (logoutButton) {
    const titulo = login ? `Encerrar sessao (@${login})` : "Encerrar sessao";
    logoutButton.classList.toggle("is-hidden", estado !== "ready");
    logoutButton.setAttribute("title", titulo);
    logoutButton.setAttribute("aria-label", titulo);
  }

  atualizarResumoPerfil(user, profile);
}

async function obterUidPorLogin(login) {
  const loginNormalizado = normalizarLoginUsuario(login);
  if (!loginNormalizado) return "";
  const snap = await db.ref(`${USERNAME_INDEX_DB_PATH}/${loginNormalizado}`).once("value");
  return String(snap.val() || "").trim();
}

async function gerarLoginUnico(baseLogin, uidIgnorado = "") {
  const baseNormalizada = normalizarLoginUsuario(baseLogin) || `usuario.${String(uidIgnorado || Date.now()).slice(0, 6)}`;

  for (let tentativa = 0; tentativa < 100; tentativa += 1) {
    const candidato = tentativa === 0 ? baseNormalizada : `${baseNormalizada}.${tentativa + 1}`;
    const uidExistente = await obterUidPorLogin(candidato);
    if (!uidExistente || uidExistente === uidIgnorado) return candidato;
  }

  return `${baseNormalizada}.${Date.now().toString().slice(-4)}`;
}

async function resolverCredenciaisPorLogin(identificador = "") {
  const bruto = String(identificador || "").trim();
  if (!bruto) return { authEmail: "", login: "" };

  if (bruto.includes("@")) {
    return {
      authEmail: bruto,
      login: normalizarLoginUsuario(bruto.split("@")[0] || "")
    };
  }

  const login = normalizarLoginUsuario(bruto);
  const uid = await obterUidPorLogin(login);
  if (uid) {
    const profileSnap = await db.ref(`${USER_PROFILE_DB_PATH}/${uid}`).once("value");
    const profileRaw = profileSnap.val();
    if (profileRaw) {
      const profile = obterPerfilUsuarioNormalizado(uid, profileRaw);
      return {
        authEmail: profile.authEmail,
        login: profile.login,
        uid,
        profile
      };
    }
  }

  return {
    authEmail: gerarEmailInternoUsuario(login),
    login
  };
}

async function garantirPerfilUsuario(user) {
  const profileRef = db.ref(`${USER_PROFILE_DB_PATH}/${user.uid}`);
  const profileSnap = await profileRef.once("value");

  if (profileSnap.exists()) {
    const atual = profileSnap.val() || {};
    let login = obterLoginPerfil(atual, user);
    if (!login) {
      const baseLogin = normalizarLoginUsuario(user.displayName || user.email?.split("@")[0] || `usuario.${user.uid.slice(0, 6)}`);
      login = await gerarLoginUnico(baseLogin, user.uid);
    }

    const profile = obterPerfilUsuarioNormalizado(user.uid, {
      ...atual,
      login,
      authEmail: user.email || atual.authEmail || ""
    }, user);

    const updates = {};
    if (atual.login !== profile.login) updates[`${USER_PROFILE_DB_PATH}/${user.uid}/login`] = profile.login;
    if (atual.authEmail !== profile.authEmail) updates[`${USER_PROFILE_DB_PATH}/${user.uid}/authEmail`] = profile.authEmail;
    if (normalizarNomeExibicao(atual.nome || "") !== profile.nome) updates[`${USER_PROFILE_DB_PATH}/${user.uid}/nome`] = profile.nome;
    if (JSON.stringify(atual.permissoes || {}) !== JSON.stringify(profile.permissoes)) {
      updates[`${USER_PROFILE_DB_PATH}/${user.uid}/permissoes`] = profile.permissoes;
    }
    if (JSON.stringify(atual.permissoesAcao || {}) !== JSON.stringify(profile.permissoesAcao)) {
      updates[`${USER_PROFILE_DB_PATH}/${user.uid}/permissoesAcao`] = profile.permissoesAcao;
    }
    if (profile.login) {
      updates[`${USERNAME_INDEX_DB_PATH}/${profile.login}`] = user.uid;
    }

    if (Object.keys(updates).length) {
      updates[`${USER_PROFILE_DB_PATH}/${user.uid}/atualizadoEm`] = new Date().toLocaleString("pt-BR");
      await db.ref().update(updates);
    }

    return profile;
  }

  const todosUsuariosSnap = await db.ref(USER_PROFILE_DB_PATH).once("value");
  const isPrimeiroUsuario = !todosUsuariosSnap.exists();
  const baseLogin = normalizarLoginUsuario(user.displayName || user.email?.split("@")[0] || `usuario.${user.uid.slice(0, 6)}`);
  const login = await gerarLoginUnico(baseLogin, user.uid);
  const agora = new Date().toLocaleString("pt-BR");
  const profile = {
    uid: user.uid,
    nome: obterNomeUsuario(user),
    login,
    authEmail: normalizarEmailAcesso(user.email || ""),
    ativo: true,
    permissoes: isPrimeiroUsuario ? criarPermissoesGestor() : criarPermissoesPadrao(),
    permissoesAcao: isPrimeiroUsuario ? criarPermissoesAcaoGestor() : criarPermissoesAcaoPadrao(),
    criadoEm: agora,
    atualizadoEm: agora,
    origem: "migracao",
    criadoPor: String(user.email || "migracao").trim()
  };

  const updates = {
    [`${USER_PROFILE_DB_PATH}/${user.uid}`]: profile,
    [`${USERNAME_INDEX_DB_PATH}/${login}`]: user.uid
  };

  await db.ref().update(updates);
  return obterPerfilUsuarioNormalizado(user.uid, profile, user);
}

function aplicarContextoAutenticado(user, profile) {
  authContext = {
    firebaseUser: user,
    profile
  };

  definirEstadoAuth("ready", user, profile);
  atualizarResumoPerfil(user, profile);
  preencherCamposOperadorAtual();
  renderCentralUsuarios();
  emitirMudancaContextoAuth();
}

function limparContextoAutenticado() {
  authContext = {
    firebaseUser: null,
    profile: null
  };

  definirEstadoAuth("locked");
  atualizarResumoPerfil(null, null);
  preencherCamposOperadorAtual();
  renderCentralUsuarios();
  emitirMudancaContextoAuth();
}

function pararObservadorPerfilAtual() {
  if (authProfileListenerRef && authProfileListener) {
    authProfileListenerRef.off("value", authProfileListener);
  }
  authProfileListener = null;
  authProfileListenerRef = null;
}

function observarPerfilAtual(user) {
  pararObservadorPerfilAtual();

  authProfileListenerRef = db.ref(`${USER_PROFILE_DB_PATH}/${user.uid}`);
  authProfileListener = snap => {
    const dados = snap.val();
    if (!dados) return;

    const profile = obterPerfilUsuarioNormalizado(user.uid, dados, user);
    if (profile.ativo === false) {
      mostrarAviso("Seu acesso foi desativado. Entre em contato com o gestor.", "warning", "shield-alert");
      auth.signOut().catch(() => undefined);
      return;
    }

    aplicarContextoAutenticado(user, profile);
  };

  authProfileListenerRef.on("value", authProfileListener);
}

function contarGestoresAtivos(perfis = usuariosSistemaState) {
  return Object.entries(perfis || {}).filter(([, item]) => {
    const profile = obterPerfilUsuarioNormalizado(item?.uid || "", item);
    return profile.ativo && obterNivelPermissaoPerfil(profile, "cadastros") === "edit";
  }).length;
}

function obterPrioridadePresetAcesso(preset = "custom") {
  const prioridades = {
    manager: 0,
    operational: 1,
    viewer: 2,
    custom: 3
  };
  return prioridades[preset] ?? 4;
}

function obterIniciaisUsuario(nome = "") {
  const partes = normalizarNomeExibicao(nome)
    .split(" ")
    .filter(Boolean);

  if (!partes.length) return "US";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] || ""}${partes[partes.length - 1][0] || ""}`.toUpperCase();
}

function obterUsuariosOrdenadosCentral() {
  const selfUid = authContext.firebaseUser?.uid || "";

  return Object.entries(usuariosSistemaState || {})
    .map(([uid, item]) => obterPerfilUsuarioNormalizado(uid, item))
    .sort((a, b) => {
      if (a.uid === selfUid && b.uid !== selfUid) return -1;
      if (b.uid === selfUid && a.uid !== selfUid) return 1;
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;

      const presetA = detectarPresetPermissoes(a.permissoes);
      const presetB = detectarPresetPermissoes(b.permissoes);
      const prioridade = obterPrioridadePresetAcesso(presetA) - obterPrioridadePresetAcesso(presetB);
      if (prioridade !== 0) return prioridade;

      return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

function filtrarUsuariosCentral(usuarios = []) {
  const busca = normalizarBuscaAcesso(accessCentralState.search);

  return usuarios.filter(profile => {
    if (accessCentralState.status === "active" && !profile.ativo) return false;
    if (accessCentralState.status === "inactive" && profile.ativo) return false;

    const preset = detectarPresetPermissoes(profile.permissoes);
    if (accessCentralState.role !== "all" && preset !== accessCentralState.role) return false;
    if (accessCentralState.action !== "all" && !profile.permissoesAcao?.[accessCentralState.action]) return false;

    if (!busca) return true;

    const alvo = [profile.nome, profile.login, profile.authEmail, obterPapelAcessoUsuario(profile)]
      .map(valor => normalizarBuscaAcesso(valor))
      .join(" ");

    return alvo.includes(busca);
  });
}

function atualizarResumoCentralUsuarios(usuarios = [], filtrados = usuarios) {
  const total = usuarios.length;
  const ativos = usuarios.filter(profile => profile.ativo).length;
  const gestores = usuarios.filter(profile => detectarPresetPermissoes(profile.permissoes) === "manager").length;
  const viewers = usuarios.filter(profile => detectarPresetPermissoes(profile.permissoes) === "viewer").length;

  const totalEl = getById("authAccessTotal");
  const ativosEl = getById("authAccessActive");
  const gestoresEl = getById("authAccessManagers");
  const viewersEl = getById("authAccessViewers");
  const visibleEl = getById("authAccessVisibleMeta");

  if (totalEl) totalEl.textContent = String(total);
  if (ativosEl) ativosEl.textContent = String(ativos);
  if (gestoresEl) gestoresEl.textContent = String(gestores);
  if (viewersEl) viewersEl.textContent = String(viewers);

  if (visibleEl) {
    visibleEl.textContent = total
      ? `${filtrados.length} de ${total} acessos exibidos`
      : "Nenhum acesso cadastrado";
  }
}

function atualizarHintPresetCriacao() {
  const presetSelect = getById("authAdminAccessPreset");
  const hint = getById("authAdminPresetHint");
  if (!presetSelect || !hint) return;

  const preset = presetSelect.value || "viewer";
  const config = obterConfigPresetAcesso(preset);
  hint.textContent = `${config.description} Voce pode ajustar modulo por modulo depois.`;
}

function sincronizarFormularioCriacaoAcesso(canEdit) {
  const card = document.querySelector(".access-creation-card");
  [
    "authAdminUserName",
    "authAdminUserLogin",
    "authAdminAccessPreset",
    "authAdminUserPassword",
    "authAdminCreateUserButton"
  ].forEach(id => {
    const campo = getById(id);
    if (!campo) return;
    campo.disabled = !canEdit;
  });

  card?.classList.toggle("is-readonly", !canEdit);
}

function obterResumoTextoPermissoes(permissoes = {}) {
  const resumo = obterResumoPermissoes(permissoes);
  return {
    principal: `${resumo.edit} com edicao • ${resumo.view} com visualizacao`,
    secundario: `${resumo.none} areas bloqueadas`
  };
}

function obterResumoTextoPermissoesAcao(permissoesAcao = {}) {
  const liberadas = Object.keys(ACCESS_ACTION_LABELS).filter(chave => permissoesAcao?.[chave]);
  if (!liberadas.length) return "Nenhuma acao liberada";
  if (liberadas.length === Object.keys(ACCESS_ACTION_LABELS).length) return "Todas as acoes liberadas";
  return liberadas.map(chave => ACCESS_ACTION_LABELS[chave]).join(", ");
}

function obterNivelPermissaoCampo(campo) {
  const valor = campo?.querySelector("[data-auth-user-permission]")?.value;
  return normalizarNivelPermissao(valor, "none");
}

function aplicarNivelPermissaoCampo(campo, nivel = "none") {
  if (!campo) return;

  const nivelNormalizado = normalizarNivelPermissao(nivel, "none");
  const input = campo.querySelector("[data-auth-user-permission]");
  if (input) input.value = nivelNormalizado;

  campo.dataset.permissionLevel = nivelNormalizado;

  const viewButton = campo.querySelector('[data-auth-permission-flag="view"]');
  const editButton = campo.querySelector('[data-auth-permission-flag="edit"]');

  if (viewButton) {
    const ativo = nivelNormalizado === "view" || nivelNormalizado === "edit";
    viewButton.classList.toggle("is-active", ativo);
    viewButton.setAttribute("aria-pressed", ativo ? "true" : "false");
  }

  if (editButton) {
    const ativo = nivelNormalizado === "edit";
    editButton.classList.toggle("is-active", ativo);
    editButton.setAttribute("aria-pressed", ativo ? "true" : "false");
  }
}

function alternarFlagPermissaoCampo(campo, flag = "view") {
  const nivelAtual = obterNivelPermissaoCampo(campo);
  let proximoNivel = nivelAtual;

  if (flag === "edit") {
    proximoNivel = nivelAtual === "edit" ? "view" : "edit";
  } else if (nivelAtual === "none") {
    proximoNivel = "view";
  } else if (nivelAtual === "view") {
    proximoNivel = "none";
  } else {
    proximoNivel = "none";
  }

  aplicarNivelPermissaoCampo(campo, proximoNivel);
  return proximoNivel;
}

function preencherPermissoesNoCard(card, permissoes = {}) {
  card?.querySelectorAll("[data-auth-user-permission]").forEach(input => {
    const chave = input.dataset.authUserPermission;
    aplicarNivelPermissaoCampo(
      input.closest(".access-permission-field"),
      normalizarNivelPermissao(permissoes?.[chave], "none")
    );
  });
}

function coletarPermissoesAcaoDoCard(card) {
  const permissoesAcao = {};
  card?.querySelectorAll("[data-auth-user-action-permission]").forEach(input => {
    permissoesAcao[input.dataset.authUserActionPermission] = input.value === "true";
  });
  return mesclarPermissoesAcao(permissoesAcao);
}

function aplicarPermissaoAcaoCampo(campo, permitido = false) {
  if (!campo) return;
  const ativo = Boolean(permitido);
  const input = campo.querySelector("[data-auth-user-action-permission]");
  const botao = campo.querySelector("[data-auth-action-flag]");
  if (input) input.value = ativo ? "true" : "false";
  campo.classList.toggle("is-active", ativo);
  if (botao) {
    botao.classList.toggle("is-active", ativo);
    botao.setAttribute("aria-pressed", ativo ? "true" : "false");
  }
}

function preencherPermissoesAcaoNoCard(card, permissoesAcao = {}) {
  const normalizadas = mesclarPermissoesAcao(permissoesAcao);
  card?.querySelectorAll("[data-auth-user-action-permission]").forEach(input => {
    aplicarPermissaoAcaoCampo(
      input.closest(".access-action-permission-field"),
      normalizadas[input.dataset.authUserActionPermission]
    );
  });
}

function sincronizarEstadoCardUsuario(card, profile) {
  if (!card || !profile) return;

  const permissoesAtuais = mesclarPermissoesUsuario(profile.permissoes || {});
  const permissoesSelecionadas = coletarPermissoesDoCard(card);
  const permissoesAcaoAtuais = mesclarPermissoesAcao(profile.permissoesAcao, profile.permissoes || {});
  const permissoesAcaoSelecionadas = coletarPermissoesAcaoDoCard(card);
  const houveAlteracao = !permissoesSaoIguais(permissoesAtuais, permissoesSelecionadas)
    || !permissoesAcaoSaoIguais(permissoesAcaoAtuais, permissoesAcaoSelecionadas);
  const presetAtual = detectarPresetPermissoes(permissoesSelecionadas);
  const resumo = obterResumoTextoPermissoes(permissoesSelecionadas);
  const podeEditar = usuarioPodeConfigurarCadastros();

  card.classList.toggle("is-dirty", houveAlteracao);

  const badgePreset = card.querySelector("[data-auth-user-preset-badge]");
  if (badgePreset) {
    badgePreset.textContent = presetAtual === "custom"
      ? "Personalizado"
      : obterConfigPresetAcesso(presetAtual).label;
    badgePreset.classList.toggle("is-custom", presetAtual === "custom");
  }

  const destaquePrincipal = card.querySelector("[data-auth-user-summary-main]");
  const destaqueSecundario = card.querySelector("[data-auth-user-summary-sub]");
  if (destaquePrincipal) destaquePrincipal.textContent = resumo.principal;
  if (destaqueSecundario) {
    destaqueSecundario.textContent = houveAlteracao
      ? "Alteracoes pendentes. Salve para aplicar."
      : resumo.secundario;
  }

  const resumoAcoes = card.querySelector("[data-auth-user-action-summary]");
  if (resumoAcoes) resumoAcoes.textContent = obterResumoTextoPermissoesAcao(permissoesAcaoSelecionadas);

  const painelAvancado = card.querySelector(".access-advanced-panel");
  if (painelAvancado) {
    if (houveAlteracao && presetAtual === "custom") {
      painelAvancado.open = true;
    } else if (!houveAlteracao && presetAtual !== "custom" && painelAvancado.dataset.forceOpen !== "true") {
      painelAvancado.open = false;
    }
  }

  const saveButton = card.querySelector('[data-auth-user-action="salvar-permissoes"]');
  if (saveButton) saveButton.disabled = !podeEditar || !houveAlteracao;
}

function reverterPermissoesNoCard(uid) {
  const card = document.querySelector(`.access-user-card[data-uid="${uid}"]`);
  const profile = usuariosSistemaState?.[uid];
  if (!card || !profile) return;

  const profileNormalizado = obterPerfilUsuarioNormalizado(uid, profile);
  const painelAvancado = card.querySelector(".access-advanced-panel");
  if (painelAvancado) {
    delete painelAvancado.dataset.forceOpen;
    painelAvancado.open = false;
  }
  preencherPermissoesNoCard(card, profileNormalizado.permissoes);
  preencherPermissoesAcaoNoCard(card, profileNormalizado.permissoesAcao);
  sincronizarEstadoCardUsuario(card, profileNormalizado);
}

function criarCardUsuarioCentral(profile, { canEdit = false, openByDefault = false } = {}) {
  const card = document.createElement("details");
  card.className = `access-user-card ${profile.ativo ? "" : "is-inactive"}`.trim();
  card.dataset.uid = profile.uid;
  card.open = openByDefault;

  const summary = document.createElement("summary");
  summary.className = "access-user-summary";

  const lead = document.createElement("div");
  lead.className = "access-user-lead";

  const avatar = document.createElement("span");
  avatar.className = "access-user-avatar";
  avatar.textContent = obterIniciaisUsuario(profile.nome);

  const titleWrap = document.createElement("div");
  titleWrap.className = "access-user-title";

  const title = document.createElement("strong");
  title.textContent = profile.nome || "Usuario sem nome";

  const login = document.createElement("span");
  login.textContent = profile.authEmail || (profile.login ? `@${profile.login}` : "Sem email");

  titleWrap.append(title, login);
  lead.append(avatar, titleWrap);

  const side = document.createElement("div");
  side.className = "access-user-side";

  const badges = document.createElement("div");
  badges.className = "access-user-badges";

  const roleBadge = document.createElement("span");
  roleBadge.className = "access-user-badge";
  roleBadge.dataset.authUserPresetBadge = "true";

  const statusBadge = document.createElement("span");
  statusBadge.className = `access-user-badge ${profile.ativo ? "is-active" : "is-inactive"}`;
  statusBadge.textContent = profile.ativo ? "Ativo" : "Inativo";

  badges.append(roleBadge, statusBadge);
  if (profile.uid === authContext.firebaseUser?.uid) {
    const ownBadge = document.createElement("span");
    ownBadge.className = "access-user-badge is-current";
    ownBadge.textContent = "Sessao atual";
    badges.appendChild(ownBadge);
  }

  const highlight = document.createElement("div");
  highlight.className = "access-user-highlight";

  const highlightMain = document.createElement("strong");
  highlightMain.dataset.authUserSummaryMain = "true";

  const highlightSub = document.createElement("small");
  highlightSub.dataset.authUserSummarySub = "true";

  highlight.append(highlightMain, highlightSub);
  side.append(badges, highlight);
  summary.append(lead, side);

  const body = document.createElement("div");
  body.className = "access-user-body";

  const meta = document.createElement("p");
  meta.className = "access-user-meta";
  meta.textContent = `Criado em ${profile.criadoEm || "-"}${profile.criadoPor ? ` - por ${profile.criadoPor}` : ""}${profile.atualizadoEm ? ` - atualizado em ${profile.atualizadoEm}` : ""}`;

  const actionPanel = document.createElement("section");
  actionPanel.className = "access-action-permissions";

  const actionHead = document.createElement("div");
  actionHead.className = "access-permission-group-head";

  const actionTitle = document.createElement("strong");
  actionTitle.textContent = "Permissoes por acao";

  const actionSummary = document.createElement("span");
  actionSummary.dataset.authUserActionSummary = "true";

  actionHead.append(actionTitle, actionSummary);

  const actionGrid = document.createElement("div");
  actionGrid.className = "access-action-permissions-grid";

  Object.entries(ACCESS_ACTION_LABELS).forEach(([chave, rotulo]) => {
    const field = document.createElement("div");
    field.className = "access-action-permission-field";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "access-permission-flag";
    button.dataset.authActionFlag = chave;
    button.textContent = rotulo;
    button.disabled = !canEdit;

    const input = document.createElement("input");
    input.type = "hidden";
    input.dataset.authUserActionPermission = chave;

    field.append(button, input);
    aplicarPermissaoAcaoCampo(field, profile.permissoesAcao?.[chave]);
    actionGrid.appendChild(field);
  });

  actionPanel.append(actionHead, actionGrid);

  const groups = document.createElement("div");
  groups.className = "access-permission-groups";

  ACCESS_PERMISSION_GROUPS.forEach(grupo => {
    const section = document.createElement("section");
    section.className = "access-permission-group";

    const head = document.createElement("div");
    head.className = "access-permission-group-head";

    const headTitle = document.createElement("strong");
    headTitle.textContent = grupo.label;

    const headDesc = document.createElement("span");
    headDesc.textContent = grupo.description;

    head.append(headTitle, headDesc);

    const grid = document.createElement("div");
    grid.className = "access-permissions-grid";

    grupo.sections.forEach(chave => {
      const field = document.createElement("div");
      field.className = "access-permission-field access-permission-field--flags";

      const caption = document.createElement("span");
      caption.textContent = ACCESS_SECTION_LABELS[chave];

      const flags = document.createElement("div");
      flags.className = "access-permission-flags";

      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "access-permission-flag";
      viewButton.dataset.authPermissionFlag = "view";
      viewButton.textContent = "Ver";
      viewButton.disabled = !canEdit;

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "access-permission-flag";
      editButton.dataset.authPermissionFlag = "edit";
      editButton.textContent = "Editar";
      editButton.disabled = !canEdit;

      const input = document.createElement("input");
      input.type = "hidden";
      input.dataset.authUserPermission = chave;
      input.value = obterNivelPermissaoPerfil(profile, chave);

      if (profile.uid === authContext.firebaseUser?.uid && chave === "cadastros") {
        field.title = "A sessao atual precisa manter a edicao de cadastros para nao perder o gerenciamento.";
      }

      flags.append(viewButton, editButton);
      field.append(caption, flags, input);
      aplicarNivelPermissaoCampo(field, input.value);
      grid.appendChild(field);
    });

    section.append(head, grid);
    groups.appendChild(section);
  });

  const advanced = document.createElement("details");
  advanced.className = "access-advanced-panel";

  const advancedSummary = document.createElement("summary");
  advancedSummary.textContent = "Ajustar permissoes por modulo";

  const advancedBody = document.createElement("div");
  advancedBody.className = "access-advanced-panel-body";
  advancedBody.appendChild(groups);

  advanced.append(advancedSummary, advancedBody);

  const actions = document.createElement("div");
  actions.className = "access-user-actions";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "cadastro-action solid";
  saveButton.textContent = "Salvar permissoes";
  saveButton.dataset.authUserAction = "salvar-permissoes";
  saveButton.dataset.uid = profile.uid;

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = profile.ativo ? "cadastro-action danger" : "cadastro-action";
  toggleButton.textContent = profile.ativo ? "Desativar acesso" : "Ativar acesso";
  toggleButton.dataset.authUserAction = profile.ativo ? "desativar-usuario" : "ativar-usuario";
  toggleButton.dataset.uid = profile.uid;
  toggleButton.disabled = !canEdit;

  actions.append(saveButton, toggleButton);
  body.append(meta, actionPanel, advanced, actions);
  card.append(summary, body);

  card.addEventListener("toggle", () => {
    if (!card.open) {
      reverterPermissoesNoCard(profile.uid);
    }
  });

  sincronizarEstadoCardUsuario(card, profile);
  return card;
}

function renderCentralUsuarios() {
  const container = getById("authUsersAdminList");
  const canView = usuarioPodeVerSecao("cadastros");
  const canEdit = usuarioPodeConfigurarCadastros();

  sincronizarFormularioCriacaoAcesso(canEdit);
  atualizarHintPresetCriacao();

  if (!container) return;
  limparConteudoElemento(container);

  const usuarios = obterUsuariosOrdenadosCentral();
  const filtrados = filtrarUsuariosCentral(usuarios);
  atualizarResumoCentralUsuarios(usuarios, filtrados);

  if (!canView) {
    container.appendChild(criarParagrafoVazio("Seu login nao possui acesso a esta central."));
    refreshLucideIcons();
    return;
  }

  if (!usuarios.length) {
    container.appendChild(criarParagrafoVazio("Nenhum acesso configurado até o momento."));
    refreshLucideIcons();
    return;
  }

  usuarios.forEach(profile => {
    const card = document.createElement("article");
    card.className = `access-user-card ${profile.ativo ? "" : "is-inactive"}`.trim();
    card.dataset.uid = profile.uid;

    const head = document.createElement("div");
    head.className = "access-user-head";

    const titleWrap = document.createElement("div");
    titleWrap.className = "access-user-title";

    const title = document.createElement("strong");
    title.textContent = profile.nome || "Usuario sem nome";

    const login = document.createElement("span");
    login.textContent = profile.authEmail || (profile.login ? `@${profile.login}` : "Sem email");

    titleWrap.append(title, login);

    const badges = document.createElement("div");
    badges.className = "access-user-badges";

    const roleBadge = document.createElement("span");
    roleBadge.className = "access-user-badge";
    roleBadge.textContent = obterPapelAcessoUsuario(profile);

    const statusBadge = document.createElement("span");
    statusBadge.className = `access-user-badge ${profile.ativo ? "is-active" : "is-inactive"}`;
    statusBadge.textContent = profile.ativo ? "Ativo" : "Inativo";

    badges.append(roleBadge, statusBadge);
    if (profile.uid === authContext.firebaseUser?.uid) {
      const ownBadge = document.createElement("span");
      ownBadge.className = "access-user-badge is-current";
      ownBadge.textContent = "Sessao atual";
      badges.appendChild(ownBadge);
    }

    head.append(titleWrap, badges);

    const meta = document.createElement("p");
    meta.className = "access-user-meta";
    meta.textContent = `Criado em ${profile.criadoEm || "-"}${profile.criadoPor ? ` • por ${profile.criadoPor}` : ""}`;

    const grid = document.createElement("div");
    grid.className = "access-permissions-grid";

    Object.keys(ACCESS_SECTION_LABELS).forEach(chave => {
      const field = document.createElement("label");
      field.className = "access-permission-field";

      const caption = document.createElement("span");
      caption.textContent = ACCESS_SECTION_LABELS[chave];

      const select = document.createElement("select");
      select.dataset.authUserPermission = chave;
      select.disabled = !canEdit;

      ACCESS_PERMISSION_LEVELS.forEach(nivel => {
        const option = document.createElement("option");
        option.value = nivel;
        option.textContent = ACCESS_PERMISSION_LABELS[nivel];
        option.selected = obterNivelPermissaoPerfil(profile, chave) === nivel;
        select.appendChild(option);
      });

      if (profile.uid === authContext.firebaseUser?.uid && chave === "cadastros") {
        select.title = "O acesso atual precisa manter a edição de cadastros para não perder o gerenciamento.";
      }

      field.append(caption, select);
      grid.appendChild(field);
    });

    const actions = document.createElement("div");
    actions.className = "access-user-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "cadastro-action";
    saveButton.textContent = "Salvar permissões";
    saveButton.dataset.authUserAction = "salvar-permissoes";
    saveButton.dataset.uid = profile.uid;
    saveButton.disabled = !canEdit;

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = profile.ativo ? "cadastro-action danger" : "cadastro-action";
    toggleButton.textContent = profile.ativo ? "Desativar acesso" : "Ativar acesso";
    toggleButton.dataset.authUserAction = profile.ativo ? "desativar-usuario" : "ativar-usuario";
    toggleButton.dataset.uid = profile.uid;
    toggleButton.disabled = !canEdit;

    actions.append(saveButton, toggleButton);
    card.append(head, meta, grid, actions);
    container.appendChild(card);
  });

  refreshLucideIcons();
}

function observarUsuariosSistema() {
  if (authUsersListener) return;

  authUsersListener = snap => {
    usuariosSistemaState = snap.val() || {};
    renderCentralUsuarios();
  };

  db.ref(USER_PROFILE_DB_PATH).on("value", authUsersListener);
}

function coletarPermissoesDoCard(card) {
  const permissoes = {};
  card?.querySelectorAll("[data-auth-user-permission]").forEach(input => {
    permissoes[input.dataset.authUserPermission] = normalizarNivelPermissao(input.value, "none");
  });
  return mesclarPermissoesUsuario(permissoes);
}

function obterMensagemErroCriacaoUsuario(error) {
  const mensagens = {
    "auth/email-already-in-use": "Esse email de acesso ja esta em uso.",
    "auth/invalid-email": "Informe um email valido para criar o acesso.",
    "auth/weak-password": `A senha inicial precisa ter pelo menos ${AUTH_MIN_PASSWORD_LENGTH} caracteres.`,
    "auth/network-request-failed": "Falha de conexao. Verifique a internet e tente novamente.",
    "auth/operation-not-allowed": "O cadastro por email e senha nao esta habilitado no Firebase.",
    "functions/unauthenticated": "Entre novamente no sistema antes de criar acessos.",
    "functions/permission-denied": "Seu login nao possui Configuracao para criar acessos.",
    "functions/invalid-argument": error?.message || "Revise os dados informados para criar o acesso.",
    "functions/not-found": "A funcao administrativa ainda nao foi publicada no Firebase.",
    "functions/internal": error?.message || "A funcao administrativa nao conseguiu criar esse acesso.",
    "PERMISSION_DENIED": "O Firebase recusou salvar esse acesso no banco. Verifique as regras de permissao.",
    "permission_denied": "O Firebase recusou salvar esse acesso no banco. Verifique as regras de permissao."
  };

  return mensagens[error?.code] || mensagens[error?.message] || `Nao foi possivel criar o acesso agora.${error?.code ? ` (${error.code})` : ""}`;
}

function obterCallableCriacaoAcesso() {
  if (!firebase?.functions) return null;
  return firebase.functions().httpsCallable(AUTH_CREATE_ACCESS_FUNCTION_NAME);
}

async function criarUsuarioAcesso() {
  if (!usuarioPodeConfigurarCadastros()) {
    avisoErro("Seu login nao pode criar novos acessos.");
    return;
  }

  const nomeInput = getById("authAdminUserName");
  const loginInput = getById("authAdminUserLogin");
  const senhaInput = getById("authAdminUserPassword");
  const createButton = getById("authAdminCreateUserButton");

  const nome = normalizarNomeExibicao(nomeInput?.value || "");
  const authEmail = normalizarEmailAcesso(loginInput?.value || "");
  const senha = String(senhaInput?.value || "");

  if (!nome) {
    avisoValidacao("Informe o nome do novo usuario.");
    nomeInput?.focus();
    return;
  }

  if (!emailAcessoValido(authEmail)) {
    avisoValidacao("Informe um email de acesso valido.");
    loginInput?.focus();
    return;
  }

  if (senha.length < AUTH_MIN_PASSWORD_LENGTH) {
    avisoValidacao(`A senha inicial precisa ter pelo menos ${AUTH_MIN_PASSWORD_LENGTH} caracteres.`);
    senhaInput?.focus();
    return;
  }

  const criarAcesso = obterCallableCriacaoAcesso();
  if (!criarAcesso) {
    mostrarAviso("Firebase Functions nao esta disponivel nesta pagina.", "error", "alert-circle");
    return;
  }

  alternarBotaoCarregando(createButton, true, createButton?.innerHTML || "Criar acesso");

  try {
    await criarAcesso({
      nome,
      email: authEmail,
      senha,
      permissoesAcao: criarPermissoesAcaoPadrao()
    });

    if (nomeInput) nomeInput.value = "";
    if (loginInput) loginInput.value = "";
    if (senhaInput) senhaInput.value = "";
    mostrarAviso("Acesso criado com sucesso com Consulta.", "success", "user-plus");
  } catch (error) {
    console.error("Erro ao criar acesso:", error);
    mostrarAviso(obterMensagemErroCriacaoUsuario(error), "error", "alert-circle");
  } finally {
    alternarBotaoCarregando(createButton, false, createButton?.dataset.originalText || "Criar acesso");
  }
}

async function salvarPermissoesUsuario(uid) {
  if (!usuarioPodeConfigurarCadastros()) {
    avisoErro("Seu login nao pode alterar permissoes.");
    return;
  }

  const profileAtual = usuariosSistemaState?.[uid];
  if (!profileAtual) return;

  const card = document.querySelector(`.access-user-card[data-uid="${uid}"]`);
  const botao = card?.querySelector('[data-auth-user-action="salvar-permissoes"]');
  const permissoes = coletarPermissoesDoCard(card);
  const permissoesAcao = coletarPermissoesAcaoDoCard(card);
  const selfUid = authContext.firebaseUser?.uid || "";
  const gestoresAtivos = contarGestoresAtivos();
  const eraGestor = obterNivelPermissaoPerfil(profileAtual, "cadastros") === "edit";
  const seraGestor = permissoes.cadastros === "edit";

  if (uid === selfUid && !seraGestor) {
    avisoValidacao("A sessao atual precisa manter a edicao de cadastros para nao perder o gerenciamento.");
    return;
  }

  if (eraGestor && !seraGestor && gestoresAtivos <= 1) {
    avisoValidacao("Mantenha pelo menos um gestor ativo com acesso total aos cadastros.");
    return;
  }

  alternarBotaoCarregando(botao, true, botao?.innerHTML || "Salvar permissões");

  db.ref(`${USER_PROFILE_DB_PATH}/${uid}`).update({
    permissoes,
    permissoesAcao,
    atualizadoEm: new Date().toLocaleString("pt-BR")
  }).then(() => {
    avisoSucesso("Permissoes atualizadas com sucesso.", "shield-check");
  }).catch(() => {
    avisoErro("Nao foi possivel salvar as permissoes.");
  }).finally(() => {
    alternarBotaoCarregando(botao, false, botao?.dataset.originalText || "Salvar permissões");
  });
}

async function alternarUsuarioAtivo(uid, ativo) {
  if (!usuarioPodeConfigurarCadastros()) {
    avisoErro("Seu login nao pode gerenciar acessos.");
    return;
  }

  const profileAtual = usuariosSistemaState?.[uid];
  if (!profileAtual) return;

  const profileNormalizado = obterPerfilUsuarioNormalizado(uid, profileAtual);
  const selfUid = authContext.firebaseUser?.uid || "";
  const gestoresAtivos = contarGestoresAtivos();
  const ehGestor = obterNivelPermissaoPerfil(profileNormalizado, "cadastros") === "edit";

  if (!ativo && uid === selfUid) {
    avisoValidacao("A sessao atual nao pode ser desativada por aqui.");
    return;
  }

  if (!ativo && ehGestor && gestoresAtivos <= 1) {
    avisoValidacao("Mantenha pelo menos um gestor ativo com acesso total aos cadastros.");
    return;
  }

  const titulo = ativo ? "Ativar acesso?" : "Desativar acesso?";
  const detalhe = ativo
    ? "O usuario podera voltar a entrar com o mesmo login."
    : "O usuario continuara cadastrado, mas nao podera entrar enquanto estiver inativo.";
  const confirmado = await confirmarAcao({
    titulo,
    mensagem: `${profileNormalizado.nome} (@${profileNormalizado.login})`,
    detalhe,
    confirmarTexto: ativo ? "Ativar" : "Desativar",
    cancelarTexto: "Cancelar"
  });

  if (!confirmado) return;

  db.ref(`${USER_PROFILE_DB_PATH}/${uid}`).update({
    ativo,
    atualizadoEm: new Date().toLocaleString("pt-BR")
  }).then(() => {
    avisoSucesso(ativo ? "Acesso ativado." : "Acesso desativado.", ativo ? "shield-check" : "shield-alert");
  }).catch(() => {
    avisoErro("Nao foi possivel atualizar esse acesso.");
  });
}

function vincularAcoesCentralUsuarios() {
  document.addEventListener("click", event => {
    const actionFlagTrigger = event.target.closest("[data-auth-action-flag]");
    if (actionFlagTrigger instanceof HTMLButtonElement) {
      const campo = actionFlagTrigger.closest(".access-action-permission-field");
      const card = actionFlagTrigger.closest(".access-user-card");
      const uid = card?.dataset.uid || "";
      const profile = usuariosSistemaState?.[uid];

      if (!campo || !card || !profile || actionFlagTrigger.disabled) return;

      event.preventDefault();
      const input = campo.querySelector("[data-auth-user-action-permission]");
      aplicarPermissaoAcaoCampo(campo, input?.value !== "true");
      sincronizarEstadoCardUsuario(card, obterPerfilUsuarioNormalizado(uid, profile));
      return;
    }

    const flagTrigger = event.target.closest("[data-auth-permission-flag]");
    if (flagTrigger instanceof HTMLButtonElement) {
      const campo = flagTrigger.closest(".access-permission-field");
      const card = flagTrigger.closest(".access-user-card");
      const uid = card?.dataset.uid || "";
      const profile = usuariosSistemaState?.[uid];

      if (!campo || !card || !profile || flagTrigger.disabled) return;

      event.preventDefault();
      alternarFlagPermissaoCampo(campo, flagTrigger.dataset.authPermissionFlag || "view");
      sincronizarEstadoCardUsuario(card, obterPerfilUsuarioNormalizado(uid, profile));
      return;
    }

    const trigger = event.target.closest("[data-auth-user-action]");
    if (!trigger) return;

    const action = trigger.dataset.authUserAction;
    const uid = trigger.dataset.uid || "";

    if (action === "criar-usuario") return void criarUsuarioAcesso();
    if (action === "salvar-permissoes") return void salvarPermissoesUsuario(uid);
    if (action === "desativar-usuario") return void alternarUsuarioAtivo(uid, false);
    if (action === "ativar-usuario") return void alternarUsuarioAtivo(uid, true);
  });
}

function gerarSenhaProvisoriaAcesso() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let senha = "";
  for (let indice = 0; indice < 10; indice += 1) {
    senha += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return senha;
}

function sincronizarSugestaoLoginAcesso() {
  const loginInput = getById("authAdminUserLogin");
  if (loginInput && !loginInput.dataset.manual) loginInput.dataset.manual = "true";
}

function renderCentralUsuarios() {
  const container = getById("authUsersAdminList");
  const canView = usuarioPodeVerSecao("cadastros");
  const canEdit = usuarioPodeConfigurarCadastros();

  sincronizarFormularioCriacaoAcesso(canEdit);
  atualizarHintPresetCriacao();

  if (!container) return;
  limparConteudoElemento(container);

  const usuarios = obterUsuariosOrdenadosCentral();
  const filtrados = filtrarUsuariosCentral(usuarios);
  atualizarResumoCentralUsuarios(usuarios, filtrados);

  if (!canView) {
    container.appendChild(criarParagrafoVazio("Seu login nao possui acesso a esta central."));
    refreshLucideIcons();
    return;
  }

  if (!usuarios.length) {
    container.appendChild(criarParagrafoVazio("Nenhum acesso configurado ate o momento."));
    refreshLucideIcons();
    return;
  }

  if (!filtrados.length) {
    container.appendChild(criarParagrafoVazio("Nenhum acesso corresponde aos filtros aplicados."));
    refreshLucideIcons();
    return;
  }

  filtrados.forEach(profile => {
    container.appendChild(
      criarCardUsuarioCentral(profile, {
        canEdit,
        openByDefault: false
      })
    );
  });

  refreshLucideIcons();
}

async function criarUsuarioAcesso() {
  if (!usuarioPodeConfigurarCadastros()) {
    avisoErro("Seu login nao pode criar novos acessos.");
    return;
  }

  const nomeInput = getById("authAdminUserName");
  const loginInput = getById("authAdminUserLogin");
  const senhaInput = getById("authAdminUserPassword");
  const createButton = getById("authAdminCreateUserButton");

  const nome = normalizarNomeExibicao(nomeInput?.value || "");
  const authEmail = normalizarEmailAcesso(loginInput?.value || "");
  const senhaDigitada = String(senhaInput?.value || "").trim();
  const senhaGeradaAutomaticamente = !senhaDigitada;
  const senha = senhaDigitada || gerarSenhaProvisoriaAcesso();

  if (!nome) {
    avisoValidacao("Informe o nome do novo usuario.");
    nomeInput?.focus();
    return;
  }

  if (!emailAcessoValido(authEmail)) {
    avisoValidacao("Informe um email de acesso valido.");
    loginInput?.focus();
    return;
  }

  if (senha.length < AUTH_MIN_PASSWORD_LENGTH) {
    avisoValidacao(`A senha inicial precisa ter pelo menos ${AUTH_MIN_PASSWORD_LENGTH} caracteres.`);
    senhaInput?.focus();
    return;
  }

  const criarAcesso = obterCallableCriacaoAcesso();
  if (!criarAcesso) {
    mostrarAviso("Firebase Functions nao esta disponivel nesta pagina.", "error", "alert-circle");
    return;
  }

  alternarBotaoCarregando(createButton, true, createButton?.innerHTML || "Criar acesso");

  try {
    await criarAcesso({
      nome,
      email: authEmail,
      senha,
      permissoesAcao: criarPermissoesAcaoPadrao()
    });

    if (nomeInput) nomeInput.value = "";
    if (loginInput) {
      loginInput.value = "";
      loginInput.dataset.manual = "false";
    }
    if (senhaInput) senhaInput.value = "";
    atualizarHintPresetCriacao();
    const mensagemSucesso = senhaGeradaAutomaticamente
      ? `Acesso criado com Consulta. Senha provisoria: ${senha}`
      : "Acesso criado com sucesso com Consulta.";
    mostrarAviso(mensagemSucesso, "success", "user-plus");
  } catch (error) {
    console.error("Erro ao criar acesso:", error);
    mostrarAviso(obterMensagemErroCriacaoUsuario(error), "error", "alert-circle");
  } finally {
    alternarBotaoCarregando(createButton, false, createButton?.dataset.originalText || "Criar acesso");
  }
}

function vincularAcoesCentralUsuarios() {
  if (document.body.dataset.accessCentralBound === "true") return;
  document.body.dataset.accessCentralBound = "true";

  document.addEventListener("click", event => {
    const actionFlagTrigger = event.target.closest("[data-auth-action-flag]");
    if (actionFlagTrigger instanceof HTMLButtonElement) {
      const campo = actionFlagTrigger.closest(".access-action-permission-field");
      const card = actionFlagTrigger.closest(".access-user-card");
      const uid = card?.dataset.uid || "";
      const profile = usuariosSistemaState?.[uid];

      if (!campo || !card || !profile || actionFlagTrigger.disabled) return;

      event.preventDefault();
      const input = campo.querySelector("[data-auth-user-action-permission]");
      aplicarPermissaoAcaoCampo(campo, input?.value !== "true");
      sincronizarEstadoCardUsuario(card, obterPerfilUsuarioNormalizado(uid, profile));
      return;
    }

    const flagTrigger = event.target.closest("[data-auth-permission-flag]");
    if (flagTrigger instanceof HTMLButtonElement) {
      const campo = flagTrigger.closest(".access-permission-field");
      const card = flagTrigger.closest(".access-user-card");
      const uid = card?.dataset.uid || "";
      const profile = usuariosSistemaState?.[uid];

      if (!campo || !card || !profile || flagTrigger.disabled) return;

      event.preventDefault();
      alternarFlagPermissaoCampo(campo, flagTrigger.dataset.authPermissionFlag || "view");
      sincronizarEstadoCardUsuario(card, obterPerfilUsuarioNormalizado(uid, profile));
      return;
    }

    const trigger = event.target.closest("[data-auth-user-action]");
    if (!trigger) return;

    const action = trigger.dataset.authUserAction;
    const uid = trigger.dataset.uid || "";

    if (action === "criar-usuario") return void criarUsuarioAcesso();
    if (action === "salvar-permissoes") return void salvarPermissoesUsuario(uid);
    if (action === "desativar-usuario") return void alternarUsuarioAtivo(uid, false);
    if (action === "ativar-usuario") return void alternarUsuarioAtivo(uid, true);
  });

  document.addEventListener("input", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === "authAdminUserName") {
      sincronizarSugestaoLoginAcesso();
      return;
    }

    if (target.id === "authAdminUserLogin") {
      const loginInput = getById("authAdminUserLogin");
      if (loginInput) loginInput.dataset.manual = "true";
      return;
    }

    if (target.id === "authAccessSearch") {
      accessCentralState.search = target.value || "";
      renderCentralUsuarios();
      return;
    }

    if (target.matches("[data-auth-user-permission]")) {
      const card = target.closest(".access-user-card");
      const uid = card?.dataset.uid || "";
      const profile = usuariosSistemaState?.[uid];
      if (!card || !profile) return;
      sincronizarEstadoCardUsuario(card, obterPerfilUsuarioNormalizado(uid, profile));
    }
  });

  document.addEventListener("change", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === "authAdminAccessPreset") {
      atualizarHintPresetCriacao();
      return;
    }

    if (target.id === "authAccessStatusFilter") {
      accessCentralState.status = target.value || "all";
      renderCentralUsuarios();
      return;
    }

    if (target.id === "authAccessRoleFilter") {
      accessCentralState.role = target.value || "all";
      renderCentralUsuarios();
      return;
    }

    if (target.id === "authAccessActionFilter") {
      accessCentralState.action = target.value || "all";
      renderCentralUsuarios();
      return;
    }

  });
}

function permissoesAcaoIncluem(permissoesAcao = {}, chave = "") {
  const permissoes = mesclarPermissoesAcao(permissoesAcao);
  if (permissoes.configuracao) return true;
  if (chave === "inclusao" && permissoes.alteracao) return true;
  return Boolean(permissoes[chave]);
}

function criarPermissoesLegadasPorAcao(permissoesAcao = {}) {
  const permissoes = criarPermissoesPadrao();
  const podeOperar = permissoesAcaoIncluem(permissoesAcao, "inclusao");
  const podeManterCadastros = permissoesAcaoIncluem(permissoesAcao, "alteracao")
    || permissoesAcaoIncluem(permissoesAcao, "exclusao")
    || permissoesAcaoIncluem(permissoesAcao, "configuracao");
  const podeConsultar = permissoesAcaoIncluem(permissoesAcao, "consulta");

  permissoes.inicio = "view";
  permissoes.perfilUsuario = "edit";
  permissoes.relatorios = podeConsultar ? "view" : "none";
  ["veiculosGeral", "posto", "chaves", "empilhadeiras", "jogos", "guardachuvas", "vendas", "pesagemManual"].forEach(chave => {
    permissoes[chave] = podeOperar ? "edit" : "none";
  });
  permissoes.cadastros = podeManterCadastros ? "edit" : "none";

  return permissoes;
}

function obterPerfilAcessoPorAcoes(permissoesAcao = {}) {
  const permissoes = mesclarPermissoesAcao(permissoesAcao);
  if (permissoes.configuracao) return "Configuracao";
  if (permissoes.exclusao) return "Exclusao";
  if (permissoes.alteracao) return "Alteracao";
  if (permissoes.inclusao) return "Inclusao";
  if (permissoes.consulta) return "Consulta";
  return "Sem acesso";
}

function obterResumoTextoAcoesSistema(permissoesAcao = {}) {
  return obterResumoTextoPermissoesAcao(mesclarPermissoesAcao(permissoesAcao));
}

function usuarioPodeAcaoCadastro(chaveAcao = "") {
  const chave = String(chaveAcao || "").trim();
  if (!authContext.profile || authContext.profile.ativo === false) return false;
  return permissoesAcaoIncluem(authContext.profile.permissoesAcao, chave);
}

function usuarioPodeConfigurarCadastros() {
  return usuarioPodeAcaoCadastro("configuracao");
}

function usuarioPodeVerSecao(chave) {
  const destino = normalizarChavePermissaoAcesso(chave);
  if (!authContext.profile || authContext.profile.ativo === false) return false;
  if (destino === "inicio" || destino === "perfilUsuario") return true;
  if (destino === "relatorios") return usuarioPodeAcaoCadastro("consulta");
  if (destino === "cadastros") {
    return usuarioPodeAcaoCadastro("alteracao")
      || usuarioPodeAcaoCadastro("exclusao")
      || usuarioPodeAcaoCadastro("configuracao");
  }
  return usuarioPodeAcaoCadastro("inclusao");
}

function usuarioPodeEditarSecao(chave) {
  const destino = normalizarChavePermissaoAcesso(chave);
  if (destino === "cadastros") return usuarioPodeAcaoCadastro("alteracao") || usuarioPodeAcaoCadastro("configuracao");
  if (destino === "relatorios") return false;
  if (destino === "inicio" || destino === "perfilUsuario") return true;
  return usuarioPodeAcaoCadastro("inclusao");
}

function obterNivelPermissaoUsuarioAtual(chave) {
  if (!usuarioPodeVerSecao(chave)) return "none";
  return usuarioPodeEditarSecao(chave) ? "edit" : "view";
}

function obterPapelAcessoUsuario(profile = null) {
  if (!profile) return "Acesso";
  if (profile.ativo === false) return "Inativo";
  return obterPerfilAcessoPorAcoes(profile.permissoesAcao);
}

function contarGestoresAtivos(perfis = usuariosSistemaState) {
  return Object.values(perfis || {}).filter(item => {
    const profile = obterPerfilUsuarioNormalizado(item?.uid || "", item);
    return profile.ativo && permissoesAcaoIncluem(profile.permissoesAcao, "configuracao");
  }).length;
}

function obterUsuariosOrdenadosCentral() {
  const selfUid = authContext.firebaseUser?.uid || "";

  return Object.entries(usuariosSistemaState || {})
    .map(([uid, item]) => obterPerfilUsuarioNormalizado(uid, item))
    .sort((a, b) => {
      if (a.uid === selfUid && b.uid !== selfUid) return -1;
      if (b.uid === selfUid && a.uid !== selfUid) return 1;
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

function filtrarUsuariosCentral(usuarios = []) {
  const busca = normalizarBuscaAcesso(accessCentralState.search);

  return usuarios.filter(profile => {
    if (accessCentralState.status === "active" && !profile.ativo) return false;
    if (accessCentralState.status === "inactive" && profile.ativo) return false;
    if (accessCentralState.action !== "all" && !permissoesAcaoIncluem(profile.permissoesAcao, accessCentralState.action)) return false;

    if (!busca) return true;

    const alvo = [profile.nome, profile.login, profile.authEmail, obterPapelAcessoUsuario(profile), obterResumoTextoAcoesSistema(profile.permissoesAcao)]
      .map(valor => normalizarBuscaAcesso(valor))
      .join(" ");

    return alvo.includes(busca);
  });
}

function sincronizarFormularioCriacaoAcesso(canEdit) {
  const card = document.querySelector(".access-creation-card");
  [
    "authAdminUserName",
    "authAdminUserLogin",
    "authAdminUserPassword",
    "authAdminCreateUserButton"
  ].forEach(id => {
    const campo = getById(id);
    if (!campo) return;
    campo.disabled = !canEdit;
  });

  card?.classList.toggle("is-readonly", !canEdit);
}

function atualizarHintPresetCriacao() {
  const hint = getById("authAdminPresetHint");
  if (hint) hint.textContent = "Novo acesso inicia apenas com Consulta. Ajuste as flags depois de criar.";
}

function coletarPermissoesDoCard(card) {
  return criarPermissoesLegadasPorAcao(coletarPermissoesAcaoDoCard(card));
}

function sincronizarEstadoCardUsuario(card, profile) {
  if (!card || !profile) return;

  const permissoesAcaoAtuais = mesclarPermissoesAcao(profile.permissoesAcao, profile.permissoes || {});
  const permissoesAcaoSelecionadas = coletarPermissoesAcaoDoCard(card);
  const houveAlteracao = !permissoesAcaoSaoIguais(permissoesAcaoAtuais, permissoesAcaoSelecionadas);
  const podeEditar = usuarioPodeConfigurarCadastros();

  card.classList.toggle("is-dirty", houveAlteracao);

  const badgePreset = card.querySelector("[data-auth-user-preset-badge]");
  if (badgePreset) {
    badgePreset.textContent = obterPerfilAcessoPorAcoes(permissoesAcaoSelecionadas);
    badgePreset.classList.toggle("is-custom", true);
  }

  const destaquePrincipal = card.querySelector("[data-auth-user-summary-main]");
  const destaqueSecundario = card.querySelector("[data-auth-user-summary-sub]");
  if (destaquePrincipal) destaquePrincipal.textContent = obterResumoTextoAcoesSistema(permissoesAcaoSelecionadas);
  if (destaqueSecundario) {
    destaqueSecundario.textContent = houveAlteracao
      ? "Alteracoes pendentes. Salve para aplicar."
      : "Controle por acoes";
  }

  const resumoAcoes = card.querySelector("[data-auth-user-action-summary]");
  if (resumoAcoes) resumoAcoes.textContent = obterResumoTextoAcoesSistema(permissoesAcaoSelecionadas);

  const saveButton = card.querySelector('[data-auth-user-action="salvar-permissoes"]');
  if (saveButton) saveButton.disabled = !podeEditar || !houveAlteracao;
}

function reverterPermissoesNoCard(uid) {
  const card = document.querySelector(`.access-user-card[data-uid="${uid}"]`);
  const profile = usuariosSistemaState?.[uid];
  if (!card || !profile) return;

  const profileNormalizado = obterPerfilUsuarioNormalizado(uid, profile);
  preencherPermissoesAcaoNoCard(card, profileNormalizado.permissoesAcao);
  sincronizarEstadoCardUsuario(card, profileNormalizado);
}

function criarCardUsuarioCentral(profile, { canEdit = false, openByDefault = false } = {}) {
  const card = document.createElement("details");
  card.className = `access-user-card ${profile.ativo ? "" : "is-inactive"}`.trim();
  card.dataset.uid = profile.uid;
  card.open = openByDefault;

  const summary = document.createElement("summary");
  summary.className = "access-user-summary";

  const lead = document.createElement("div");
  lead.className = "access-user-lead";

  const avatar = document.createElement("span");
  avatar.className = "access-user-avatar";
  avatar.textContent = obterIniciaisUsuario(profile.nome);

  const titleWrap = document.createElement("div");
  titleWrap.className = "access-user-title";

  const title = document.createElement("strong");
  title.textContent = profile.nome || "Usuario sem nome";

  const login = document.createElement("span");
  login.textContent = profile.authEmail || (profile.login ? `@${profile.login}` : "Sem email");

  titleWrap.append(title, login);
  lead.append(avatar, titleWrap);

  const side = document.createElement("div");
  side.className = "access-user-side";

  const badges = document.createElement("div");
  badges.className = "access-user-badges";

  const roleBadge = document.createElement("span");
  roleBadge.className = "access-user-badge";
  roleBadge.dataset.authUserPresetBadge = "true";

  const statusBadge = document.createElement("span");
  statusBadge.className = `access-user-badge ${profile.ativo ? "is-active" : "is-inactive"}`;
  statusBadge.textContent = profile.ativo ? "Ativo" : "Inativo";

  badges.append(roleBadge, statusBadge);
  if (profile.uid === authContext.firebaseUser?.uid) {
    const ownBadge = document.createElement("span");
    ownBadge.className = "access-user-badge is-current";
    ownBadge.textContent = "Sessao atual";
    badges.appendChild(ownBadge);
  }

  const highlight = document.createElement("div");
  highlight.className = "access-user-highlight";

  const highlightMain = document.createElement("strong");
  highlightMain.dataset.authUserSummaryMain = "true";

  const highlightSub = document.createElement("small");
  highlightSub.dataset.authUserSummarySub = "true";

  highlight.append(highlightMain, highlightSub);
  side.append(badges, highlight);
  summary.append(lead, side);

  const body = document.createElement("div");
  body.className = "access-user-body";

  const meta = document.createElement("p");
  meta.className = "access-user-meta";
  meta.textContent = `Criado em ${profile.criadoEm || "-"}${profile.criadoPor ? ` - por ${profile.criadoPor}` : ""}${profile.atualizadoEm ? ` - atualizado em ${profile.atualizadoEm}` : ""}`;

  const actionPanel = document.createElement("section");
  actionPanel.className = "access-action-permissions";

  const actionHead = document.createElement("div");
  actionHead.className = "access-permission-group-head";

  const actionTitle = document.createElement("strong");
  actionTitle.textContent = "Permissoes por acao";

  const actionSummary = document.createElement("span");
  actionSummary.dataset.authUserActionSummary = "true";

  actionHead.append(actionTitle, actionSummary);

  const actionGrid = document.createElement("div");
  actionGrid.className = "access-action-permissions-grid";

  Object.entries(ACCESS_ACTION_LABELS).forEach(([chave, rotulo]) => {
    const field = document.createElement("div");
    field.className = "access-action-permission-field";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "access-permission-flag";
    button.dataset.authActionFlag = chave;
    button.textContent = rotulo;
    button.disabled = !canEdit;

    const input = document.createElement("input");
    input.type = "hidden";
    input.dataset.authUserActionPermission = chave;

    field.append(button, input);
    aplicarPermissaoAcaoCampo(field, profile.permissoesAcao?.[chave]);
    actionGrid.appendChild(field);
  });

  actionPanel.append(actionHead, actionGrid);

  const actions = document.createElement("div");
  actions.className = "access-user-actions";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "cadastro-action solid";
  saveButton.textContent = "Salvar permissoes";
  saveButton.dataset.authUserAction = "salvar-permissoes";
  saveButton.dataset.uid = profile.uid;

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = profile.ativo ? "cadastro-action danger" : "cadastro-action";
  toggleButton.textContent = profile.ativo ? "Desativar acesso" : "Ativar acesso";
  toggleButton.dataset.authUserAction = profile.ativo ? "desativar-usuario" : "ativar-usuario";
  toggleButton.dataset.uid = profile.uid;
  toggleButton.disabled = !canEdit;

  actions.append(saveButton, toggleButton);
  body.append(meta, actionPanel, actions);
  card.append(summary, body);

  card.addEventListener("toggle", () => {
    if (!card.open) reverterPermissoesNoCard(profile.uid);
  });

  sincronizarEstadoCardUsuario(card, profile);
  return card;
}

function renderCentralUsuarios() {
  const container = getById("authUsersAdminList");
  const canView = usuarioPodeConfigurarCadastros();
  const canEdit = usuarioPodeConfigurarCadastros();

  sincronizarFormularioCriacaoAcesso(canEdit);
  atualizarHintPresetCriacao();

  if (!container) return;
  limparConteudoElemento(container);

  const usuarios = obterUsuariosOrdenadosCentral();
  const filtrados = filtrarUsuariosCentral(usuarios);
  atualizarResumoCentralUsuarios(usuarios, filtrados);

  if (!canView) {
    container.appendChild(criarParagrafoVazio("Seu login nao possui acesso a esta central."));
    refreshLucideIcons();
    return;
  }

  if (!usuarios.length) {
    container.appendChild(criarParagrafoVazio("Nenhum acesso configurado ate o momento."));
    refreshLucideIcons();
    return;
  }

  if (!filtrados.length) {
    container.appendChild(criarParagrafoVazio("Nenhum acesso corresponde aos filtros aplicados."));
    refreshLucideIcons();
    return;
  }

  filtrados.forEach(profile => {
    container.appendChild(criarCardUsuarioCentral(profile, { canEdit, openByDefault: false }));
  });

  refreshLucideIcons();
}

async function salvarPermissoesUsuario(uid) {
  if (!usuarioPodeConfigurarCadastros()) {
    avisoErro("Seu login nao pode alterar permissoes.");
    return;
  }

  const profileAtual = usuariosSistemaState?.[uid];
  if (!profileAtual) return;

  const card = document.querySelector(`.access-user-card[data-uid="${uid}"]`);
  const botao = card?.querySelector('[data-auth-user-action="salvar-permissoes"]');
  const permissoesAcao = coletarPermissoesAcaoDoCard(card);
  const permissoes = criarPermissoesLegadasPorAcao(permissoesAcao);
  const selfUid = authContext.firebaseUser?.uid || "";
  const gestoresAtivos = contarGestoresAtivos();
  const eraGestor = permissoesAcaoIncluem(obterPerfilUsuarioNormalizado(uid, profileAtual).permissoesAcao, "configuracao");
  const seraGestor = permissoesAcaoIncluem(permissoesAcao, "configuracao");

  if (uid === selfUid && !seraGestor) {
    avisoValidacao("A sessao atual precisa manter Configuracao para nao perder o gerenciamento.");
    return;
  }

  if (eraGestor && !seraGestor && gestoresAtivos <= 1) {
    avisoValidacao("Mantenha pelo menos um acesso ativo com Configuracao.");
    return;
  }

  alternarBotaoCarregando(botao, true, botao?.innerHTML || "Salvar permissoes");

  db.ref(`${USER_PROFILE_DB_PATH}/${uid}`).update({
    permissoes,
    permissoesAcao,
    atualizadoEm: new Date().toLocaleString("pt-BR")
  }).then(() => {
    avisoSucesso("Permissoes atualizadas com sucesso.", "shield-check");
  }).catch(() => {
    avisoErro("Nao foi possivel salvar as permissoes.");
  }).finally(() => {
    alternarBotaoCarregando(botao, false, botao?.dataset.originalText || "Salvar permissoes");
  });
}

async function alternarUsuarioAtivo(uid, ativo) {
  if (!usuarioPodeConfigurarCadastros()) {
    avisoErro("Seu login nao pode gerenciar acessos.");
    return;
  }

  const profileAtual = usuariosSistemaState?.[uid];
  if (!profileAtual) return;

  const profileNormalizado = obterPerfilUsuarioNormalizado(uid, profileAtual);
  const selfUid = authContext.firebaseUser?.uid || "";
  const gestoresAtivos = contarGestoresAtivos();
  const ehGestor = permissoesAcaoIncluem(profileNormalizado.permissoesAcao, "configuracao");

  if (!ativo && uid === selfUid) {
    avisoValidacao("A sessao atual nao pode ser desativada por aqui.");
    return;
  }

  if (!ativo && ehGestor && gestoresAtivos <= 1) {
    avisoValidacao("Mantenha pelo menos um acesso ativo com Configuracao.");
    return;
  }

  const titulo = ativo ? "Ativar acesso?" : "Desativar acesso?";
  const detalhe = ativo
    ? "O usuario podera voltar a entrar com o mesmo email."
    : "O usuario continuara cadastrado, mas nao podera entrar enquanto estiver inativo.";
  const confirmado = await confirmarAcao({
    titulo,
    mensagem: `${profileNormalizado.nome} (${profileNormalizado.authEmail || profileNormalizado.login})`,
    detalhe,
    confirmarTexto: ativo ? "Ativar" : "Desativar",
    cancelarTexto: "Cancelar"
  });

  if (!confirmado) return;

  db.ref(`${USER_PROFILE_DB_PATH}/${uid}`).update({
    ativo,
    atualizadoEm: new Date().toLocaleString("pt-BR")
  }).then(() => {
    avisoSucesso(ativo ? "Acesso ativado." : "Acesso desativado.", ativo ? "shield-check" : "shield-alert");
  }).catch(() => {
    avisoErro("Nao foi possivel atualizar esse acesso.");
  });
}

function inicializarAuthFirebase() {
  const gate = getById("authGate");
  const form = getById("authForm");
  const usernameInput = getById("authUsername");
  const passwordInput = getById("authPassword");
  const submitButton = getById("authSubmit");
  const feedback = getById("authFeedback");
  const logoutButton = getById("logoutButton");
  const profileSaveButton = getById("profileSaveButton");

  if (!gate || !form || !usernameInput || !passwordInput || !submitButton || !feedback) return;

  observarUsuariosSistema();
  vincularAcoesCentralUsuarios();

  const atualizarFeedback = (mensagem = "") => {
    feedback.textContent = mensagem;
    form.classList.toggle("has-error", Boolean(mensagem));
  };

  const focarPrimeiroCampo = () => {
    const alvo = usernameInput.value.trim() ? passwordInput : usernameInput;
    setTimeout(() => alvo.focus(), 40);
  };

  const emailSalvo = localStorage.getItem(AUTH_EMAIL_STORAGE_KEY);
  usernameInput.value = emailSalvo || "";

  if (!auth) {
    definirEstadoAuth("locked");
    atualizarFeedback("Firebase Auth nao esta disponivel no projeto.");
    return;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const identificador = normalizarEmailAcesso(usernameInput.value || "");
    const senha = String(passwordInput.value || "");

    if (!identificador) {
      atualizarFeedback("Digite seu email para continuar.");
      usernameInput.focus();
      return;
    }

    if (!emailAcessoValido(identificador)) {
      atualizarFeedback("Digite um email valido para continuar.");
      usernameInput.focus();
      return;
    }

    if (!senha) {
      atualizarFeedback("Digite sua senha para continuar.");
      passwordInput.focus();
      return;
    }

    atualizarFeedback("");
    alternarBotaoCarregando(submitButton, true, submitButton.innerHTML);

    try {
      await auth.signInWithEmailAndPassword(identificador, senha);
      localStorage.setItem(AUTH_LOGIN_STORAGE_KEY, normalizarLoginUsuario(identificador.split("@")[0] || ""));
      localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, identificador);
      passwordInput.value = "";
    } catch (error) {
      atualizarFeedback(obterMensagemErroAuth(error));
      passwordInput.focus();
      passwordInput.select();
    } finally {
      alternarBotaoCarregando(submitButton, false, submitButton.dataset.originalText || "Entrar");
    }
  });

  usernameInput.addEventListener("input", () => atualizarFeedback(""));
  passwordInput.addEventListener("input", () => atualizarFeedback(""));

  logoutButton?.addEventListener("click", async () => {
    try {
      await auth.signOut();
      mostrarAviso("Sessao encerrada.", "info", "log-out");
    } catch (error) {
      mostrarAviso("Nao foi possivel encerrar a sessao agora.", "error", "alert-circle");
    }
  });

  profileSaveButton?.addEventListener("click", async () => {
    const user = auth.currentUser;
    const usernamePerfil = getById("profileUsername");
    const senhaInput = getById("profilePassword");
    const senhaConfirmInput = getById("profilePasswordConfirm");

    if (!user || !usernamePerfil || !senhaInput || !senhaConfirmInput) return;

    const novaSenha = String(senhaInput.value || "");
    const confirmarSenha = String(senhaConfirmInput.value || "");

    if (!novaSenha) {
      mostrarAviso("Digite a nova senha para atualizar o acesso.", "warning", "shield-alert");
      senhaInput.focus();
      return;
    }

    if (novaSenha.length < AUTH_MIN_PASSWORD_LENGTH) {
      mostrarAviso(`A nova senha precisa ter pelo menos ${AUTH_MIN_PASSWORD_LENGTH} caracteres.`, "warning", "shield-alert");
      senhaInput.focus();
      return;
    }

    if (novaSenha !== confirmarSenha) {
      mostrarAviso("A confirmacao da senha nao confere.", "warning", "shield-alert");
      senhaConfirmInput.focus();
      return;
    }

    alternarBotaoCarregando(profileSaveButton, true, profileSaveButton.innerHTML);

    try {
      await user.updatePassword(novaSenha);
      senhaInput.value = "";
      senhaConfirmInput.value = "";
      atualizarResumoPerfil(auth.currentUser, authContext.profile);
      mostrarAviso("Senha atualizada com sucesso.", "success", "shield-check");
    } catch (error) {
      if (error?.code === "auth/requires-recent-login") {
        mostrarAviso("Por seguranca, saia e entre novamente antes de trocar a senha.", "warning", "shield-alert");
      } else {
        mostrarAviso("Nao foi possivel atualizar a senha agora.", "error", "alert-circle");
      }
    } finally {
      alternarBotaoCarregando(profileSaveButton, false, profileSaveButton.dataset.originalText || "Atualizar senha");
    }
  });

  definirEstadoAuth("pending");

  auth.onAuthStateChanged(async user => {
    if (user) {
      definirEstadoAuth("pending", user, authContext.profile);
      atualizarFeedback("");

      try {
        const profile = await garantirPerfilUsuario(user);
        if (profile.ativo === false) {
          mostrarAviso("Seu acesso esta desativado. Fale com o gestor.", "warning", "shield-alert");
          await auth.signOut();
          return;
        }

        observarPerfilAtual(user);
        aplicarContextoAutenticado(user, profile);
      } catch (error) {
        console.error("Erro ao carregar o perfil de acesso:", error);
        await auth.signOut().catch(() => undefined);
        atualizarFeedback("Nao foi possivel validar o seu acesso agora.");
        definirEstadoAuth("locked");
      }
      return;
    }

    pararObservadorPerfilAtual();
    limparContextoAutenticado();
    atualizarFeedback("");
    focarPrimeiroCampo();
  });

  refreshLucideIcons();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarAuthFirebase, { once: true });
} else {
  inicializarAuthFirebase();
}
