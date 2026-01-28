const path = require("path");
const readline = require("readline/promises");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CNPJ_API_KEY = process.env.CNPJJA_API_KEY;

const PLACES_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";
const SEARCH_URL = "https://api.cnpja.com/office";
const USER_AGENT = "cnpja-client/1.0";

const MAX_PAGES = 3;
const MAX_COMPANIES = 3;
const ACTIVE_STATUS_ID = "2";
const NAME_SIMILARITY_THRESHOLD = 0.8;

const EXCEL_HEADERS = [
  "Nome da Empresa",
  "Endereco",
  "Numero",
  "CEP",
  "Telefone_Google",
  "Possivel_CNPJ",
  "Empresa_CNPJ",
  "Proprietario",
  "Email",
  "Telefone_CNPJ",
];

let ExcelJS = null;
try {
  ExcelJS = require("exceljs");
} catch (err) {
  ExcelJS = null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function getMissingEnv() {
  const missing = [];
  if (!GOOGLE_API_KEY) missing.push("GOOGLE_API_KEY");
  if (!CNPJ_API_KEY) missing.push("CNPJJA_API_KEY");
  return missing;
}

function assertEnv() {
  const missing = getMissingEnv();
  if (missing.length > 0) {
    throw new Error(`Defina as variaveis: ${missing.join(", ")}`);
  }
}

function sanitizeCep(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 8) {
    throw new Error("CEP deve ter 8 digitos");
  }
  return digits;
}

function normalizeName(text) {
  const normalized = String(text || "").normalize("NFKD");
  const ascii = normalized.replace(/[\u0300-\u036f]/g, "");
  return ascii.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function levenshtein(a, b) {
  const s = String(a || "");
  const t = String(b || "");
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  const v0 = new Array(t.length + 1).fill(0);
  const v1 = new Array(t.length + 1).fill(0);
  for (let i = 0; i < v0.length; i += 1) v0[i] = i;

  for (let i = 0; i < s.length; i += 1) {
    v1[0] = i + 1;
    for (let j = 0; j < t.length; j += 1) {
      const cost = s[i] === t[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1,
        v0[j + 1] + 1,
        v0[j] + cost
      );
    }
    for (let j = 0; j < v0.length; j += 1) v0[j] = v1[j];
  }
  return v1[t.length];
}

function nameSimilarity(a, b) {
  if (!a || !b) return 0.0;
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen ? (maxLen - distance) / maxLen : 0.0;
}

function normalizePhoneDigits(text) {
  let digits = String(text || "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  return digits;
}

function extractRecordInfo(rec) {
  const taxId = rec.taxId || "";
  const companyData = rec.company || {};
  const company = companyData.name || "";

  const owners = [];
  const members = companyData.members || rec.members || [];
  for (const member of members) {
    const person = (member && member.person) || {};
    if (person.name) owners.push(person.name);
    const agentPerson = ((member && member.agent) || {}).person || {};
    if (agentPerson.name) owners.push(agentPerson.name);
  }
  const uniqueOwners = Array.from(new Set(owners.filter(Boolean)));
  const ownersTxt = uniqueOwners.length > 0 ? uniqueOwners.join("; ") : (company || "nao informado");

  const emails = (rec.emails || [])
    .map((e) => (e ? e.address : ""))
    .filter(Boolean);
  const emailsTxt = emails.length > 0 ? emails.join("; ") : "nao informado";

  const phones = [];
  for (const phone of rec.phones || []) {
    const area = String(phone && phone.area ? phone.area : "").trim();
    const number = String(phone && phone.number ? phone.number : "").trim();
    if (area && number) {
      phones.push(`(${area}) ${number}`);
    } else if (number) {
      phones.push(number);
    }
  }
  const phonesTxt = phones.length > 0 ? phones.join("; ") : "nao informado";

  return {
    cnpj: taxId,
    empresa: company,
    proprietario: ownersTxt,
    email: emailsTxt,
    telefone: phonesTxt,
  };
}

function extractCnpjPhones(rec) {
  const phones = [];
  for (const phone of rec.phones || []) {
    const area = String(phone && phone.area ? phone.area : "");
    const number = String(phone && phone.number ? phone.number : "");
    const digits = normalizePhoneDigits(`${area}${number}`);
    if (digits) phones.push(digits);
  }
  if (phones.length > 0) return phones;

  const infoPhone = extractRecordInfo(rec).telefone || "";
  for (const part of infoPhone.split(/[;,/]/)) {
    const digits = normalizePhoneDigits(part);
    if (digits) phones.push(digits);
  }
  return phones;
}

function isAccountingEmail(email) {
  return String(email || "").toLowerCase().includes("cont");
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

function buildExcelFilename(tipo, local) {
  return `${slugifyFilename(`${tipo}_${local}`)}.xlsx`;
}

function createWorkbook(rows) {
  if (!ExcelJS) {
    throw new Error("exceljs nao instalado. Execute: npm install");
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("dados");
  ws.addRow(EXCEL_HEADERS);
  for (const row of rows) {
    ws.addRow(EXCEL_HEADERS.map((h) => row[h] || ""));
  }
  return wb;
}

async function writeExcelFile(rows, filename) {
  const wb = createWorkbook(rows);
  await wb.xlsx.writeFile(filename);
  return true;
}

async function buildExcelBuffer(rows) {
  const wb = createWorkbook(rows);
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function fetchPlaces(query, maxPages = MAX_PAGES) {
  let params = new URLSearchParams({
    query,
    key: GOOGLE_API_KEY,
    language: "pt-BR",
  });
  const results = [];
  let page = 0;

  while (true) {
    page += 1;
    const url = `${PLACES_URL}?${params.toString()}`;
    const payload = await fetchJson(url);
    const status = payload.status || "OK";
    if (status !== "OK" && status !== "ZERO_RESULTS") {
      const msg = payload.error_message ? ` - ${payload.error_message}` : "";
      throw new Error(`Google Places: ${status}${msg}`);
    }

    for (const item of payload.results || []) {
      if (item && item.place_id) {
        results.push({
          place_id: item.place_id,
          name: item.name || "",
          address: item.formatted_address || "",
        });
      }
    }

    const nextToken = payload.next_page_token;
    if (!nextToken || page >= maxPages) break;

    await sleep(2000);
    params = new URLSearchParams({
      pagetoken: nextToken,
      key: GOOGLE_API_KEY,
      language: "pt-BR",
    });
  }

  return results;
}

async function fetchPhone(placeId) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "formatted_phone_number",
    key: GOOGLE_API_KEY,
    language: "pt-BR",
  });
  const url = `${DETAILS_URL}?${params.toString()}`;
  const payload = await fetchJson(url);
  const result = payload.result || {};
  return result.formatted_phone_number || "";
}

async function searchOfficesByCep(cepDigits, numero) {
  const headers = {
    Accept: "application/json",
    Authorization: CNPJ_API_KEY,
    "User-Agent": USER_AGENT,
  };

  const results = [];
  let nextToken = null;

  while (true) {
    let params;
    if (nextToken) {
      params = new URLSearchParams({ token: nextToken });
    } else {
      params = new URLSearchParams({
        "address.zip.in": cepDigits,
        "address.number.in": String(numero || "").trim(),
        "status.id.in": ACTIVE_STATUS_ID,
      });
    }

    const url = `${SEARCH_URL}?${params.toString()}`;
    const data = await fetchJson(url, { headers });
    const records = data.records || [];
    results.push(...records);
    nextToken = data.next;
    if (!nextToken) break;
  }

  return results;
}

function isActiveOffice(rec) {
  const status = rec.status;
  if (status && typeof status === "object") {
    if (status.id !== undefined && status.id !== null) {
      return String(status.id) === ACTIVE_STATUS_ID;
    }
    const statusText = status.text || status.label;
    if (statusText) {
      return String(statusText).trim().toLowerCase() === "ativa";
    }
  } else if (typeof status === "string") {
    return status.trim().toLowerCase() === "ativa";
  }

  const statusId = rec.statusId || rec.status_id;
  if (statusId !== undefined && statusId !== null) {
    return String(statusId) === ACTIVE_STATUS_ID;
  }
  return false;
}

async function searchCnpjMatches(cepDigits, numero, googleName, googlePhone) {
  const matches = await searchOfficesByCep(cepDigits, numero);
  const active = matches.filter(isActiveOffice);
  if (!googleName && !googlePhone) return active;

  const googleNameNorm = normalizeName(googleName || "");
  const googlePhoneNorm = normalizePhoneDigits(googlePhone || "");
  const filtered = [];

  for (const rec of active) {
    const info = extractRecordInfo(rec);
    const companyNameNorm = normalizeName(info.empresa || "");

    let nameOk = false;
    if (googleNameNorm && companyNameNorm) {
      nameOk = nameSimilarity(googleNameNorm, companyNameNorm) >= NAME_SIMILARITY_THRESHOLD;
    }

    let phoneOk = false;
    if (googlePhoneNorm) {
      for (const phoneDigits of extractCnpjPhones(rec)) {
        if (phoneDigits === googlePhoneNorm) {
          phoneOk = true;
          break;
        }
      }
    }

    if (nameOk || phoneOk) filtered.push(rec);
  }

  return filtered.length > 0 ? filtered : active;
}

function printCnpjMatches(matches, logFn = console.log) {
  if (!matches || matches.length === 0) {
    logFn("CNPJ: nao encontrado");
    return;
  }

  logFn("CNPJ(s) ativos encontrados no CNPJA:");
  matches.forEach((rec, idx) => {
    const info = extractRecordInfo(rec);
    logFn(`[${idx + 1}]`);
    logFn(`CNPJ: ${info.cnpj || "nao informado"}`);
    logFn(`Empresa: ${info.empresa || "nao informado"}`);
    logFn(`Proprietario: ${info.proprietario}`);
    logFn(`Email: ${info.email}`);
    logFn(`Telefone: ${info.telefone}`);
    if (idx < matches.length - 1) {
      logFn("-".repeat(20));
    }
  });
}

async function runPipeline(tipo, cidade, options = {}) {
  assertEnv();
  const logFn = options.log === false ? () => {} : console.log;

  const query = `${tipo} em ${cidade}`;
  const places = await fetchPlaces(query);
  if (!places || places.length === 0) {
    return { rows: [], filename: buildExcelFilename(tipo, cidade) };
  }

  const rows = [];
  for (const place of places.slice(0, MAX_COMPANIES)) {
    const address = place.address || "";
    const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
    const rawNum = parts.length > 1 ? parts[1] : "";
    const numMatch = rawNum.match(/\d{2,5}/);
    const numero = numMatch ? numMatch[0] : "";
    const cepRaw = parts.length > 1 ? parts[parts.length - 2] : "";

    let cepDigits = "";
    try {
      cepDigits = sanitizeCep(cepRaw);
    } catch (err) {
      cepDigits = "";
    }

    const phone = await fetchPhone(place.place_id);

    logFn(`Nome: ${place.name}`);
    logFn(`Endereco: ${address}`);
    logFn(`Numero: ${numero || "nao encontrado"}`);
    logFn(`CEP: ${cepDigits || cepRaw || "nao encontrado"}`);
    logFn(`Telefone: ${phone || "nao informado"}`);

    let matches = [];
    if (cepDigits && numero) {
      try {
        matches = await searchCnpjMatches(cepDigits, numero, place.name, phone);
      } catch (err) {
        logFn(`Falha na chamada de API CNPJA: ${err.message}`);
      }
      printCnpjMatches(matches, logFn);
    } else {
      logFn("CNPJ: nao encontrado (CEP/numero incompleto)");
    }

    const baseRow = {
      "Nome da Empresa": place.name || "",
      Endereco: address || "",
      Numero: numero || "nao encontrado",
      CEP: cepDigits || cepRaw || "nao encontrado",
      Telefone_Google: phone || "nao informado",
    };

    if (matches.length > 0) {
      for (const rec of matches) {
        const info = extractRecordInfo(rec);
        let emailValue = info.email;
        let phoneValue = info.telefone;
        if (isAccountingEmail(emailValue)) {
          emailValue = "nao encontrado";
          phoneValue = "nao encontrado";
        }
        rows.push({
          ...baseRow,
          Possivel_CNPJ: info.cnpj || "nao encontrado",
          Empresa_CNPJ: info.empresa || "nao informado",
          Proprietario: info.proprietario,
          Email: emailValue,
          Telefone_CNPJ: phoneValue,
        });
      }
    } else {
      rows.push({
        ...baseRow,
        Possivel_CNPJ: "nao encontrado",
        Empresa_CNPJ: "nao informado",
        Proprietario: "nao informado",
        Email: "nao informado",
        Telefone_CNPJ: "nao informado",
      });
    }

    logFn("-".repeat(20));
    await sleep(200);
  }

  return { rows, filename: buildExcelFilename(tipo, cidade) };
}

async function runPipelineToBuffer(tipo, cidade, options = {}) {
  const result = await runPipeline(tipo, cidade, options);
  if (!result.rows.length) {
    return { ...result, buffer: null };
  }
  const buffer = await buildExcelBuffer(result.rows);
  return { ...result, buffer };
}

async function promptIfMissing(tipo, cidade) {
  let t = String(tipo || "").trim();
  let c = String(cidade || "").trim();
  if (t && c) return { tipo: t, cidade: c };

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (!t) t = (await rl.question("Digite o tipo de empresa (ex: restaurantes): ")).trim();
  if (!c) c = (await rl.question("Digite a localizacao (ex: santos): ")).trim();
  rl.close();
  return { tipo: t, cidade: c };
}

async function main() {
  const { tipo, cidade } = await promptIfMissing(process.argv[2], process.argv[3]);
  if (!tipo || !cidade) {
    console.log("Tipo e localizacao sao obrigatorios.");
    return;
  }

  try {
    const { rows, filename } = await runPipeline(tipo, cidade, { log: true });
    if (!rows.length) {
      console.log("Nenhum resultado encontrado.");
      return;
    }

    const outputPath = path.join(process.cwd(), filename);
    await writeExcelFile(rows, outputPath);
    console.log(`Arquivo Excel salvo em: ${filename}`);
  } catch (err) {
    console.log(err.message || String(err));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runPipeline,
  runPipelineToBuffer,
  buildExcelFilename,
};
