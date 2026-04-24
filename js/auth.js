const AUTH_EMAIL_STORAGE_KEY = "nortefrut-auth-email";

function obterMensagemErroAuth(error) {
  const mensagens = {
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/missing-password": "Digite sua senha para continuar.",
    "auth/user-not-found": "E-mail ou senha inválidos.",
    "auth/wrong-password": "E-mail ou senha inválidos.",
    "auth/invalid-login-credentials": "E-mail ou senha inválidos.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "auth/network-request-failed": "Falha de conexão. Verifique a internet e tente novamente.",
    "auth/user-disabled": "Este usuário está desativado no Firebase.",
    "auth/operation-not-allowed": "O login por e-mail e senha não está habilitado no Firebase."
  };

  return mensagens[error?.code] || "Não foi possível entrar agora. Confira suas credenciais e tente novamente.";
}

function definirEstadoAuth(estado, user = null) {
  const body = document.body;
  const gate = getById("authGate");
  const logoutButton = getById("logoutButton");

  body.classList.remove("auth-pending", "auth-locked", "auth-ready");
  body.classList.add(`auth-${estado}`);

  if (gate) {
    gate.setAttribute("aria-hidden", estado === "ready" ? "true" : "false");
  }

  if (logoutButton) {
    logoutButton.classList.toggle("is-hidden", estado !== "ready");
    logoutButton.setAttribute("title", user?.email ? `Encerrar sessão (${user.email})` : "Encerrar sessão");
    logoutButton.setAttribute("aria-label", user?.email ? `Encerrar sessão (${user.email})` : "Encerrar sessão");
  }

}

function inicializarAuthFirebase() {
  const gate = getById("authGate");
  const form = getById("authForm");
  const emailInput = getById("authEmail");
  const passwordInput = getById("authPassword");
  const submitButton = getById("authSubmit");
  const feedback = getById("authFeedback");
  const logoutButton = getById("logoutButton");

  if (!gate || !form || !emailInput || !passwordInput || !submitButton || !feedback) return;

  const atualizarFeedback = (mensagem = "") => {
    feedback.textContent = mensagem;
    form.classList.toggle("has-error", Boolean(mensagem));
  };

  const focarPrimeiroCampo = () => {
    const alvo = emailInput.value.trim() ? passwordInput : emailInput;
    setTimeout(() => alvo.focus(), 40);
  };

  const emailSalvo = localStorage.getItem(AUTH_EMAIL_STORAGE_KEY);
  if (emailSalvo) emailInput.value = emailSalvo;

  if (!auth) {
    definirEstadoAuth("locked");
    atualizarFeedback("Firebase Auth não está disponível no projeto.");
    return;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const email = String(emailInput.value || "").trim();
    const senha = String(passwordInput.value || "");

    if (!email) {
      atualizarFeedback("Digite seu e-mail para continuar.");
      emailInput.focus();
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
      await auth.signInWithEmailAndPassword(email, senha);
      localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, email);
      passwordInput.value = "";
    } catch (error) {
      atualizarFeedback(obterMensagemErroAuth(error));
      passwordInput.focus();
      passwordInput.select();
    } finally {
      alternarBotaoCarregando(submitButton, false, submitButton.dataset.originalText || "Entrar");
    }
  });

  emailInput.addEventListener("input", () => atualizarFeedback(""));
  passwordInput.addEventListener("input", () => atualizarFeedback(""));

  logoutButton?.addEventListener("click", async () => {
    try {
      await auth.signOut();
      mostrarAviso("Sessão encerrada.", "info", "log-out");
    } catch (error) {
      mostrarAviso("Não foi possível encerrar a sessão agora.", "error", "alert-circle");
    }
  });

  definirEstadoAuth("pending");

  auth.onAuthStateChanged(user => {
    if (user) {
      definirEstadoAuth("ready", user);
      atualizarFeedback("");
      return;
    }

    definirEstadoAuth("locked");
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
