const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const FILE = path.join(app.getPath('userData'), 'desktop.json');

const DEFAULTS = {
  window: { width: 1440, height: 940, x: undefined, y: undefined, maximized: false },
  // Extra absolute executable paths the user explicitly trusts as external players,
  // on top of the built-in known-player list.
  extraPlayerBinaries: [],
  network: {
    // Optional DoH prefers encrypted DNS, with system DNS as fallback.
    doh: false,
    dohServers: [
      'https://cloudflare-dns.com/dns-query',
      'https://dns.google/dns-query',
      'https://dns.quad9.net/dns-query'
    ],
    // Legacy empty/system values inherit system settings; proxyMode makes routing explicit.
    // Custom proxy address example:
    // 'socks5://127.0.0.1:1080' / 'http://host:port'.
    proxy: ''
  }
};

let cache = null;

const load = () => {
  if (cache) return cache;
  let parsed = {};
  try {
    // Drop "__proto__" keys so a hand-edited file can't swap the prototype of the merged config.
    parsed = JSON.parse(fs.readFileSync(FILE, 'utf-8'), (key, value) => (key === '__proto__' ? undefined : value)) || {};
    if (typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
  } catch (error) {
    parsed = {};
  }
  cache = Object.assign({}, DEFAULTS, parsed);
  // one-level deep merge so a partial section in the file keeps the other defaults
  cache.window = Object.assign({}, DEFAULTS.window, parsed.window || {});
  cache.network = Object.assign({}, DEFAULTS.network, parsed.network || {});
  return cache;
};

let saveTimer = null;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      // Owner-only and atomic: the file holds proxy settings and the trusted-player list.
      const tmp = `${FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, FILE);
    } catch (error) {
      // best-effort; a missing userData dir or read-only FS should not crash the app
    }
  }, 400);
};

const get = (key) => load()[key];

const set = (key, value) => {
  load()[key] = value;
  save();
};

const merge = (key, partial) => {
  const current = load()[key] || {};
  load()[key] = Object.assign({}, current, partial);
  save();
};

module.exports = { load, get, set, merge, FILE };
