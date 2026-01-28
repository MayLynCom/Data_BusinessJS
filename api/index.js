const { runPipelineToBuffer } = require("../index.js");

const TEMPLATE = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Busca CNPJ</title>
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
    .panel::after {
      content: "";
      position: absolute;
      top: 0;
      left: 24px;
      width: 68px;
      height: 4px;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
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
      display: grid;
      gap: 14px;
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
    }
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; transition: none !important; }
    }
  </style>
</head>
<body>
  <div class="panel">
    <span class="badge">Data Business</span>
    <h1>Busca CNPJ</h1>
    <p class="subtitle">Preencha o tipo e a cidade para gerar o arquivo automaticamente.</p>
    <form method="post" action="/api">
      <div class="field">
        <label for="tipo">Tipo (ex: Restaurante)</label>
        <input id="tipo" name="tipo" value="__TIPO__" required placeholder="Restaurante">
      </div>
      <div class="field">
        <label for="cidade">Cidade (ex: Santos)</label>
        <input id="cidade" name="cidade" value="__CIDADE__" required placeholder="Santos">
      </div>
      <button type="submit">Gerar arquivo</button>
    </form>
    __ERROR_BLOCK__
  </div>
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
