// Node.js 18+ — raccolta IP solo dopo consenso esplicito.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATA_FILE = path.join(__dirname, "visits.json");
const PUBLIC_DIR = path.join(__dirname, "public");

if (!ADMIN_PASSWORD) {
  console.error("Imposta ADMIN_PASSWORD prima di avviare il server.");
  process.exit(1);
}

function readVisits() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}
function writeVisits(rows) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2), { mode: 0o600 });
}
function cleanup() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  writeVisits(readVisits().filter(v => new Date(v.timestamp).getTime() >= cutoff));
}
cleanup();

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store"
  });
  res.end(body);
}
function getClientIp(req) {
  // Non fidarti di X-Forwarded-For senza configurare un proxy fidato.
  return (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
}
function authorized(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded;
  try { decoded = Buffer.from(header.slice(6), "base64").toString(); }
  catch { return false; }
  const split = decoded.indexOf(":");
  return split >= 0 &&
    decoded.slice(0, split) === ADMIN_USER &&
    decoded.slice(split + 1) === ADMIN_PASSWORD;
}
async function geoLookup(ip) {
  // Servizio esterno: restituisce una stima IP, non una posizione GPS.
  const url = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Geo lookup non disponibile");
  const d = await response.json();
  return {
    paese: d.country_name || null,
    regione: d.region || null,
    citta: d.city || null,
    provider: d.org || null
  };
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/") {
    return send(res, 200, fs.readFileSync(path.join(PUBLIC_DIR, "index.html")), "text/html; charset=utf-8");
  }

  if (req.method === "POST" && url.pathname === "/api/consent-and-record") {
    // La richiesta viene inviata solo dopo il click consapevole sul pulsante.
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 2000) req.destroy(); });
    req.on("end", async () => {
      let payload;
      try { payload = JSON.parse(body || "{}"); } catch {
        return send(res, 400, JSON.stringify({ error: "Richiesta non valida" }));
      }
      if (payload.consent !== true) {
        return send(res, 400, JSON.stringify({ error: "Consenso mancante" }));
      }
      const ip = getClientIp(req);
      if (!ip) return send(res, 400, JSON.stringify({ error: "IP non disponibile" }));
      let geo = { paese: null, regione: null, citta: null, provider: null };
      try { geo = await geoLookup(ip); } catch {}
      const rows = readVisits();
      rows.push({
        timestamp: new Date().toISOString(),
        ip,
        ...geo
      });
      writeVisits(rows);
      return send(res, 200, JSON.stringify({
        ok: true,
        message: "Dati registrati. La posizione è una stima basata sull'IP."
      }));
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/admin") {
    if (!authorized(req)) {
      res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Area riservata"' });
      return res.end("Autenticazione richiesta");
    }
    const rows = readVisits().slice().reverse();
    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
    const html = `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Visite registrate</title>
    <style>body{font:16px system-ui;margin:2rem;max-width:1100px}table{border-collapse:collapse;width:100%}td,th{padding:.6rem;border-bottom:1px solid #ddd;text-align:left}small{color:#555}</style>
    <h1>Visite con consenso</h1><p><small>Le registrazioni vengono eliminate automaticamente dopo 30 giorni. La località è una stima IP.</small></p>
    <table><thead><tr><th>Data (UTC)</th><th>IP</th><th>Città</th><th>Regione</th><th>Paese</th><th>Provider</th></tr></thead><tbody>
    ${rows.map(v => `<tr><td>${esc(v.timestamp)}</td><td>${esc(v.ip)}</td><td>${esc(v.citta)}</td><td>${esc(v.regione)}</td><td>${esc(v.paese)}</td><td>${esc(v.provider)}</td></tr>`).join("")}
    </tbody></table></html>`;
    return send(res, 200, html, "text/html; charset=utf-8");
  }

  return send(res, 404, JSON.stringify({ error: "Non trovato" }));
});

server.listen(PORT, () => console.log(`Sito attivo sulla porta ${PORT}`));
