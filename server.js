const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");

const fastify = require("fastify")({ logger: false });
const formbody = require("@fastify/formbody");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || "5000");
const SCRIPT_DIR = __dirname;

const TEMPLATE = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Busca CNPJ</title>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Merriweather:wght@700&family=Open+Sans:wght@400;600&display=swap");
    :root {
      --bg-1: #f6f2ea;
      --bg-2: #e3efe7;
      --ink: #1b1f1c;
      --muted: #5f6762;
      --card: #ffffff;
      --accent: #0f6b4e;
      --accent-2: #f0a452;
      --ring: rgba(15, 107, 78, 0.24);
      --shadow: 0 18px 50px rgba(15, 17, 12, 0.15);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Open Sans", "Trebuchet MS", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(620px 380px at 10% 12%, rgba(255, 246, 225, 0.85) 0%, rgba(255, 246, 225, 0) 60%),
        radial-gradient(720px 480px at 90% 6%, rgba(223, 241, 233, 0.85) 0%, rgba(223, 241, 233, 0) 60%),
        linear-gradient(160deg, var(--bg-1), var(--bg-2));
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 28px;
    }
    body::before,
    body::after {
      content: "";
      position: fixed;
      width: 260px;
      height: 260px;
      border-radius: 50%;
      z-index: 0;
      opacity: 0.12;
      pointer-events: none;
    }
    body::before {
      top: -60px;
      left: -40px;
      background: #0f6b4e;
    }
    body::after {
      bottom: -80px;
      right: -40px;
      background: #f0a452;
    }
    .panel {
      width: min(560px, 92vw);
      background: var(--card);
      border-radius: 18px;
      padding: 28px 28px 26px;
      box-shadow: var(--shadow);
      border: 1px solid #e3e7df;
      position: relative;
      z-index: 1;
      animation: rise 0.55s ease-out both;
    }
    .panel::before {
      content: "";
      position: absolute;
      inset: 10px;
      border-radius: 14px;
      border: 1px dashed rgba(15, 107, 78, 0.25);
      pointer-events: none;
    }
    .auth-bar {
      position: fixed;
      top: 18px;
      right: 18px;
      display: grid;
      gap: 8px;
      justify-items: end;
      z-index: 5;
    }
    .auth-status {
      padding: 6px 2px;
      border-radius: 999px;
      font-size: 11px;
      letter-spacing: 0.4px;
      background: transparent;
      color: var(--ink);
      min-width: 140px;
      text-align: left;
    }
    .auth-status:empty {
      display: none;
    }
    .auth-actions {
      display: inline-flex;
      align-items: center;
      gap: 1px;
    }
    .auth-actions.auth-on {
      padding: 4px 8px;
      background: #ffffff;
      border-radius: 999px;
      box-shadow: 0 6px 16px rgba(15, 17, 12, 0.12);
    }
    .logout-btn {
      border: 0;
      padding: 4px 4px 10px;
      border-radius: 999px;
      background: transparent;
      color: #e45757;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
      cursor: pointer;
      box-shadow: none;
      transition: transform 0.15s ease, box-shadow 0.2s ease;
    }
    .logout-btn:hover {
      transform: translateY(-1px);
      box-shadow: none;
      text-decoration: underline;
    }
    .logout-btn[hidden] {
      display: none;
    }
    .auth-locked .auth-status {
      background: rgba(95, 103, 98, 0.12);
      color: var(--muted);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(15, 107, 78, 0.12);
      color: var(--accent);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.4px;
    }
    h1 {
      margin: 14px 0 8px;
      font-family: "Merriweather", "Georgia", serif;
      font-size: 32px;
      letter-spacing: 0.4px;
    }
    .subtitle {
      margin: 0 0 20px;
      color: var(--muted);
      font-size: 14.5px;
      line-height: 1.6;
    }
    form {
      position: relative;
      display: grid;
      gap: 14px;
    }
    fieldset {
      border: 0;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 14px;
    }
    fieldset:disabled input {
      background: #f1f4f1;
    }
    fieldset:disabled button {
      opacity: 0.65;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }
    .auth-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      color: var(--muted);
      font-size: 14px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .auth-locked .auth-overlay {
      opacity: 1;
      pointer-events: auto;
    }
    label {
      display: block;
      margin: 0 0 6px;
      font-size: 13px;
      color: var(--muted);
    }
    input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #cfd6cf;
      border-radius: 12px;
      font-size: 14px;
      background: #ffffff;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--ring);
    }
    button {
      margin-top: 8px;
      width: 100%;
      padding: 12px 14px;
      border: 0;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent), #15906b);
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.4px;
      transition: transform 0.15s ease, box-shadow 0.2s ease;
      box-shadow: 0 10px 24px rgba(15, 107, 78, 0.22);
    }
    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 26px rgba(15, 107, 78, 0.28);
    }
    .alert {
      margin-top: 14px;
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 13px;
      border: 1px solid transparent;
      animation: fadeIn 0.35s ease-out both;
      white-space: pre-wrap;
    }
    .alert.ok { background: #e7f4ef; color: #1e5b44; border-color: #cfe6dc; }
    .alert.err { background: #fdecea; color: #8a1f1f; border-color: #f6c8c6; }
    .small {
      margin-top: 10px;
      font-size: 12px;
      color: var(--muted);
    }
    .small a {
      color: var(--accent);
      text-decoration: none;
    }
    .small a:hover { text-decoration: underline; }
    @keyframes rise {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 520px) {
      body { padding: 18px; }
      .panel { padding: 20px; }
      h1 { font-size: 26px; }
      .auth-bar {
        top: 12px;
        right: 12px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; transition: none !important; }
    }
  </style>
</head>
<body>
  <div class="auth-bar">
    <div class="auth-actions">
      <div class="auth-status" id="authStatus"></div>
      <button class="logout-btn" id="logoutBtn" type="button" hidden>Sair</button>
    </div>
    <div id="googleBtn"></div>
  </div>
  <div class="panel auth-locked" id="panelRoot">
    <span class="badge">Data Business</span>
    <h1>Busca CNPJ</h1>
    <p class="subtitle">Preencha o tipo e a cidade para gerar o arquivo automaticamente.</p>
    <form method="post">
      <div class="auth-overlay" id="authOverlay">Faca login com Google para usar a aplicação.</div>
      <fieldset id="appFields" disabled>
        <div class="field">
          <label for="tipo">Tipo (ex: Restaurante)</label>
          <input id="tipo" name="tipo" value="__TIPO__" required placeholder="Restaurante">
        </div>
        <div class="field">
          <label for="cidade">Cidade (ex: Santos)</label>
          <input id="cidade" name="cidade" value="__CIDADE__" required placeholder="Santos">
        </div>
        <button type="submit">Gerar arquivo</button>
      </fieldset>
    </form>
    __ERROR_BLOCK__
    __MESSAGE_BLOCK__
    __DOWNLOAD_BLOCK__
  </div>
  <script>
    (function () {
      const panel = document.getElementById("panelRoot");
      const fields = document.getElementById("appFields");
      const statusEl = document.getElementById("authStatus");
      const logoutBtn = document.getElementById("logoutBtn");
      const googleBtn = document.getElementById("googleBtn");
      const authActions = document.querySelector(".auth-actions");

      const GOOGLE_CLIENT_ID = "1086260719407-pjv0l9jff2ljdrbha5u0dji0bm28isqt.apps.googleusercontent.com";

      function setAuthState(isSignedIn, profile) {
        panel.classList.toggle("auth-locked", !isSignedIn);
        fields.disabled = !isSignedIn;
        logoutBtn.hidden = !isSignedIn;
        googleBtn.style.display = isSignedIn ? "none" : "";
        authActions.classList.toggle("auth-on", isSignedIn);
        if (isSignedIn && profile) {
          const rawName = profile.name || "";
          const firstName = rawName.trim().split(/\s+/)[0] || "";
          const emailHandle = (profile.email || "").split("@")[0];
          const label = firstName || emailHandle || "Logado";
          statusEl.textContent = "Logado: " + label;
        } else {
          statusEl.textContent = "";
        }
      }

      function parseJwt(token) {
        try {
          const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
          const json = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          return JSON.parse(json);
        } catch (err) {
          return null;
        }
      }

      window.handleCredentialResponse = (response) => {
        const payload = parseJwt(response.credential);
        if (!payload) {
          statusEl.textContent = "Falha ao validar login.";
          return;
        }
        setAuthState(true, { name: payload.name, email: payload.email, picture: payload.picture });
      };

      function initGoogle() {
        if (!window.google || !google.accounts || !google.accounts.id) {
          statusEl.textContent = "Google nao carregou.";
          return;
        }
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.indexOf("YOUR_") === 0) {
          statusEl.textContent = "Defina o Client ID do Google.";
          return;
        }
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        google.accounts.id.renderButton(document.getElementById("googleBtn"), {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: 220,
        });
      }

      logoutBtn.addEventListener("click", function () {
        if (window.google && google.accounts && google.accounts.id) {
          google.accounts.id.disableAutoSelect();
        }
        setAuthState(false);
      });

      setAuthState(false);
      window.addEventListener("load", initGoogle);
    })();
  </script>
</body>
</html>`;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTemplate({ error, message, filename, tipo, cidade }) {
  const errorBlock = error
    ? `<div class="alert err">${escapeHtml(error)}</div>`
    : "";
  const messageBlock = message
    ? `<div class="alert ok">${escapeHtml(message)}</div>`
    : "";
  const downloadBlock = filename
    ? `<div class="small"><a href="/download/${encodeURIComponent(filename)}">Baixar novamente</a></div>
      <script>
        setTimeout(function () {
          window.location.href = "/download/${encodeURIComponent(filename)}";
        }, 300);
      </script>`
    : "";

  return TEMPLATE
    .replace("__TIPO__", escapeHtml(tipo))
    .replace("__CIDADE__", escapeHtml(cidade))
    .replace("__ERROR_BLOCK__", errorBlock)
    .replace("__MESSAGE_BLOCK__", messageBlock)
    .replace("__DOWNLOAD_BLOCK__", downloadBlock);
}

function slugifyFilename(text) {
  const normalized = String(text || "").normalize("NFKD");
  const ascii = normalized.replace(/[\u0300-\u036f]/g, "");
  const slug = ascii
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "resultado";
}

function buildExcelFilename(tipo, cidade) {
  return `${slugifyFilename(`${tipo}_${cidade}`)}.xlsx`;
}

function safeFilename(filename) {
  const base = path.basename(filename || "");
  if (base !== filename) return "";
  if (!base.toLowerCase().endsWith(".xlsx")) return "";
  return base;
}

function runGoogle(tipo, cidade) {
  const args = [path.join(SCRIPT_DIR, "index.js"), tipo, cidade];
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: SCRIPT_DIR,
        env: process.env,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve((stderr || stdout || error.message || "Falha ao executar.").trim());
          return;
        }
        resolve("");
      }
    );
  });
}

fastify.register(formbody);

fastify.get("/", async (_, reply) => {
  reply.type("text/html").send(
    renderTemplate({
      error: "",
      message: "",
      filename: "",
      tipo: "",
      cidade: "",
    })
  );
});

fastify.post("/", async (request, reply) => {
  const tipo = String(request.body?.tipo || "").trim();
  const cidade = String(request.body?.cidade || "").trim();

  let error = "";
  let message = "";
  let filename = "";

  if (!tipo || !cidade) {
    error = "Preencha tipo e cidade.";
  } else {
    const err = await runGoogle(tipo, cidade);
    if (err) {
      error = err;
    } else {
      filename = buildExcelFilename(tipo, cidade);
      const filepath = path.join(SCRIPT_DIR, filename);
      if (fs.existsSync(filepath)) {
        message = `Arquivo pronto: ${filename}`;
      } else {
        error = "Arquivo nao encontrado. Verifique o console.";
      }
    }
  }

  reply.type("text/html").send(
    renderTemplate({
      error,
      message,
      filename,
      tipo,
      cidade,
    })
  );
});

fastify.get("/download/:filename", async (request, reply) => {
  const safe = safeFilename(request.params.filename);
  if (!safe) {
    reply.code(400).send("Arquivo invalido.");
    return;
  }

  const filepath = path.join(SCRIPT_DIR, safe);
  if (!fs.existsSync(filepath)) {
    reply.code(404).send("Arquivo nao encontrado.");
    return;
  }

  reply
    .header("Content-Disposition", `attachment; filename="${safe}"`)
    .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return reply.send(fs.createReadStream(filepath));
});

fastify.listen({ host: HOST, port: PORT }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Servidor em http://${HOST}:${PORT}`);
});


