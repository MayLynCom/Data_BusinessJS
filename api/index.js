const { runPipelineToBuffer } = require("../index.js");

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
    <form method="post" action="/api">
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
  </div>
  <script>
    (function () {
      const panel = document.getElementById("panelRoot");
      const fields = document.getElementById("appFields");
      const statusEl = document.getElementById("authStatus");
      const logoutBtn = document.getElementById("logoutBtn");
      const googleBtn = document.getElementById("googleBtn");
      const authActions = document.querySelector(".auth-actions");

      const GOOGLE_CLIENT_ID = "${process.env.GOOGLE_CLIENT_ID || ""}";

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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTemplate({ error, tipo, cidade }) {
  const errorBlock = error
    ? `<div class="alert err">${escapeHtml(error)}</div>`
    : "";
  return TEMPLATE
    .replace("__TIPO__", escapeHtml(tipo))
    .replace("__CIDADE__", escapeHtml(cidade))
    .replace("__ERROR_BLOCK__", errorBlock);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Body muito grande"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      renderTemplate({
        error: "",
        tipo: "",
        cidade: "",
      })
    );
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  let body = "";
  try {
    body = await readBody(req);
  } catch (err) {
    res.statusCode = 413;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(renderTemplate({ error: err.message, tipo: "", cidade: "" }));
    return;
  }

  const params = new URLSearchParams(body);
  const tipo = String(params.get("tipo") || "").trim();
  const cidade = String(params.get("cidade") || "").trim();

  if (!tipo || !cidade) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(renderTemplate({ error: "Preencha tipo e cidade.", tipo, cidade }));
    return;
  }

  try {
    const { rows, filename, buffer } = await runPipelineToBuffer(tipo, cidade, { log: false });
    if (!rows.length || !buffer) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(renderTemplate({ error: "Nenhum resultado encontrado.", tipo, cidade }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.end(buffer);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(renderTemplate({
      error: err.message || "Falha na chamada de API.",
      tipo,
      cidade,
    }));
  }
};
