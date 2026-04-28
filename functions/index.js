const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const USER_PROFILE_DB_PATH = "usuarios";
const USERNAME_INDEX_DB_PATH = "usuarios_por_login";
const MIN_PASSWORD_LENGTH = 8;

const ACTION_KEYS = ["inclusao", "alteracao", "exclusao", "consulta", "configuracao"];

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value = "") {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeLogin(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function defaultActionPermissions() {
  return {
    inclusao: false,
    alteracao: false,
    exclusao: false,
    consulta: true,
    configuracao: false
  };
}

function fullActionPermissions() {
  return ACTION_KEYS.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
}

function inferActionPermissionsFromLegacy(permissoes = {}) {
  if (permissoes?.cadastros === "edit") return fullActionPermissions();
  if (permissoes?.relatorios === "view" || permissoes?.relatorios === "edit") return defaultActionPermissions();
  return {
    ...defaultActionPermissions(),
    consulta: false
  };
}

function mergeActionPermissions(permissoesAcao = null, permissoes = {}) {
  const base = permissoesAcao && typeof permissoesAcao === "object"
    ? defaultActionPermissions()
    : inferActionPermissionsFromLegacy(permissoes);

  ACTION_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(permissoesAcao || {}, key)) {
      base[key] = Boolean(permissoesAcao[key]);
    }
  });

  return base;
}

function actionPermissionsInclude(permissoesAcao = {}, key = "") {
  const permissions = mergeActionPermissions(permissoesAcao);
  if (permissions.configuracao) return true;
  if (key === "inclusao" && permissions.alteracao) return true;
  return Boolean(permissions[key]);
}

function legacyPermissionsFromActions(permissoesAcao = {}) {
  const canOperate = actionPermissionsInclude(permissoesAcao, "inclusao");
  const canMaintain = actionPermissionsInclude(permissoesAcao, "alteracao")
    || actionPermissionsInclude(permissoesAcao, "exclusao")
    || actionPermissionsInclude(permissoesAcao, "configuracao");
  const canConsult = actionPermissionsInclude(permissoesAcao, "consulta");

  return {
    inicio: "view",
    perfilUsuario: "edit",
    veiculosGeral: canOperate ? "edit" : "none",
    posto: canOperate ? "edit" : "none",
    chaves: canOperate ? "edit" : "none",
    empilhadeiras: canOperate ? "edit" : "none",
    jogos: canOperate ? "edit" : "none",
    guardachuvas: canOperate ? "edit" : "none",
    vendas: canOperate ? "edit" : "none",
    pesagemManual: canOperate ? "edit" : "none",
    relatorios: canConsult ? "view" : "none",
    cadastros: canMaintain ? "edit" : "none"
  };
}

function nowPtBr() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date()).replace(",", "");
}

async function assertRequesterCanConfigure(uid) {
  const snap = await admin.database().ref(`${USER_PROFILE_DB_PATH}/${uid}`).once("value");
  const profile = snap.val();
  if (!profile || profile.ativo === false) {
    throw new functions.https.HttpsError("permission-denied", "Seu acesso nao esta ativo.");
  }

  const actions = mergeActionPermissions(profile.permissoesAcao, profile.permissoes || {});
  if (!actionPermissionsInclude(actions, "configuracao")) {
    throw new functions.https.HttpsError("permission-denied", "Seu acesso nao possui Configuracao.");
  }

  return profile;
}

exports.criarAcessoUsuario = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Entre no sistema para criar acessos.");
  }

  const requesterProfile = await assertRequesterCanConfigure(context.auth.uid);
  const nome = normalizeName(data?.nome);
  const email = normalizeEmail(data?.email);
  const senha = String(data?.senha || "");
  const permissoesAcao = mergeActionPermissions(data?.permissoesAcao || defaultActionPermissions());

  if (!nome) {
    throw new functions.https.HttpsError("invalid-argument", "Informe o nome completo.");
  }

  if (!isValidEmail(email)) {
    throw new functions.https.HttpsError("invalid-argument", "Informe um email valido.");
  }

  if (senha.length < MIN_PASSWORD_LENGTH) {
    throw new functions.https.HttpsError("invalid-argument", `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  let userRecord = null;
  let createdAuthUser = false;

  try {
    userRecord = await admin.auth().getUserByEmail(email);
    userRecord = await admin.auth().updateUser(userRecord.uid, {
      displayName: nome,
      password: senha,
      disabled: false
    });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw new functions.https.HttpsError("internal", error?.message || "Nao foi possivel verificar esse email.");
    }

    userRecord = await admin.auth().createUser({
      email,
      password: senha,
      displayName: nome,
      disabled: false
    });
    createdAuthUser = true;
  }

  const uid = userRecord.uid;
  const profileRef = admin.database().ref(`${USER_PROFILE_DB_PATH}/${uid}`);
  const profileSnap = await profileRef.once("value");
  const existing = profileSnap.val() || {};
  const login = existing.login || normalizeLogin(`${email.split("@")[0]}.${uid.slice(0, 6)}`);
  const agora = nowPtBr();

  const profile = {
    ...existing,
    uid,
    nome,
    login,
    authEmail: email,
    ativo: true,
    permissoes: legacyPermissionsFromActions(permissoesAcao),
    permissoesAcao,
    criadoEm: existing.criadoEm || agora,
    atualizadoEm: agora,
    origem: existing.origem || "cadastro",
    criadoPor: existing.criadoPor || requesterProfile.nome || requesterProfile.login || context.auth.token.email || "Gestor"
  };

  try {
    await admin.database().ref().update({
      [`${USER_PROFILE_DB_PATH}/${uid}`]: profile,
      [`${USERNAME_INDEX_DB_PATH}/${login}`]: uid
    });
  } catch (error) {
    if (createdAuthUser) {
      await admin.auth().deleteUser(uid).catch(() => undefined);
    }
    throw new functions.https.HttpsError("internal", error?.message || "Nao foi possivel salvar o perfil no banco.");
  }

  return {
    uid,
    nome,
    email,
    login,
    created: createdAuthUser
  };
});
