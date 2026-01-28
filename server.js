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
    <form method="post">
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
    __MESSAGE_BLOCK__
    __DOWNLOAD_BLOCK__
  </div>
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

