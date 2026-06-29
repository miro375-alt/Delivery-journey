/* 공용 헬퍼 (의존성 없음, Node 18+ 내장 fetch 사용) */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function log(...a) { console.log("[data-sync]", ...a); }

function haveEnv(keys) { return keys.every((k) => !!process.env[k]); }

function mask(s) { return s ? s.slice(0, 4) + "…" + s.slice(-2) : ""; }

function writeData(file, obj) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(obj, null, 2) + "\n");
  log("wrote data/" + file, Array.isArray(obj) ? obj.length + " items" : "");
}

async function getJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${url} ${t.slice(0, 200)}`);
  }
  return res.json();
}

module.exports = { log, haveEnv, mask, writeData, getJSON, DATA_DIR };
