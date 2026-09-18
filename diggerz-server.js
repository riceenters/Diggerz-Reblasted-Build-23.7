'use strict';

// Diggerz Build 23.9 Reblasted multiplayer + Battle Royale server.
// Dependency-free Node.js WebSocket server: rooms, presence, and relay.

const http = require('http');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_ROOM_PLAYERS = 10;
const MAX_MESSAGE_BYTES = 64 * 1024;
const MAX_MESSAGES_PER_SECOND = 120;
const MAX_SOCKET_BACKLOG_BYTES = 256 * 1024;
const MAX_SOCKET_HARD_BACKLOG_BYTES = 1024 * 1024;
const NATIVE_MOVEMENT_RELAY_MS = 66;
const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
const ADMIN_FAIL_WINDOW_MS = 10 * 60 * 1000;
const ADMIN_BLOCK_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILURES = 5;
const HEARTBEAT_INTERVAL_MS = 15 * 1000;
const HEARTBEAT_TIMEOUT_MS = 45 * 1000;
const ROSTER_INTERVAL_MS = 5 * 1000;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const ALLOWED_RELAY_TYPES = new Set(['session', 'hello', 'chat', 'typing', 'health']);
const BUILD = '23.9';
const WORLD_WIDTH = 128;
const BATTLE_BUILD_MS = Number(process.env.DIGGERZ_BUILD_MS || 40 * 1000);
const BATTLE_FIRST_SHRINK_MS = Number(process.env.DIGGERZ_FIRST_SHRINK_MS || 90 * 1000);
const BATTLE_SHRINK_INTERVAL_MS = Number(process.env.DIGGERZ_SHRINK_INTERVAL_MS || 60 * 1000);
const BATTLE_SHRINK_WARNING_MS = Number(process.env.DIGGERZ_SHRINK_WARNING_MS || 3 * 1000);
const BATTLE_SHRINK_STEP = Number(process.env.DIGGERZ_SHRINK_STEP || 8);
const BATTLE_MIN_LEFT = -0.5;
const BATTLE_MAX_RIGHT = WORLD_WIDTH - 0.5;
const BATTLE_MIN_PLAY_WIDTH = 12;
const BATTLE_MAX_INSET = Math.max(0, Math.floor((WORLD_WIDTH - BATTLE_MIN_PLAY_WIDTH) / 2));
const PROJECTILE_ATTACKS = new Set([20,22,23,29,31,33,35,37,39]);
const GAME_HTML_PATH = path.join(__dirname, 'index.html');
const BUILD239_CLIENT_PATH = path.join(__dirname, 'build239-client.js');
const MAP_EDITOR_PATH = path.join(__dirname, 'map-editor.html');
const TILES_PNG_PATH = path.join(__dirname, 'tiles.png');
const BKND_PNG_PATH = path.join(__dirname, 'bknd.png');
const LEVELUP_OGG_PATH = path.join(__dirname, 'levelup.ogg');
const MUSIC_OGG_PATHS = [1,2,3,4].map((n,i)=>path.join(__dirname, i===0?'music_theme.ogg':`music_theme${n}.ogg`));
const BALLOON_POP_OGG_PATH = path.join(__dirname, 'balloon_pop.ogg');
const SWAP_OGG_PATH = path.join(__dirname, 'swap.ogg');
const MAPS_DIR = path.join(__dirname, 'maps');
const BANS_FILE = process.env.DIGGERZ_BANS_FILE || path.join(__dirname, 'bans.json');
const PLAYERS_FILE = process.env.DIGGERZ_PLAYERS_FILE || path.join(__dirname, 'players.json');
const DONATIONS_FILE = process.env.DIGGERZ_DONATIONS_FILE || path.join(__dirname, 'donations.json');
const MAX_KNOWN_PLAYERS = 2000;
const KNOWN_PLAYER_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const ADMIN_OWNER_SHA = '87712f48ae7baef068d070d5823c838ea174f695c634bccced0b7bcc757c40eb';
const ADMIN_OWNER_PREFIX = 'DIGGERZ21.1:';
const ADMIN_LIME_SHA = 'c14bfe998610dbb2a6c1a3477cb8574b9c62a2f0310fc2a5278b2a71317c35ed';
const ADMIN_LIME_PREFIX = 'DIGGERZ21.13:LIME:';
const ADMIN_OWNER_ENV_CODE = String(process.env.DIGGERZ_ADMIN_OWNER_CODE || '').trim().toUpperCase();
const ADMIN_LIME_ENV_CODE = String(process.env.DIGGERZ_ADMIN_LIME_CODE || '').trim().toUpperCase();
function crc32Buffer(buffer) {
  if (!crc32Buffer.table) {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let x = n;
      for (let k = 0; k < 8; k++) x = (x & 1) ? (0xEDB88320 ^ (x >>> 1)) : (x >>> 1);
      table[n] = x >>> 0;
    }
    crc32Buffer.table = table;
  }
  let crc = 0xFFFFFFFF;
  for (const byte of buffer) crc = crc32Buffer.table[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(String(entry.name || '').replace(/\\/g, '/'), 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data || '');
    const crc = crc32Buffer(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function patchGameHtmlForBuild239(input) {
  let html = Buffer.isBuffer(input) ? input.toString('utf8') : String(input || '');
  const replacements = [
    [
      "null != l.z39 && 50 < l.z39.a1 && E.v2(Um.n7())",
      "null != l.z39 && 50 < l.z39.a1 && (!window.__diggerzLightswordSfxAt || Date.now() - window.__diggerzLightswordSfxAt >= 120) && (window.__diggerzLightswordSfxAt = Date.now(), E.v2(Um.n7(), new fh(I.__cast(q.player.k8, md) / 100 * .3)))",
      'lightsword playback limiter'
    ],
    [
      "            if (lastPlayed[name] && now - lastPlayed[name] < 24) return true;\n            lastPlayed[name] = now;",
      "            var cooldown = /lightsword/.test(name) ? 120 : 24;\n            if (lastPlayed[name] && now - lastPlayed[name] < cooldown) return true;\n            lastPlayed[name] = now;",
      'synth lightsword cooldown'
    ],
    [
      "            var destination = output(ctx, volume);",
      "            var destination = output(ctx, /lightsword/.test(name) ? volume * .3 : volume);",
      'synth lightsword volume'
    ],
    [
      'usePvpTest ? "Build 23.7 native-packet PvP" : (useLocalDigTrade ? "Build 23.7 native-packet Dig+Trade" : "original multiplayer server")',
      'usePvpTest ? "Build 23.9 native-packet PvP" : (useLocalDigTrade ? "Build 23.9 native-packet Dig+Trade" : "original multiplayer server")',
      'connection route label'
    ],
    ['z-index: 100;">Build 23.7</div>', 'z-index: 100;">Build 23.9</div>', 'build badge'],
    ['Build 23.7 multiplayer admin tools. Konami sequence + server-authorized admin session required.', 'Build 23.9 multiplayer admin tools. Konami sequence + server-authorized admin session required.', 'admin build label'],
    ['<h2>Build 23.7 — Diggerz Multiplayer</h2>', '<h2>Build 23.9 — Diggerz Multiplayer</h2>', 'multiplayer heading'],
    ['<span>MP DEBUG 23.7</span>', '<span>MP DEBUG 23.9</span>', 'debug build label'],
    ["build:'23.7'", "build:'23.9'", 'matchmaking build id']
  ];

  for (const entry of replacements) {
    const from = entry[0], to = entry[1], label = entry[2];
    if (!html.includes(from)) {
      console.warn('[Diggerz 23.8] HTML patch target not found:', label);
      continue;
    }
    html = html.replace(from, to);
  }

  // Build 23.8: the game is guest-only. Remove the Log In / Log Out menu block
  // and retire the 23.7 passwordless account client entirely.
  const loginStart = html.indexOf('            N.startsWith(q.thisMain.userPW, "NOPASSWORD")');
  const shopText = loginStart >= 0 ? html.indexOf('            this.d51.E37("Shop");', loginStart) : -1;
  const shopStart = shopText >= 0 ? html.lastIndexOf('            b = new z;', shopText) : -1;
  if (loginStart >= 0 && shopStart > loginStart) {
    const supportMenuBlock = "            q.thisMain.userEmail = \"\";\n            q.thisMain.userPW = \"\";\n            b = new z;\n            b.Init(u.YELLOWBUTTON_PNG());\n            b.D7(this);\n            b.b7 = d;\n            d += 80;\n            b.b6 = q.SCREENWIDTH / 2 - 150;\n            b.set_local_xScale(b.set_local_yScale(.5));\n            b._1 = \"support message\";\n            b.F6(5, 0, 1, 500);\n            this._9.push(b);\n            this.d51 = new ob(0,0,\"\",q.MAIN_FONT_BIG);\n            this.d51.D7(b);\n            this.d51.E37(\"Donate\");\n            this.d51.b7 = 2;\n            this.d51.B8 = 5;\n            this.d51.C33 = function(){ if(window.DiggerzSupport239) window.DiggerzSupport239.open(); };\n            this.d51._1 = \"welcome message\";\n            this._9.push(this.d51);\n            c = new xa(0,-70,\"Support Diggerz multiplayer\");\n            c.D7(b, !0);\n            c.set_local_xScale(c.set_local_yScale(1.25));\n            this._9.push(c);\n";
    html = html.slice(0, loginStart) + supportMenuBlock + html.slice(shopStart);
  } else {
    console.warn('[Diggerz 23.9] login/support menu block was not found.');
  }

  const authScriptStart = html.indexOf('<script id="diggerz-build23-7-security-patch">');
  const authScriptEnd = authScriptStart >= 0 ? html.indexOf('</script>', authScriptStart) : -1;
  if (authScriptStart >= 0 && authScriptEnd > authScriptStart) {
    const noLoginScript = '<script id="diggerz-build23-8-no-login-patch">(function(){try{localStorage.removeItem("diggerz.resurrection.accounts.v1");localStorage.removeItem("diggerz.resurrection.boundEmail.v1");sessionStorage.removeItem("diggerz.auth.active.v1");delete window.DiggerzAuth237}catch(e){}var n=0,t=setInterval(function(){n++;try{if(window.q&&q.thisMain){q.thisMain.userEmail="";q.thisMain.userPW="";if(typeof q.SaveGlobals==="function")q.SaveGlobals();clearInterval(t)}}catch(e){}if(n>100)clearInterval(t)},100)}());</script>';
    html = html.slice(0, authScriptStart) + noLoginScript + html.slice(authScriptEnd + 9);
  } else {
    console.warn('[Diggerz 23.8] legacy auth client script was not found.');
  }

  // Build 23.8 itch/Railway split: static browser clients always use Railway
  // for multiplayer and protected admin HTTP endpoints.
  const railwayHttp = 'https://diggerz-multiplayer-test-production.up.railway.app';
  const railwayWs = 'wss://diggerz-multiplayer-test-production.up.railway.app';
  const httpsWsOld = "    if(location.protocol==='https:')return 'wss://'+location.host;";
  if (html.includes(httpsWsOld)) html = html.replace(httpsWsOld, "    if(location.protocol==='https:')return '"+railwayWs+"';");
  else console.warn('[Diggerz 23.8] automatic HTTPS WebSocket target was not found.');

  ['/api/admin/auth','/api/admin/bans','/api/admin/moderate'].forEach(function(apiPath) {
    const from = "fetch('" + apiPath + "'";
    const to = "fetch('" + railwayHttp + apiPath + "'";
    if (html.includes(from)) html = html.split(from).join(to);
  });

  const mapEditorCall = "window.open('/map-editor','diggerz-map-editor')";
  if (html.includes(mapEditorCall)) {
    html = html.split(mapEditorCall).join("window.open('"+railwayHttp+"/map-editor','diggerz-map-editor')");
  }

  // Build 23.8 itch client: ban redirects must go to the Railway backend page,
  // not to /banned on the itch.io static origin.
  if (html.includes("location.replace('/banned')")) {
    html = html.split("location.replace('/banned')").join("location.replace('"+railwayHttp+"/banned')");
  }

  const marker = '<hr><a name="Build 23.7"></a>';
  if (!html.includes('Build 23.8 - Railway / itch Migration & Fixes') && html.includes(marker)) {
    const section = '<hr><a name="Build 23.8"></a> <h2>Build 23.8 - Railway / itch Migration &amp; Fixes</h2> <ul> <li>Reduced lightsword swing sound volume to 30% and added a 120 ms anti-spam cooldown.</li> <li>Fixed server-authorized admin item, coin, and kill actions when an admin targets themselves.</li> <li>Removed the player login / logout feature and retired the passwordless account client. Diggerz now runs guest-only.</li> <li>Prepared the browser client to use the permanent Railway multiplayer/admin backend when hosted on itch.io.</li> <li>Updated active multiplayer build identifiers to 23.8.</li> </ul> ';
    html = html.replace(marker, section + marker);
  }

  if (!html.includes('build239-client.js')) {
    const build239Tag = '<script src="/build239-client.js"></script>';
    const bodyClose = html.lastIndexOf('</body>');
    html = bodyClose >= 0 ? html.slice(0, bodyClose) + build239Tag + html.slice(bodyClose) : html + build239Tag;
  }

  const marker239 = '<hr><a name="Build 23.8"></a>';
  if (!html.includes('Build 23.9 - Economy, Beta Gun, Support & UPDATE Hat') && html.includes(marker239)) {
    const section239 = '<hr><a name="Build 23.9"></a> <h2>Build 23.9 - Economy, Beta Gun, Support &amp; UPDATE Hat</h2> <ul> <li>Patched the long-standing multiplayer trade reload/duplication race.</li> <li>Fixed Beta Gun firing, added it to common mining weapon drops, and kept it tradable.</li> <li>Added the UPDATE Hat with item-specific player-head placement.</li> <li>Added Support Diggerz donations and a verified supporter leaderboard.</li> </ul> ';
    html = html.replace(marker239, section239 + marker239);
  }

  return Buffer.from(html, 'utf8');
}

let gameHtml = null;
let build239ClientJs = null;
let mapEditorHtml = null;
let tilesPng = null;
let bkndPng = null;
let levelupOgg = null;
let musicOgg = [null,null,null,null];
let balloonPopOgg = null;
let swapOgg = null;
try { gameHtml = patchGameHtmlForBuild239(fs.readFileSync(GAME_HTML_PATH)); } catch (error) { console.warn('[Diggerz] index.html not found at startup:', error.message); }
try { build239ClientJs = fs.readFileSync(BUILD239_CLIENT_PATH); } catch (error) { console.warn('[Diggerz] build239-client.js not found:', error.message); }
try { mapEditorHtml = fs.readFileSync(MAP_EDITOR_PATH); } catch (error) { console.warn('[Diggerz] map-editor.html not found:', error.message); }
try { tilesPng = fs.readFileSync(TILES_PNG_PATH); } catch (error) { console.warn('[Diggerz] tiles.png not found:', error.message); }
try { bkndPng = fs.readFileSync(BKND_PNG_PATH); } catch (error) { console.warn('[Diggerz] bknd.png not found:', error.message); }
try { levelupOgg = fs.readFileSync(LEVELUP_OGG_PATH); } catch (error) { console.warn('[Diggerz] levelup.ogg not found:', error.message); }
for (let i=0;i<MUSIC_OGG_PATHS.length;i++) try { musicOgg[i]=fs.readFileSync(MUSIC_OGG_PATHS[i]); } catch(error) { console.warn(`[Diggerz] music theme ${i+1} not found:`,error.message); }
try { balloonPopOgg=fs.readFileSync(BALLOON_POP_OGG_PATH); } catch(error) { console.warn('[Diggerz] balloon_pop.ogg not found:',error.message); }
try { swapOgg=fs.readFileSync(SWAP_OGG_PATH); } catch(error) { console.warn('[Diggerz] swap.ogg not found:',error.message); }

const rooms = new Map();
const adminSessions = new Map();
const adminAuthAttempts = new Map();
let bans = [];
let knownPlayers = [];
let donations = [];
let nextConnectionNumber = 1;
let nextMatchNumber = 1;
let nextTradeNumber = 1;
let lastBattleMapKey = '';
const SPEAKER_TRACK_MS = [126485,148571,30316,60632];
const COTTON_SPAWN_MS = Number(process.env.DIGGERZ_COTTON_SPAWN_MS || 60 * 1000);
const TURRET_FIRE_MS = Number(process.env.DIGGERZ_TURRET_FIRE_MS || 1150);

function nowIso() {
  return new Date().toISOString();
}

function log(...args) {
  console.log(`[${nowIso()}]`, ...args);
}

function normalizeRoom(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function normalizeMode(value) {
  return value === 'digtrade' ? 'digtrade' : 'pvp';
}

function normalizeName(value) {
  const name = String(value || 'Player').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 24);
  return name || 'Player';
}

function secureHexEqual(a, b) {
  try {
    const aa = Buffer.from(String(a || ''), 'hex');
    const bb = Buffer.from(String(b || ''), 'hex');
    return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
  } catch { return false; }
}

function adminRoleForCode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!code) return '';
  if (ADMIN_OWNER_ENV_CODE) {
    if (secureHexEqual(hashIdentity(code), hashIdentity(ADMIN_OWNER_ENV_CODE))) return 'owner';
  } else {
    const owner = crypto.createHash('sha256').update(ADMIN_OWNER_PREFIX + code).digest('hex');
    if (secureHexEqual(owner, ADMIN_OWNER_SHA)) return 'owner';
  }
  if (ADMIN_LIME_ENV_CODE) {
    if (secureHexEqual(hashIdentity(code), hashIdentity(ADMIN_LIME_ENV_CODE))) return 'lime';
  } else {
    const lime = crypto.createHash('sha256').update(ADMIN_LIME_PREFIX + code).digest('hex');
    if (secureHexEqual(lime, ADMIN_LIME_SHA)) return 'lime';
  }
  return '';
}

function verifyAdminCode(value) { return !!adminRoleForCode(value); }

function normalizeClientId(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
}

function getRemoteIp(reqOrSocket) {
  const headers = reqOrSocket && reqOrSocket.headers;
  const forwarded = headers && String(headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwarded) return forwarded.slice(0, 128);
  const socket = reqOrSocket && reqOrSocket.socket ? reqOrSocket.socket : reqOrSocket;
  return String(socket && socket.remoteAddress || 'unknown').slice(0, 128);
}

function hashIdentity(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function sanitizeReason(value, fallback = 'No reason provided.') {
  const text = String(value || '').replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, 180);
  return text || fallback;
}


function loadKnownPlayers() {
  try {
    if (!fs.existsSync(PLAYERS_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
    if (!Array.isArray(raw)) return [];
    const cutoff = Date.now() - KNOWN_PLAYER_MAX_AGE_MS;
    return raw.filter(x => x && typeof x === 'object' && Number(x.lastSeen) >= cutoff).map(x => ({
      name: normalizeName(x.name), nameKey: String(x.nameKey || '').toLowerCase().slice(0,64),
      clientIdHash: String(x.clientIdHash || '').slice(0,128), ipHash: String(x.ipHash || '').slice(0,128),
      lastSeen: Number(x.lastSeen) || Date.now()
    })).slice(-MAX_KNOWN_PLAYERS);
  } catch (error) {
    console.warn('[Diggerz] could not load known players:', error.message);
    return [];
  }
}

function saveKnownPlayers() {
  try {
    const cutoff = Date.now() - KNOWN_PLAYER_MAX_AGE_MS;
    knownPlayers = knownPlayers.filter(x => x && x.lastSeen >= cutoff).sort((a,b)=>a.lastSeen-b.lastSeen).slice(-MAX_KNOWN_PLAYERS);
    fs.mkdirSync(path.dirname(PLAYERS_FILE), { recursive:true });
    const tmp = PLAYERS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(knownPlayers, null, 2));
    fs.renameSync(tmp, PLAYERS_FILE);
    return true;
  } catch (error) {
    console.warn('[Diggerz] could not save known players:', error.message);
    return false;
  }
}

function loadDonations() {
  try {
    if (!fs.existsSync(DONATIONS_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(DONATIONS_FILE, 'utf8'));
    if (!Array.isArray(raw)) return [];
    return raw.filter(x => x && typeof x === 'object' && Number(x.amount) > 0).map(x => ({
      id: String(x.id || '').slice(0,80) || 'DON-'+crypto.randomBytes(6).toString('hex').toUpperCase(),
      name: normalizeName(x.name || 'Anonymous'),
      amount: Math.max(1,Math.min(1000,Math.round(Number(x.amount)*100)/100)),
      createdAt: Number(x.createdAt) || Date.now(),
      verified: true
    })).slice(-5000);
  } catch (error) {
    console.warn('[Diggerz] could not load donations:', error.message);
    return [];
  }
}

function saveDonations() {
  try {
    fs.mkdirSync(path.dirname(DONATIONS_FILE), { recursive:true });
    const tmp = DONATIONS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(donations, null, 2));
    fs.renameSync(tmp, DONATIONS_FILE);
    return true;
  } catch (error) {
    console.warn('[Diggerz] could not save donations:', error.message);
    return false;
  }
}

function publicDonationBoard() {
  const rows = donations.filter(d => d && d.verified && d.amount > 0)
    .slice().sort((a,b)=>b.amount-a.amount || a.createdAt-b.createdAt)
    .map(d=>({id:d.id,name:d.name||'Anonymous',amount:d.amount,createdAt:d.createdAt}));
  return { donations:rows, total:rows.reduce((sum,d)=>sum+Number(d.amount||0),0) };
}

function rememberPlayer(client, name, clientId) {
  const cleanName = normalizeName(name);
  const nameKey = cleanName.toLowerCase();
  const cid = normalizeClientId(clientId || (client && client.clientId) || '');
  const entry = {
    name: cleanName,
    nameKey,
    clientIdHash: cid ? hashIdentity(cid) : '',
    ipHash: hashIdentity(client && client.ip || ''),
    lastSeen: Date.now()
  };
  // Keep the newest identity for a name at the end of the file.
  knownPlayers = knownPlayers.filter(x => x && x.nameKey !== nameKey);
  knownPlayers.push(entry);
  saveKnownPlayers();
  return entry;
}

function knownPlayerForName(name) {
  const key = normalizeName(name).toLowerCase();
  for (let i = knownPlayers.length - 1; i >= 0; i--) {
    const p = knownPlayers[i];
    if (p && p.nameKey === key) return p;
  }
  return null;
}

function loadBans() {
  try {
    if (!fs.existsSync(BANS_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(BANS_FILE, 'utf8'));
    if (!Array.isArray(raw)) return [];
    return raw.filter(x => x && typeof x === 'object' && x.id).map(x => ({
      id: String(x.id).slice(0,80), name: normalizeName(x.name), nameKey: String(x.nameKey || normalizeName(x.name).toLowerCase()).slice(0,64),
      clientIdHash: String(x.clientIdHash || '').slice(0,128), ipHash: String(x.ipHash || '').slice(0,128),
      createdAt: Number(x.createdAt) || Date.now(), expiresAt: Number(x.expiresAt) || 0,
      permanent: !!x.permanent, reason: sanitizeReason(x.reason), byRole: String(x.byRole || 'admin').slice(0,20)
    }));
  } catch (error) {
    console.warn('[Diggerz] could not load bans:', error.message);
    return [];
  }
}

function saveBans() {
  try {
    fs.mkdirSync(path.dirname(BANS_FILE), { recursive:true });
    const tmp = BANS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(bans, null, 2));
    fs.renameSync(tmp, BANS_FILE);
    return true;
  } catch (error) {
    console.warn('[Diggerz] could not save bans:', error.message);
    return false;
  }
}

function pruneExpiredBans(save = false) {
  const now = Date.now();
  const before = bans.length;
  bans = bans.filter(b => b && (b.permanent || b.expiresAt > now));
  if (save && bans.length !== before) saveBans();
}

function publicBan(ban) {
  return {
    id: ban.id, name: ban.name, createdAt: ban.createdAt, expiresAt: ban.expiresAt,
    permanent: !!ban.permanent, reason: ban.reason, byRole: ban.byRole
  };
}

function activeBanFor(client, name, clientId) {
  pruneExpiredBans(true);
  const ipHash = hashIdentity(client && client.ip || '');
  const cid = normalizeClientId(clientId || (client && client.clientId) || '');
  const clientIdHash = cid ? hashIdentity(cid) : '';
  const nameKey = normalizeName(name).toLowerCase();
  for (const ban of bans) {
    if (!ban || (!ban.permanent && ban.expiresAt <= Date.now())) continue;
    if (ban.nameKey && nameKey && ban.nameKey === nameKey) return ban;
    if (ban.clientIdHash && clientIdHash && secureHexEqual(ban.clientIdHash, clientIdHash)) return ban;
    if (ban.ipHash && ipHash && secureHexEqual(ban.ipHash, ipHash)) return ban;
  }
  return null;
}

function issueAdminSession(role, ip) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ADMIN_SESSION_MS;
  adminSessions.set(token, { role, ipHash: hashIdentity(ip), expiresAt });
  return { token, role, expiresAt };
}

function adminSessionFromToken(token, ip = '') {
  token = String(token || '').trim();
  const session = adminSessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) { adminSessions.delete(token); return null; }
  if (ip && session.ipHash && !secureHexEqual(session.ipHash, hashIdentity(ip))) return null;
  return session;
}

function adminTokenFromRequest(req) {
  const auth = String(req.headers.authorization || '');
  const m = auth.match(/^Bearer\s+([A-Fa-f0-9]{64})$/);
  return m ? m[1] : '';
}

function verifyAdminSessionToken(token, client) {
  return !!adminSessionFromToken(token, client && client.ip || '');
}

function authAttemptState(ip) {
  const key = hashIdentity(ip);
  const now = Date.now();
  let state = adminAuthAttempts.get(key);
  if (!state || state.windowEnds <= now) state = { failures:0, windowEnds:now + ADMIN_FAIL_WINDOW_MS, blockedUntil:0 };
  adminAuthAttempts.set(key, state);
  return state;
}

function recordAdminAuthFailure(ip) {
  const state = authAttemptState(ip);
  state.failures++;
  if (state.failures >= ADMIN_MAX_FAILURES) state.blockedUntil = Date.now() + ADMIN_BLOCK_MS;
  return state;
}

function clearAdminAuthFailures(ip) { adminAuthAttempts.delete(hashIdentity(ip)); }

function findClientGlobal(connectionId) {
  connectionId = String(connectionId || '');
  for (const room of rooms.values()) for (const client of room.clients) if (client.connectionId === connectionId) return client;
  return null;
}

function findClientsGlobalByName(name) {
  const key = normalizeName(name).toLowerCase();
  const found = [];
  for (const room of rooms.values()) {
    for (const client of room.clients) {
      if (!client.closed && normalizeName(client.name).toLowerCase() === key) found.push(client);
    }
  }
  return found;
}

bans = loadBans();
knownPlayers = loadKnownPlayers();
donations = loadDonations();
pruneExpiredBans(true);

function sanitizeMap(raw, filename = '') {
  if (!raw || typeof raw !== 'object' || raw.format !== 'diggerz-pvp-map-v1') return null;
  if ((Number(raw.width)|0) !== 128 || (Number(raw.height)|0) !== 80 || !Array.isArray(raw.tiles)) return null;
  const tiles = [];
  const seen = new Set();
  for (const row of raw.tiles.slice(0, 128 * 80)) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const x=Number(row[0])|0, y=Number(row[1])|0, id=Number(row[2])|0, variant=(Number(row[3])|0)&31, flags=(Number(row[4])|0)&15;
    if (x<0 || x>=128 || y<0 || y>=80 || id<=0 || id>2047) continue;
    const key=`${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tiles.push(flags ? [x,y,id,variant,flags] : [x,y,id,variant]);
  }
  const fallback = path.basename(filename || 'Custom Map', path.extname(filename || '')) || 'Custom Map';
  const name = String(raw.name || fallback).replace(/[\x00-\x1F\x7F]/g,'').trim().slice(0,40) || fallback;
  const backgroundTiles=[]; const seenBg=new Set();
  if(Array.isArray(raw.backgroundTiles)) for(const row of raw.backgroundTiles.slice(0,128*80)){
    if(!Array.isArray(row)||row.length<3)continue; const x=Number(row[0])|0,y=Number(row[1])|0,id=Number(row[2])|0,variant=(Number(row[3])|0)&31,flags=(Number(row[4])|0)&15;
    if(x<0||x>=128||y<0||y>=80||id<=0||id>2047)continue; const key=`${x},${y}`; if(seenBg.has(key))continue; seenBg.add(key); backgroundTiles.push(flags?[x,y,id,variant,flags]:[x,y,id,variant]);
  }
  return { format:'diggerz-pvp-map-v1', name, width:128, height:80, background:Math.max(0,Math.min(9,Number(raw.background)|0)), tiles, backgroundTiles };
}

function loadCustomMaps() {
  const maps=[];
  try { fs.mkdirSync(MAPS_DIR,{recursive:true}); } catch {}
  let files=[];
  try { files=fs.readdirSync(MAPS_DIR).filter(f=>f.toLowerCase().endsWith('.json')&&f.toLowerCase()!=='digtrade.json').sort((a,b)=>a.localeCompare(b)); }
  catch (error) { console.warn('[Diggerz] could not read maps folder:', error.message); return maps; }
  for (const file of files) {
    try {
      const raw=JSON.parse(fs.readFileSync(path.join(MAPS_DIR,file),'utf8'));
      const map=sanitizeMap(raw,file);
      if (!map) { console.warn(`[Diggerz] skipped invalid map ${file}`); continue; }
      maps.push(map);
    } catch (error) { console.warn(`[Diggerz] skipped map ${file}:`,error.message); }
  }
  return maps;
}

const customBattleMaps = loadCustomMaps();
let digTradeMap=null;
try {
  const file=path.join(MAPS_DIR,'digtrade.json');
  if(fs.existsSync(file)) digTradeMap=sanitizeMap(JSON.parse(fs.readFileSync(file,'utf8')),'digtrade.json');
  if(digTradeMap) console.log(`[Diggerz] loaded dedicated Dig+Trade map: ${digTradeMap.name}`);
} catch(error) { console.warn('[Diggerz] skipped digtrade.json:',error.message); digTradeMap=null; }

function pickBattleMap() {
  const rotation=[null,...customBattleMaps];
  if (rotation.length === 1) return null;
  let index=0,key='Default Map';
  for (let tries=0; tries<8; tries++) {
    index=Math.floor(Math.random()*rotation.length);
    key=rotation[index] ? rotation[index].name : 'Default Map';
    if (key!==lastBattleMapKey) break;
  }
  lastBattleMapKey=key;
  return rotation[index] || null;
}

function battleMapName(room) {
  return room && room.map ? room.map.name : 'Default Map';
}

function serveBuffer(res, buffer, contentType) {
  if (!buffer) { res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); res.end('Missing file.\n'); return; }
  res.writeHead(200,{'Content-Type':contentType,'Content-Length':buffer.length,'Cache-Control':'no-store'});
  res.end(buffer);
}

function writeFrame(client, frame, transient = false) {
  if (!client || client.closed || !client.socket.writable) return false;
  const backlog = Number(client.socket.writableLength || 0);
  if (backlog > MAX_SOCKET_HARD_BACKLOG_BYTES) {
    closeClient(client, 1013, 'client too slow');
    return false;
  }
  if (transient && backlog > MAX_SOCKET_BACKLOG_BYTES) {
    client.droppedTransient = (client.droppedTransient || 0) + 1;
    return false;
  }
  try { client.socket.write(frame); return true; }
  catch (error) { closeClient(client, 1011, 'send failed'); return false; }
}

function sendJson(client, payload, transient = false) {
  if (!client || client.closed || !client.socket.writable) return false;
  try {
    const frame = encodeFrame(Buffer.from(JSON.stringify(payload), 'utf8'), 0x1);
    return writeFrame(client, frame, transient);
  } catch (error) {
    closeClient(client, 1011, 'send failed');
    return false;
  }
}

function broadcastRoom(room, payload, exceptClient = null, transient = false) {
  if (!room) return;
  let frame;
  try { frame = encodeFrame(Buffer.from(JSON.stringify(payload), 'utf8'), 0x1); }
  catch { return; }
  for (const client of room.clients) if (client !== exceptClient) writeFrame(client, frame, transient);
}

function sendBinary(client, payload, transient = false) {
  if (!client || client.closed || !client.socket.writable) return false;
  try { return writeFrame(client, encodeFrame(payload, 0x2), transient); }
  catch (error) { closeClient(client, 1011, 'binary send failed'); return false; }
}

function relayBinary(client, payload) {
  if (!client.room) return;
  let opcode = 0;
  try { if (payload.length >= 2) opcode = payload.readUInt16LE(0); } catch {}
  const now = Date.now();
  if (opcode === 6) {
    if (now - (client.lastNativeMovementRelayAt || 0) < NATIVE_MOVEMENT_RELAY_MS) return;
    client.lastNativeMovementRelayAt = now;
  }
  let frame;
  try { frame = encodeFrame(payload, 0x2); } catch { return; }
  const transient = opcode === 6;
  for (const peer of client.room.clients) if (peer !== client) writeFrame(peer, frame, transient);
}

function roomSnapshot(room) {
  return [...room.clients].filter(client => client && !client.closed).map(client => ({
    connectionId: client.connectionId,
    name: client.name,
    mode: client.mode
  }));
}

function broadcastRoster(room) {
  if (!room) return;
  broadcastRoom(room, {
    t: 'room-roster',
    room: room.code,
    count: room.clients.size,
    max: MAX_ROOM_PLAYERS,
    players: roomSnapshot(room),
    serverNow: Date.now()
  });
}

function randomSpawnX(room) {
  const battle = room && room.battle;
  const left = battle ? battle.left : BATTLE_MIN_LEFT;
  const right = battle ? battle.right : BATTLE_MAX_RIGHT;
  const pad = Math.min(7, Math.max(2, Math.floor((right - left) / 8)));
  const lo = Math.min(right - 1, left + pad);
  const hi = Math.max(lo + 1, right - pad);
  return lo + Math.random() * Math.max(1, hi - lo);
}

function ensureRoomState(room) {
  if (!room.drops) room.drops = new Map();
  if (!room.tiles) room.tiles = new Map();
  if (!room.coins) room.coins = new Map();
  if (!room.cottonMachines) room.cottonMachines = new Map();
  if (!room.turretCooldowns) room.turretCooldowns = new Map();
  if (room.speaker === undefined) room.speaker = null;
  if (room.mode === 'pvp' && !room.battle) {
    room.battle = {
      phase: 'waiting',
      fightAt: 0,
      nextShrinkAt: 0,
      shrinkStage: 0,
      warningStage: 0,
      inset: 0,
      left: BATTLE_MIN_LEFT,
      right: BATTLE_MAX_RIGHT,
      elimination: false,
      winnerConnectionId: '',
      finishedAt: 0,
      preMatchTrack: -1,
      musicStartedAt: 0
    };
  }
  return room;
}

function battleSnapshot(room) {
  ensureRoomState(room);
  const b = room.battle;
  if (!b) return null;
  return {
    t: 'battle-state',
    phase: b.phase,
    fightAt: b.fightAt,
    nextShrinkAt: b.nextShrinkAt,
    shrinkStage: b.shrinkStage,
    inset: Number.isFinite(b.inset) ? b.inset : 0,
    left: b.left,
    right: b.right,
    elimination: !!b.elimination,
    winnerConnectionId: b.winnerConnectionId || '',
    preMatchTrack: Number.isFinite(b.preMatchTrack) ? b.preMatchTrack : -1,
    musicStartedAt: Number.isFinite(b.musicStartedAt) ? b.musicStartedAt : 0,
    serverNow: Date.now()
  };
}

function sendBattleState(client) {
  if (client && client.room && client.room.mode === 'pvp') sendJson(client, battleSnapshot(client.room));
}

function broadcastBattleState(room) {
  if (room && room.mode === 'pvp') broadcastRoom(room, battleSnapshot(room));
}

function battleJoinable(room) {
  if (!room || room.mode !== 'pvp') return true;
  ensureRoomState(room);
  return room.battle.phase === 'waiting' || room.battle.phase === 'build';
}

function startBattleBuild(room) {
  ensureRoomState(room);
  const b = room.battle;
  if (!b || b.phase !== 'waiting' || room.clients.size < 2) return;
  b.phase = 'build';
  b.fightAt = Date.now() + BATTLE_BUILD_MS;
  b.nextShrinkAt = 0;
  b.shrinkStage = 0;
  b.warningStage = 0;
  b.inset = 0;
  b.left = BATTLE_MIN_LEFT;
  b.right = BATTLE_MAX_RIGHT;
  b.elimination = false;
  b.winnerConnectionId = '';
  // Build 23.3: the server chooses one shared pre-match song per PvP round.
  // Clients use musicStartedAt for late-join synchronization and fade it for
  // the final three seconds before FIGHT.
  b.preMatchTrack = Math.floor(Math.random() * 4);
  b.musicStartedAt = Date.now();
  for (const c of room.clients) {
    c.pvpHealth = 3;
    c.alive = true;
    c.eliminated = false;
    c.kills = 0;
    c.shots = 0;
    c.hits = 0;
  }
  broadcastBattleState(room);
  broadcastRoom(room, { t:'battle-event', kind:'build-start', seconds:Math.max(1,Math.round(BATTLE_BUILD_MS/1000)), fightAt:b.fightAt, preMatchTrack:b.preMatchTrack, musicStartedAt:b.musicStartedAt, serverNow:Date.now() });
  log(`Battle ${room.code}: 40-second build phase started.`);
}

function beginBattleFight(room) {
  const b = room.battle;
  if (!b || b.phase !== 'build') return;
  b.phase = 'fight';
  b.nextShrinkAt = Date.now() + BATTLE_FIRST_SHRINK_MS;
  b.warningStage = 0;
  room.matchmaking = false;
  broadcastBattleState(room);
  broadcastRoom(room, { t:'battle-event', kind:'fight', serverNow:Date.now() });
  log(`Battle ${room.code}: FIGHT.`);
}

function playersRemaining(room) {
  let n = 0;
  for (const c of room.clients) if (!c.eliminated && c.alive) n++;
  return n;
}

function broadcastRemaining(room) {
  broadcastRoom(room, { t:'players-remaining', count:playersRemaining(room) });
}

function finishBattleIfNeeded(room) {
  if (!room || room.mode !== 'pvp' || !room.battle || !room.battle.elimination) return false;
  const alive = [...room.clients].filter(c => !c.eliminated && c.alive);
  if (alive.length !== 1) return false;
  const winner = alive[0], b = room.battle;
  if (b.phase === 'finished') return true;
  b.phase = 'finished';
  b.winnerConnectionId = winner.connectionId;
  b.finishedAt = Date.now();
  room.matchmaking = false;
  sendJson(winner, { t:'coin-award', amount:10, reason:'win' });
  broadcastRoom(room, { t:'winner', connectionId:winner.connectionId, name:winner.name, kills:winner.kills|0 });
  broadcastBattleState(room);
  log(`Battle ${room.code}: ${winner.name} wins with ${winner.kills|0} kills.`);
  return true;
}

function respawnBattleClient(client) {
  const room = client && client.room;
  if (!room || room.mode !== 'pvp' || !room.battle || room.battle.elimination || client.eliminated) return;
  client.pvpHealth = 3;
  client.alive = true;
  client.position = { x:randomSpawnX(room), y:2 };
  sendJson(client, { t:'force-respawn', x:client.position.x, y:client.position.y, health:3 });
  broadcastRoom(room, { t:'respawn', x:client.position.x, y:client.position.y, _serverFrom:client.connectionId, _serverName:client.name }, client);
}

function spawnKillCoin(room, x, y, killer) {
  ensureRoomState(room);
  const id = `COIN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const coin = { id, x:Number(x)||0, y:Number(y)||0, value:1, killerConnectionId:killer ? killer.connectionId : '' };
  room.coins.set(id, coin);
  broadcastRoom(room, { t:'coin-spawn', coin });
  return coin;
}

function eliminateOrRespawn(victim, attacker, source) {
  const room = victim.room;
  if (!room || room.mode !== 'pvp') return;
  ensureRoomState(room);
  if (!victim.alive) return;
  victim.alive = false;
  victim.pvpHealth = 0;
  const pos = victim.position || {x:12,y:16};
  broadcastRoom(room, { t:'death', x:pos.x, y:pos.y, _serverFrom:victim.connectionId, _serverName:victim.name });

  if (attacker && attacker !== victim && attacker.room === room) {
    attacker.kills = (attacker.kills|0) + 1;
    sendJson(attacker, { t:'kill-confirm', victimName:victim.name, kills:attacker.kills });
    broadcastRoom(room, { t:'kill-feed', killerName:attacker.name, killerConnectionId:attacker.connectionId, victimName:victim.name, victimConnectionId:victim.connectionId, kills:attacker.kills, source:String(source||'weapon') });
    spawnKillCoin(room, pos.x, pos.y - .35, attacker);
  }

  if (room.battle.elimination) {
    victim.eliminated = true;
    sendJson(victim, { t:'eliminated', killerName:attacker ? attacker.name : '', kills:victim.kills|0 });
    broadcastRemaining(room);
    finishBattleIfNeeded(room);
  } else {
    setTimeout(() => respawnBattleClient(victim), 1850).unref?.();
  }
}

function dealPvpDamage(attacker, victim, amount, source) {
  if (!attacker || !victim || attacker === victim || !attacker.room || attacker.room !== victim.room) return false;
  const room = attacker.room;
  if (room.mode !== 'pvp' || !room.battle || (room.battle.phase !== 'fight' && room.battle.phase !== 'elimination')) return false;
  if (!victim.alive || victim.eliminated) return false;
  const damage = Math.max(1, Math.min(3, Number(amount)|0));
  victim.lastAttackerConnectionId = attacker.connectionId;
  victim.lastDamagedAt = Date.now();
  victim.pvpHealth = Math.max(0, (victim.pvpHealth == null ? 3 : victim.pvpHealth) - damage);
  attacker.hits = (attacker.hits|0) + 1;
  sendJson(victim, { t:'damage', amount:damage, source:String(source||'weapon'), attackerConnectionId:attacker.connectionId, attackerName:attacker.name });
  sendJson(attacker, { t:'hit-confirm', targetConnectionId:victim.connectionId, targetName:victim.name, health:victim.pvpHealth });
  broadcastRoom(room, { t:'health', current:victim.pvpHealth, maximum:3, _serverFrom:victim.connectionId, _serverName:victim.name }, victim);
  if (victim.pvpHealth <= 0) eliminateOrRespawn(victim, attacker, source);
  return true;
}

function lineHitTarget(attacker, message) {
  const room = attacker.room;
  const fx=Number(message.fromX), fy=Number(message.fromY), tx=Number(message.toX), ty=Number(message.toY);
  if (![fx,fy,tx,ty].every(Number.isFinite)) return null;
  const vx=tx-fx, vy=ty-fy, vv=vx*vx+vy*vy;
  let best=null, bestT=2;
  for (const target of room.clients) {
    if (target===attacker || !target.alive || target.eliminated || !target.position) continue;
    const px=target.position.x, py=target.position.y;
    let t=vv>0?((px-fx)*vx+(py-fy)*vy)/vv:0;
    if (t<0 || t>1) continue;
    const cx=fx+vx*t, cy=fy+vy*t;
    if (Math.hypot(px-cx,py-cy)<=1.2 && t<bestT) {best=target;bestT=t;}
  }
  return best;
}

function impactHits(impactType, x, y, px, py) {
  const dx=px-x, dy=py-y;
  if (impactType===36) return Math.hypot(dx,dy)<=.95;
  if (impactType===30) return Math.abs(dx)<=.9 && Math.abs(dy)<=.9;
  if (impactType===24) return Math.abs(dx)<=1.7 && Math.abs(dy)<=1.7;
  if (impactType===38) return Math.abs(dx)<=2.8 && Math.abs(dy)<=2.8;
  if (impactType===40) return (Math.abs(dx)<=.8 && dy>=0 && dy<=3.4) || (Math.abs(dx)<=1.7 && Math.abs(dy-3)<=1.7);
  return Math.hypot(dx,dy)<=2.35;
}


function broadcastWorldSound(room, sound, x, y) {
  broadcastRoom(room,{t:'world-sound',sound:String(sound||''),x:Number(x)||0,y:Number(y)||0});
}

function spawnWorldCoin(room,x,y,value=1,reason='world') {
  ensureRoomState(room);
  const id=`COIN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const coin={id,x:Number(x)||0,y:Number(y)||0,value:Math.max(1,Number(value)|0),reason:String(reason||'world')};
  room.coins.set(id,coin);
  broadcastRoom(room,{t:'coin-spawn',coin});
  return coin;
}

const COTTON_ITEM_POOL=[93,139,248,276,326,327,328,329,370,371,215,110,112,114,117,138,154,155,156,157,190,312,313,328,329,330,331,332,333];
function cottonCandyReward(room,breaker,x,y) {
  const roll=Math.random();
  if (roll < .22) { spawnWorldCoin(room,x,y-.25,1,'cotton-candy'); return; }
  if (roll < .42 && breaker) {
    const id=COTTON_ITEM_POOL[Math.floor(Math.random()*COTTON_ITEM_POOL.length)];
    const category=id>=215 && ![248,276,326,327,328,329,370,371].includes(id) ? 1 : 2;
    sendJson(breaker,{t:'cotton-item-award',category,id,count:1,x,y:y-.25});
  }
}

function syncSpeaker(room) {
  broadcastRoom(room,{t:'speaker-state',speaker:room.speaker ? {...room.speaker} : null,serverNow:Date.now()});
}

function tickSpeaker(room,now) {
  if (!room || room.mode!=='digtrade' || !room.speaker || !room.speaker.on) return;
  const sp=room.speaker, duration=SPEAKER_TRACK_MS[sp.trackIndex|0]||60000;
  if (now-(sp.startedAt||now) >= duration) {
    sp.trackIndex=((sp.trackIndex|0)+1)%4;
    sp.startedAt=now;
    syncSpeaker(room);
  }
}

function findHighestCandySpace(room,x,machineY) {
  let y=machineY-1;
  for (;y>=1;y--) {
    const tile=room.tiles.get(`${x},${y}`);
    if (!tile || tile.id===0) return y;
    if (tile.id!==211) return -1;
  }
  return -1;
}

function tickCottonCandy(room,now) {
  if (!room || room.mode!=='digtrade') return;
  ensureRoomState(room);
  for (const [key,tile] of room.tiles) {
    if ((tile.id|0)!==212) continue;
    let next=room.cottonMachines.get(key);
    if (!next) { room.cottonMachines.set(key,now+COTTON_SPAWN_MS); continue; }
    if (now<next) continue;
    room.cottonMachines.set(key,now+COTTON_SPAWN_MS);
    const y=findHighestCandySpace(room,tile.x|0,tile.y|0);
    if (y<1) continue;
    const candy={x:tile.x|0,y,id:211,variant:(tile.variant|0)&3,ownerConnectionId:tile.ownerConnectionId||''};
    room.tiles.set(`${candy.x},${candy.y}`,candy);
    broadcastRoom(room,{t:'tile',x:candy.x,y:candy.y,id:211,variant:candy.variant,_serverFrom:'SERVER',_serverName:'Cotton Candy Machine'});
    broadcastWorldSound(room,'swap',candy.x,candy.y);
  }
  for (const key of [...room.cottonMachines.keys()]) {
    const tile=room.tiles.get(key); if(!tile || tile.id!==212) room.cottonMachines.delete(key);
  }
}

function allTurretTiles(room) {
  const out=[];
  if (room.map && Array.isArray(room.map.tiles)) for (const row of room.map.tiles) {
    const id=Number(row[2])|0; if(id===363||id===364||id===365) out.push({x:Number(row[0])|0,y:Number(row[1])|0,id,ownerConnectionId:''});
  }
  for (const tile of room.tiles.values()) if(tile && (tile.id===363||tile.id===364||tile.id===365)) out.push(tile);
  const unique=new Map(); for(const t of out) unique.set(`${t.x},${t.y}`,t); return [...unique.values()];
}

function tickTurrets(room,now) {
  if (!room || room.mode!=='pvp' || !room.battle || (room.battle.phase!=='fight'&&room.battle.phase!=='elimination')) return;
  ensureRoomState(room);
  for (const turret of allTurretTiles(room)) {
    const key=`${turret.x},${turret.y}`; if((room.turretCooldowns.get(key)||0)>now) continue;
    const owner=turret.ownerConnectionId?findRoomClient(room,turret.ownerConnectionId):null;
    const range=turret.id===364?20:18;
    let best=null,bestD=range+1;
    for(const target of room.clients){
      if(!target.alive||target.eliminated||!target.position||target===owner)continue;
      const d=Math.hypot(target.position.x-turret.x,target.position.y-turret.y);
      if(d<bestD){best=target;bestD=d;}
    }
    if(!best)continue;
    room.turretCooldowns.set(key,now+TURRET_FIRE_MS);
    broadcastRoom(room,{t:'turret-fire',x:turret.x+.5,y:turret.y-.45,toX:best.position.x,toY:best.position.y,variant:turret.id,ownerConnectionId:owner?owner.connectionId:''});
    if(owner) dealPvpDamage(owner,best,1,'turret');
    else {
      best.pvpHealth=Math.max(0,(best.pvpHealth==null?3:best.pvpHealth)-1);
      sendJson(best,{t:'damage',amount:1,source:'turret',attackerConnectionId:'',attackerName:'Swivel Turret'});
      broadcastRoom(room,{t:'health',current:best.pvpHealth,maximum:3,_serverFrom:best.connectionId,_serverName:best.name},best);
      if(best.pvpHealth<=0) eliminateOrRespawn(best,null,'turret');
    }
  }
}

function specialWorldTick(room,now){ tickSpeaker(room,now); tickCottonCandy(room,now); tickTurrets(room,now); }

function battleTick(room, now) {
  if (!room || room.mode !== 'pvp') return;
  ensureRoomState(room);
  const b=room.battle;
  if (b.phase==='waiting') { if (room.clients.size>=2) startBattleBuild(room); return; }
  if (b.phase==='build') { if (now>=b.fightAt) beginBattleFight(room); return; }
  if (b.phase!=='fight' && b.phase!=='elimination') return;
  if (b.nextShrinkAt && now>=b.nextShrinkAt-BATTLE_SHRINK_WARNING_MS && b.warningStage===b.shrinkStage) {
    b.warningStage=b.shrinkStage+1;
    broadcastRoom(room,{t:'battle-event',kind:'shrink-warning',stage:b.shrinkStage+1,shrinkAt:b.nextShrinkAt,serverNow:now});
  }
  if (b.nextShrinkAt && now>=b.nextShrinkAt) {
    b.shrinkStage++;
    // Match the recovered client R33.S37(inset) geometry exactly: the original
    // flashing walls sit at inset-.5 and WORLD_WIDTH-.5-inset.
    b.inset=Math.min(BATTLE_MAX_INSET,Math.max(0,b.shrinkStage*BATTLE_SHRINK_STEP));
    b.left=b.inset-0.5;
    b.right=WORLD_WIDTH-0.5-b.inset;
    if (b.shrinkStage===2 && !b.elimination) {
      // Anyone caught in a pre-elimination death gets the promised final respawn.
      for (const c of room.clients) if (!c.alive && !c.eliminated) respawnBattleClient(c);
      b.elimination=true;
      b.phase='elimination';
      broadcastRoom(room,{t:'battle-event',kind:'elimination',serverNow:now});
      broadcastRemaining(room);
    }
    broadcastRoom(room,{t:'battle-event',kind:'shrink',stage:b.shrinkStage,inset:b.inset,left:b.left,right:b.right,serverNow:now});
    b.nextShrinkAt=now+BATTLE_SHRINK_INTERVAL_MS;
    b.warningStage=b.shrinkStage;
    broadcastBattleState(room);
    finishBattleIfNeeded(room);
  }
}

function addClientToRoom(client, room, mode, name) {
  ensureRoomState(room);
  client.room = room;
  client.roomCode = room.code;
  client.mode = mode;
  client.name = name;
  client.pvpHealth = 3;
  client.alive = true;
  client.eliminated = false;
  client.kills = 0;
  client.shots = 0;
  client.hits = 0;
  client.position = { x: randomSpawnX(room), y: 2 };
  room.clients.add(client);

  sendJson(client, {
    t: 'welcome', connectionId: client.connectionId, room: room.code, mode,
    count: room.clients.size, max: MAX_ROOM_PLAYERS, players: roomSnapshot(room)
  });

  sendJson(client, {
    t: 'room-state', room: room.code,
    map: room.map || null,
    mapName: room.map ? String(room.map.name||'Custom Map') : (room.mode==='pvp' ? battleMapName(room) : 'Default Dig+Trade'),
    tiles: [...room.tiles.values()], drops: [...room.drops.values()], coins: [...room.coins.values()], speaker: room.speaker ? {...room.speaker} : null, serverNow: Date.now()
  });
  if (mode === 'pvp') sendBattleState(client);

  broadcastRoom(room, { t:'player-count', room:room.code, count:room.clients.size, max:MAX_ROOM_PLAYERS });
  broadcastRoster(room);
  log(`${client.connectionId} (${name}) joined ${room.code}. ${room.clients.size}/${MAX_ROOM_PLAYERS}`);

  // room-ready is a one-time transition. Broadcasting it again for player 3,
  // 4, 5, ... caused every browser to resend hello/spawn packets in a burst.
  if (room.clients.size === 2) {
    broadcastRoom(room, { t:'room-ready', room:room.code, mode, count:room.clients.size });
    log(`Room ${room.code} READY.`);
    if (mode === 'pvp') startBattleBuild(room);
  }
}

function matchmake(client, message) {
  if (client.room) {
    sendJson(client, { t: 'server-error', code: 'already-joined', message: 'This connection is already in matchmaking.' });
    return;
  }

  const mode = normalizeMode(message.mode);
  const name = normalizeName(message.name);
  client.clientId = normalizeClientId(message.clientId);
  const activeBan = activeBanFor(client, name, client.clientId);
  if (activeBan) {
    sendJson(client, Object.assign({ t:'banned', serverNow:Date.now() }, publicBan(activeBan)));
    setTimeout(() => closeClient(client, 1008, 'banned'), 180).unref?.();
    return;
  }
  let room = null;

  for (const candidate of rooms.values()) {
    if (candidate.matchmaking && candidate.mode === mode && candidate.clients.size < MAX_ROOM_PLAYERS && battleJoinable(candidate)) {
      room = candidate;
      break;
    }
  }

  if (!room) {
    let code;
    do {
      code = `AUTO${(nextMatchNumber++).toString(36).toUpperCase().padStart(6, '0')}`;
    } while (rooms.has(code));
    room = {
      code,
      mode,
      clients: new Set(),
      createdAt: Date.now(),
      matchmaking: true,
      drops: new Map(),
      tiles: new Map(),
      map: mode === 'pvp' ? pickBattleMap() : (mode === 'digtrade' ? digTradeMap : null)
    };
    rooms.set(code, room);
    log(`Automatic ${mode} match ${code} created${mode === 'pvp' ? ` on ${battleMapName(room)}` : ''}.`);
  }

  rememberPlayer(client, name, client.clientId);
  addClientToRoom(client, room, mode, name);
}

function joinRoom(client, message) {
  if (client.room) {
    sendJson(client, { t: 'server-error', code: 'already-joined', message: 'This connection already joined a room.' });
    return;
  }

  const roomCode = normalizeRoom(message.room);
  const mode = normalizeMode(message.mode);
  const name = normalizeName(message.name);
  client.clientId = normalizeClientId(message.clientId);
  const activeBan = activeBanFor(client, name, client.clientId);
  if (activeBan) {
    sendJson(client, Object.assign({ t:'banned', serverNow:Date.now() }, publicBan(activeBan)));
    setTimeout(() => closeClient(client, 1008, 'banned'), 180).unref?.();
    return;
  }

  if (roomCode.length < 4) {
    sendJson(client, { t: 'server-error', code: 'bad-room', message: 'Room codes must be at least 4 letters/numbers.' });
    return;
  }

  let room = rooms.get(roomCode);
  if (!room) {
    if (message.role === 'join') {
      sendJson(client, { t: 'server-error', code: 'room-not-found', message: `Room ${roomCode} does not exist yet.` });
      return;
    }
    room = {
      code: roomCode,
      mode,
      clients: new Set(),
      createdAt: Date.now(),
      drops: new Map(),
      tiles: new Map(),
      map: mode === 'pvp' ? pickBattleMap() : (mode === 'digtrade' ? digTradeMap : null)
    };
    rooms.set(roomCode, room);
    log(`Room ${roomCode} created (${mode})${mode === 'pvp' ? ` on ${battleMapName(room)}` : ''}.`);
  }

  if (room.mode !== mode) {
    sendJson(client, { t: 'server-error', code: 'mode-mismatch', message: `Room ${roomCode} is ${room.mode}, not ${mode}.` });
    return;
  }

  if (mode === 'pvp' && !battleJoinable(room)) {
    sendJson(client, { t:'server-error', code:'match-in-progress', message:`Room ${roomCode} already started fighting.` });
    return;
  }

  if (room.clients.size >= MAX_ROOM_PLAYERS) {
    sendJson(client, { t: 'server-error', code: 'room-full', message: `Room ${roomCode} already has ${MAX_ROOM_PLAYERS} players.` });
    return;
  }

  rememberPlayer(client, name, client.clientId);
  addClientToRoom(client, room, mode, name);
}

function findRoomClient(room, connectionId) {
  if (!room || !connectionId) return null;
  for (const c of room.clients) if (c.connectionId === connectionId) return c;
  return null;
}

function guidKey(parts) {
  if (!Array.isArray(parts) || parts.length < 4) return '';
  return parts.slice(0, 4).map(v => Number(v) | 0).join(':');
}

function sanitizeItem(item) {
  if (!item || typeof item !== 'object') return null;
  const category = Number(item.category) | 0;
  const id = Number(item.id) | 0;
  const count = Math.max(0, Math.min(65535, Number(item.count) | 0));
  if ((category !== 1 && category !== 2) || id <= 0 || id > 2047 || count <= 0) return null;
  return { category, id, variant: (Number(item.variant) | 0) & 31, count, extra: Number(item.extra) | 0, text: String(item.text || '').slice(0, 180) };
}

function sanitizeOffer(offer) {
  const out = [];
  for (const item of Array.isArray(offer) ? offer.slice(0, 3) : []) {
    const clean = sanitizeItem(item);
    out.push(clean || { category:0,id:0,variant:0,count:0,extra:0,text:'' });
  }
  while (out.length < 3) out.push({ category:0,id:0,variant:0,count:0,extra:0,text:'' });
  return out;
}

function cancelTrade(client, reason = 'Cancelled.') {
  if (!client || !client.trade) return;
  const trade = client.trade;
  const partner = findRoomClient(client.room, trade.partnerConnectionId);
  client.trade = null;
  sendJson(client, { t:'trade-cancelled', tradeId:trade.id, reason });
  if (partner && partner.trade && partner.trade.id === trade.id) {
    partner.trade = null;
    sendJson(partner, { t:'trade-cancelled', tradeId:trade.id, reason });
  }
}

function beginTrade(client, target) {
  if (!client.room || !target || target === client || client.room.mode !== 'digtrade') return;
  if (client.trade) cancelTrade(client, 'A new trade started.');
  if (target.trade) cancelTrade(target, 'A new trade started.');
  const id = `TR${(nextTradeNumber++).toString(36).toUpperCase().padStart(6,'0')}`;
  const makeState = partnerConnectionId => ({
    id, partnerConnectionId, accepted:false, confirmed:false,
    offer:sanitizeOffer([]), reviewToken:'', revision:0
  });
  client.trade = makeState(target.connectionId);
  target.trade = makeState(client.connectionId);
  sendJson(client, { t:'trade-start', tradeId:id, partnerConnectionId:target.connectionId, partnerName:target.name });
  sendJson(target, { t:'trade-start', tradeId:id, partnerConnectionId:client.connectionId, partnerName:client.name });
}

function tradePartner(client) {
  if (!client || !client.trade || !client.room) return null;
  const partner=findRoomClient(client.room,client.trade.partnerConnectionId);
  return partner && partner.trade && partner.trade.id===client.trade.id ? partner : null;
}

function resetTradeReview(client, partner, reason='Trade changed.') {
  if (!client || !client.trade) return;
  const id=client.trade.id;
  const hadReview=!!client.trade.reviewToken || !!(partner && partner.trade && partner.trade.reviewToken);
  const hadAcceptance=!!client.trade.accepted || !!(partner && partner.trade && partner.trade.accepted);
  client.trade.accepted=false; client.trade.confirmed=false; client.trade.reviewToken='';
  if (partner && partner.trade && partner.trade.id===id) {
    partner.trade.accepted=false; partner.trade.confirmed=false; partner.trade.reviewToken='';
  }
  if (hadReview || hadAcceptance) {
    sendJson(client,{t:'trade-review-close',tradeId:id,reason});
    if (partner) sendJson(partner,{t:'trade-review-close',tradeId:id,reason});
  }
}

function openTradeReview(client, partner) {
  if (!client || !partner || !client.trade || !partner.trade || client.trade.id!==partner.trade.id) return;
  const token=`RV-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
  client.trade.reviewToken=token; partner.trade.reviewToken=token;
  client.trade.confirmed=false; partner.trade.confirmed=false;
  sendJson(client,{t:'trade-review',tradeId:client.trade.id,reviewToken:token,receive:partner.trade.offer});
  sendJson(partner,{t:'trade-review',tradeId:partner.trade.id,reviewToken:token,receive:client.trade.offer});
}

function completeTrade(client, partner) {
  if (!client || !partner || !client.trade || !partner.trade || client.trade.id!==partner.trade.id) return;
  const id=client.trade.id,aOffer=client.trade.offer,bOffer=partner.trade.offer;
  client.trade=null; partner.trade=null;
  sendJson(client,{t:'trade-complete',tradeId:id,receive:bOffer});
  sendJson(partner,{t:'trade-complete',tradeId:id,receive:aOffer});
}

function relayGameMessage(client, message, rawLength) {
  if (!client.room) {
    sendJson(client, { t:'server-error', code:'not-joined', message:'Join a room before sending game data.' });
    return;
  }
  if (rawLength > MAX_MESSAGE_BYTES) { closeClient(client,1009,'message too large'); return; }
  const room=client.room;
  ensureRoomState(room);
  const envelope=Object.assign({},message,{_serverFrom:client.connectionId,_serverName:client.name});

  if (message.t==='state') {
    let x=Number(message.x), y=Number(message.y);
    if (Number.isFinite(x)&&Number.isFinite(y)) {
      if(room.mode==='pvp'&&room.battle&&(room.battle.phase==='fight'||room.battle.phase==='elimination')){
        x=Math.max(room.battle.left+.45,Math.min(room.battle.right-.45,x));
      } else x=Math.max(-20,Math.min(WORLD_WIDTH+20,x));
      client.position={x,y:Math.max(-30,Math.min(120,y))};
      // Native packets remain the primary movement path, but this canonical
      // JSON fallback lets peers repair a remote player that fell behind after
      // tab throttling or a missed binary packet.
      broadcastRoom(room,{t:'peer-state',x:client.position.x,y:client.position.y,_serverFrom:client.connectionId,_serverName:client.name},client,true);
    }
    return;
  }

  if (message.t==='aim') {
    // Build 23.3 hotfix: cursor-follow animation belongs to held weapons, not
    // mining tools. Patched clients explicitly mark weapon aim packets.
    if (message.weapon !== true) return;
    const x=Number(message.x), y=Number(message.y);
    if (!Number.isFinite(x)||!Number.isFinite(y)) return;
    client.aim={x,y};
    broadcastRoom(room,{t:'aim',x,y,weapon:true,_serverFrom:client.connectionId,_serverName:client.name},client,true);
    return;
  }

  if (message.t==='attack') {
    if (room.mode==='pvp') {
      const b=room.battle;
      if (!b || (b.phase!=='fight'&&b.phase!=='elimination') || !client.alive || client.eliminated) {
        sendJson(client,{t:'fire-blocked'});
        return;
      }
      client.shots=(client.shots|0)+1;
      broadcastRoom(room,envelope,client); // projectile / weapon visuals
      const attackType=Number(message.attackType)|0;
      if (!PROJECTILE_ATTACKS.has(attackType)) {
        const target=lineHitTarget(client,message);
        if (target) dealPvpDamage(client,target,1,'weapon');
      }
      return;
    }
    // Free Dig / Dig+Trade is intentionally non-combat. Do not relay weapon
    // attacks even if an older or modified client manages to send one.
    if (room.mode==='digtrade') {
      sendJson(client,{t:'freedig-fire-blocked'});
      return;
    }
    broadcastRoom(room,envelope,client);
    return;
  }

  if (message.t==='tool-attack') {
    if (room.mode!=='pvp' || !room.battle || (room.battle.phase!=='fight'&&room.battle.phase!=='elimination') || !client.alive || client.eliminated) return;
    const itemId=Number(message.itemId)|0;
    if(itemId!==239 && !(itemId>=379&&itemId<=394)) return;
    const fx=Number(message.fromX),fy=Number(message.fromY),tx=Number(message.toX),ty=Number(message.toY);
    if(![fx,fy,tx,ty].every(Number.isFinite))return;
    // Tool weapons are melee. Clamp their PvP reach even if a modified client
    // reports a farther mouse coordinate.
    const dx=tx-fx,dy=ty-fy,len=Math.hypot(dx,dy)||1,maxReach=itemId===239?3.2:3.0;
    const clipped=Object.assign({},message,{fromX:fx,fromY:fy,toX:fx+dx*Math.min(1,maxReach/len),toY:fy+dy*Math.min(1,maxReach/len)});
    client.shots=(client.shots|0)+1;
    const target=lineHitTarget(client,clipped);
    if(target)dealPvpDamage(client,target,1,itemId===239?'excalibur':'lightsword');
    broadcastRoom(room,{t:'tool-attack',fromX:clipped.fromX,fromY:clipped.fromY,toX:clipped.toX,toY:clipped.toY,itemId,attackType:Number(message.attackType)|0,_serverFrom:client.connectionId,_serverName:client.name},client);
    return;
  }

  if (message.t==='impact') {
    if (room.mode!=='pvp' || !room.battle || (room.battle.phase!=='fight'&&room.battle.phase!=='elimination') || !client.alive || client.eliminated) return;
    const x=Number(message.x),y=Number(message.y),impactType=Number(message.impactType)|0;
    if (!Number.isFinite(x)||!Number.isFinite(y)) return;
    for (const target of room.clients) {
      if (target===client || !target.alive || target.eliminated || !target.position) continue;
      if (impactHits(impactType,x,y,target.position.x,target.position.y)) dealPvpDamage(client,target,1,'projectile');
    }
    return;
  }

  if (message.t==='death') {
    if (room.mode==='pvp') {
      if (client.alive) {
        let attacker=null, source=message.source||'hazard';
        if ((client.adminKilledUntil||0)>Date.now()) { source='admin'; client.adminKilledUntil=0; }
        else if (client.lastAttackerConnectionId && Date.now()-(client.lastDamagedAt||0)<6000) attacker=findRoomClient(room,client.lastAttackerConnectionId);
        eliminateOrRespawn(client,attacker,source);
      }
      return;
    }
    broadcastRoom(room,envelope,client); return;
  }

  if (message.t==='respawn') {
    if (room.mode==='pvp') {
      if (room.battle && room.battle.elimination) return;
      client.pvpHealth=3;client.alive=true;client.eliminated=false;
      const x=Number(message.x),y=Number(message.y);if(Number.isFinite(x)&&Number.isFinite(y))client.position={x,y};
      broadcastRoom(room,envelope,client);return;
    }
    broadcastRoom(room,envelope,client);return;
  }

  if (message.t==='coin-pickup') {
    const id=String(message.id||''),coin=room.coins.get(id);if(!coin||!client.position)return;
    if(!client.alive||client.eliminated)return;
    if(Math.hypot(client.position.x-coin.x,client.position.y-coin.y)>2.2)return;
    room.coins.delete(id);
    sendJson(client,{t:'coin-award',amount:Math.max(1,coin.value|0),reason:'kill-drop'});
    broadcastRoom(room,{t:'coin-remove',id});
    return;
  }

  if (ALLOWED_RELAY_TYPES.has(message.t)) { broadcastRoom(room,envelope,client); return; }

  if (message.t==='tile') {
    const tile={x:Number(message.x)|0,y:Number(message.y)|0,id:Number(message.id)|0,variant:Number(message.variant)|0,ownerConnectionId:client.connectionId};
    if(tile.x<0||tile.x>=128||tile.y<0||tile.y>=80)return;
    const key=`${tile.x},${tile.y}`, prior=room.tiles.get(key);
    if(room.mode==='digtrade'&&tile.id===122){
      if(room.speaker && (room.speaker.x!==tile.x||room.speaker.y!==tile.y)){
        sendJson(client,{t:'speaker-place-blocked',x:tile.x,y:tile.y,tile:prior?{id:prior.id|0,variant:prior.variant|0}:{id:0,variant:0}});return;
      }
      room.speaker={x:tile.x,y:tile.y,on:false,trackIndex:0,startedAt:0,ownerConnectionId:client.connectionId};
    }
    room.tiles.set(key,tile);
    if(tile.id===0){
      if(prior&&prior.id===122&&room.speaker&&room.speaker.x===tile.x&&room.speaker.y===tile.y)room.speaker=null;
      room.cottonMachines.delete(key);room.turretCooldowns.delete(key);
    }
    broadcastRoom(room,Object.assign({t:'tile'},tile,{_serverFrom:client.connectionId,_serverName:client.name}));
    if((prior&&prior.id===122)||tile.id===122)syncSpeaker(room);
    return;
  }

  if(message.t==='speaker-toggle'){
    if(room.mode!=='digtrade'||!room.speaker)return;
    const x=Number(message.x)|0,y=Number(message.y)|0;if(room.speaker.x!==x||room.speaker.y!==y)return;
    room.speaker.on=!room.speaker.on;
    if(room.speaker.on){room.speaker.trackIndex=(room.speaker.trackIndex|0)%4;room.speaker.startedAt=Date.now();}
    else room.speaker.startedAt=0;
    syncSpeaker(room);return;
  }

  if(message.t==='special-break'){
    const x=Number(message.x)|0,y=Number(message.y)|0,key=`${x},${y}`,tile=room.tiles.get(key);if(!tile)return;
    const id=tile.id|0;if(id!==211&&id!==127&&id!==212)return;
    room.tiles.set(key,{x,y,id:0,variant:0,ownerConnectionId:client.connectionId});
    broadcastRoom(room,{t:'tile',x,y,id:0,variant:0,_serverFrom:client.connectionId,_serverName:client.name});
    if(id===211){broadcastWorldSound(room,'balloon_pop',x,y);cottonCandyReward(room,client,x,y);}
    else if(id===127){spawnWorldCoin(room,x,y-.25,10,'trading-chip');}
    else if(id===212){room.cottonMachines.delete(key);}
    return;
  }

  if (message.t==='drop-spawn') {
    const d=message.drop||{},key=guidKey(d.guid),item=sanitizeItem(d);if(!key||!item)return;
    const drop=Object.assign(item,{guid:d.guid.slice(0,4).map(v=>Number(v)|0),x:Number(d.x)||0,y:Number(d.y)||0,tier:String(d.tier||'').slice(0,16)});
    room.drops.set(key,drop);
    broadcastRoom(room,{t:'drop-spawn',drop,_serverFrom:client.connectionId,_serverName:client.name},client);return;
  }

  if (message.t==='drop-pickup') {
    const key=guidKey(message.guid),drop=room.drops.get(key);if(!drop)return;
    room.drops.delete(key);sendJson(client,{t:'drop-award',drop});broadcastRoom(room,{t:'drop-remove',guid:drop.guid});return;
  }

  if (message.t==='damage') {
    // PvP damage is authoritative in Build 23.3. Ignore old client-side hit guesses.
    if (room.mode==='pvp') return;
    const target=findRoomClient(room,String(message.targetConnectionId||''));if(!target||target===client)return;sendJson(target,envelope);return;
  }

  if (message.t==='admin-message') {
    if(!verifyAdminSessionToken(message.adminToken,client)){sendJson(client,{t:'server-error',code:'admin-auth',message:'Admin authentication failed.'});return;}
    const text=String(message.message||'').replace(/[\x00-\x1F\x7F]/g,' ').trim().slice(0,180);
    if(!text)return;
    const payload={t:'admin-message',message:text,scope:message.scope==='global'?'global':'server',_serverFrom:client.connectionId,_serverName:client.name};
    if(payload.scope==='global'){
      for(const targetRoom of rooms.values())broadcastRoom(targetRoom,payload,targetRoom===room?client:null);
    }else broadcastRoom(room,payload,client);
    log(`Admin ${client.name} sent ${payload.scope} message: ${text}`);
    return;
  }

  if (message.t==='admin-item'||message.t==='admin-coins'||message.t==='admin-kill') {
    if(!verifyAdminSessionToken(message.adminToken,client)){sendJson(client,{t:'server-error',code:'admin-auth',message:'Admin authentication failed.'});return;}
    const target=findRoomClient(room,String(message.targetConnectionId||''));if(!target)return;
    if(message.t==='admin-kill'){
      target.lastAttackerConnectionId=''; target.lastDamagedAt=0; target.adminKilledUntil=Date.now()+4000;
    }
    sendJson(target,envelope);return;
  }

  if (message.t==='trade-request') {
    if (room.mode!=='digtrade') return;
    const target=findRoomClient(room,String(message.targetConnectionId||''));if(!target||target===client)return;beginTrade(client,target);return;
  }
  if (message.t==='trade-offer') {
    if(!client.trade||client.trade.id!==message.tradeId)return;
    const partner=tradePartner(client);
    if(!partner){cancelTrade(client,'Player disconnected.');return;}
    resetTradeReview(client,partner,'Trade changed.');
    client.trade.offer=sanitizeOffer(message.offer);
    client.trade.revision=(client.trade.revision|0)+1;
    sendJson(partner,{t:'trade-offer',tradeId:client.trade.id,offer:client.trade.offer,_serverFrom:client.connectionId,_serverName:client.name});
    return;
  }
  if (message.t==='trade-accept') {
    if(!client.trade||client.trade.id!==message.tradeId)return;
    const partner=tradePartner(client);
    if(!partner){cancelTrade(client,'Player disconnected.');return;}
    client.trade.accepted=true; client.trade.confirmed=false;
    sendJson(partner,{t:'trade-partner-accepted',tradeId:client.trade.id});
    if(partner.trade.accepted) openTradeReview(client,partner);
    return;
  }
  if (message.t==='trade-confirm') {
    if(!client.trade||client.trade.id!==message.tradeId)return;
    const partner=tradePartner(client);
    if(!partner){cancelTrade(client,'Player disconnected.');return;}
    const token=String(message.reviewToken||'');
    if(!client.trade.accepted||!partner.trade.accepted||!token||token!==client.trade.reviewToken||token!==partner.trade.reviewToken){
      resetTradeReview(client,partner,'Trade changed before confirmation.');
      return;
    }
    client.trade.confirmed=true;
    if(partner.trade.confirmed) completeTrade(client,partner);
    return;
  }
  if (message.t==='trade-review-back') {
    if(!client.trade||client.trade.id!==message.tradeId)return;
    const partner=tradePartner(client);
    resetTradeReview(client,partner,'Editing resumed.');
    return;
  }
  if(message.t==='trade-cancel'){if(client.trade&&client.trade.id===message.tradeId)cancelTrade(client,'Cancelled.');return;}
}

function onTextMessage(client, text) {
  const now = Date.now();
  if (now - client.rateWindow >= 1000) {
    client.rateWindow = now;
    client.rateCount = 0;
  }
  client.rateCount++;
  if (client.rateCount > MAX_MESSAGES_PER_SECOND) {
    closeClient(client, 1008, 'rate limit');
    return;
  }

  let message;
  try {
    message = JSON.parse(text);
  } catch {
    sendJson(client, { t: 'server-error', code: 'bad-json', message: 'Invalid JSON message.' });
    return;
  }
  if (!message || typeof message !== 'object') return;

  if (message.t === 'matchmake') {
    matchmake(client, message);
    return;
  }

  if (message.t === 'join') {
    joinRoom(client, message);
    return;
  }

  if (message.t === 'ping') {
    sendJson(client, { t: 'pong', at: Date.now() });
    return;
  }

  relayGameMessage(client, message, Buffer.byteLength(text, 'utf8'));
}

function leaveRoom(client) {
  const room = client.room;
  if (!room) return;

  if (client.trade) cancelTrade(client, 'Player disconnected.');
  room.clients.delete(client);
  client.room = null;

  broadcastRoom(room, {
    t: 'peer-left',
    connectionId: client.connectionId,
    name: client.name,
    count: room.clients.size
  });

  broadcastRoom(room, {
    t: 'player-count',
    room: room.code,
    count: room.clients.size,
    max: MAX_ROOM_PLAYERS
  });
  broadcastRoster(room);

  log(`${client.connectionId} left ${room.code}. ${room.clients.size}/${MAX_ROOM_PLAYERS}`);

  if (room.mode === 'pvp' && room.battle && room.battle.elimination) { broadcastRemaining(room); finishBattleIfNeeded(room); }

  if (room.clients.size === 0) {
    rooms.delete(room.code);
    log(`Room ${room.code} removed.`);
  }
}

function closeClient(client, code = 1000, reason = '') {
  if (!client || client.closed) return;
  client.closed = true;
  leaveRoom(client);
  try {
    if (client.socket.writable) client.socket.write(encodeCloseFrame(code, reason));
  } catch {}
  try { client.socket.end(); } catch {}
  try { client.socket.destroy(); } catch {}
}

function encodeFrame(payload, opcode = 0x1) {
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.allocUnsafe(2);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = length;
  } else if (length <= 0xffff) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  return Buffer.concat([header, payload]);
}

function encodeCloseFrame(code, reason) {
  const reasonBuffer = Buffer.from(String(reason || '').slice(0, 100), 'utf8');
  const payload = Buffer.allocUnsafe(2 + reasonBuffer.length);
  payload.writeUInt16BE(code, 0);
  reasonBuffer.copy(payload, 2);
  return encodeFrame(payload, 0x8);
}

function parseFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);

  while (client.buffer.length >= 2) {
    const b0 = client.buffer[0];
    const b1 = client.buffer[1];
    const fin = (b0 & 0x80) !== 0;
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let length = b1 & 0x7f;
    let offset = 2;

    if (!fin) {
      closeClient(client, 1003, 'fragmented frames unsupported');
      return;
    }

    if (length === 126) {
      if (client.buffer.length < 4) return;
      length = client.buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (client.buffer.length < 10) return;
      const bigLength = client.buffer.readBigUInt64BE(2);
      if (bigLength > BigInt(MAX_MESSAGE_BYTES)) {
        closeClient(client, 1009, 'frame too large');
        return;
      }
      length = Number(bigLength);
      offset = 10;
    }

    if (length > MAX_MESSAGE_BYTES) {
      closeClient(client, 1009, 'frame too large');
      return;
    }

    if (!masked) {
      closeClient(client, 1002, 'client frames must be masked');
      return;
    }

    if (client.buffer.length < offset + 4 + length) return;

    const mask = client.buffer.subarray(offset, offset + 4);
    offset += 4;
    const payload = Buffer.from(client.buffer.subarray(offset, offset + length));
    client.buffer = client.buffer.subarray(offset + length);

    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];

    if (opcode === 0x8) {
      closeClient(client, 1000, 'client closed');
      return;
    }
    if (opcode === 0x9) {
      try { client.socket.write(encodeFrame(payload, 0xA)); } catch {}
      continue;
    }
    if (opcode === 0xA) {
      client.lastPong = Date.now();
      continue;
    }
    if (opcode === 0x2) {
      const now=Date.now();
      if(now-client.binaryRateWindow>=1000){client.binaryRateWindow=now;client.binaryRateCount=0;}
      client.binaryRateCount++;
      if(client.binaryRateCount>MAX_MESSAGES_PER_SECOND){closeClient(client,1008,'binary rate limit');return;}
      if (!client.room) { sendJson(client, { t: 'server-error', code: 'not-joined', message: 'Join matchmaking before sending Diggerz packets.' }); continue; }
      relayBinary(client, payload);
      continue;
    }
    if (opcode !== 0x1) continue;

    onTextMessage(client, payload.toString('utf8'));
  }
}

function applySecurityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  // Build 23.8: allow the Railway-hosted game to be embedded only by itch.io.
  // Do not send X-Frame-Options here because DENY/SAMEORIGIN would override
  // the intended cross-origin itch.io embedding in modern browsers.
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://itch.io https://*.itch.io https://*.itch.zone; object-src 'none'; base-uri 'self'");
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function sendApiJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Content-Length':body.length, 'Cache-Control':'no-store' });
  res.end(body);
}

function readJsonBody(req, maxBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks=[]; let total=0;
    req.on('data', chunk => { total += chunk.length; if (total > maxBytes) { reject(new Error('body too large')); try { req.destroy(); } catch {} return; } chunks.push(chunk); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('invalid json')); } });
    req.on('error', reject);
  });
}

function sameOriginRequest(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    if (parsed.host === String(req.headers.host || '')) return true;
    return parsed.protocol === 'https:' && (parsed.hostname === 'itch.zone' || parsed.hostname.endsWith('.itch.zone'));
  } catch { return false; }
}

function applyAdminCors(req, res) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  if (!sameOriginRequest(req)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return true;
}

function adminSessionForRequest(req) {
  return adminSessionFromToken(adminTokenFromRequest(req), getRemoteIp(req));
}

function banPageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>banned</title><style>html,body{margin:0;width:100%;height:100%;background:#000;color:#d40000;font-family:Arial,Helvetica,sans-serif}body{display:flex;align-items:center;justify-content:center;text-align:center}.wrap{width:min(900px,90vw)}.title,.reason{font-size:clamp(18px,2.6vw,30px);text-transform:lowercase}.timer{margin:28px 0;font-size:clamp(28px,5vw,64px);font-weight:800;line-height:1.15}.reason{word-break:break-word}</style></head><body><main class="wrap"><div class="title">you have been banned</div><div class="timer" id="timer"></div><div class="reason" id="reason"></div></main><script>(function(){var KEY='diggerz.resurrection.activeBan.v1',raw=null;try{raw=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){};if(!raw){location.replace('/');return}document.getElementById('reason').textContent='reason: '+String(raw.reason||'no reason provided.').toLowerCase();var el=document.getElementById('timer');function pad(n){n=Math.max(0,Math.floor(n));return n<10?'0'+n:String(n)}function render(){if(raw.permanent){el.textContent='PERMANENT';return}var left=Math.max(0,Math.floor((Number(raw.expiresAt||0)-Date.now())/1000));if(left<=0){try{localStorage.removeItem(KEY)}catch(e){}location.replace('/');return}var year=365*24*3600,month=30*24*3600,week=7*24*3600,day=24*3600,hour=3600;var years=Math.floor(left/year);left%=year;var months=Math.floor(left/month);left%=month;var weeks=Math.floor(left/week);left%=week;var days=Math.floor(left/day);left%=day;var hours=Math.floor(left/hour);left%=hour;var seconds=left;el.textContent=pad(seconds)+' seconds '+pad(hours)+' hours '+pad(days)+' days '+pad(weeks)+' weeks '+pad(months)+' months '+pad(years)+' years'}render();setInterval(render,1000)})();</script></body></html>`;
}

async function handleAdminApi(req, res, urlPath) {
  if (!sameOriginRequest(req)) { sendApiJson(res,403,{ok:false,error:'forbidden'}); return true; }
  const ip = getRemoteIp(req);
  if (urlPath === '/api/admin/auth' && req.method === 'POST') {
    const state = authAttemptState(ip);
    if (state.blockedUntil > Date.now()) { sendApiJson(res,429,{ok:false,error:'too-many-attempts',retryAt:state.blockedUntil}); return true; }
    let body; try { body = await readJsonBody(req,4096); } catch { sendApiJson(res,400,{ok:false,error:'bad-request'}); return true; }
    const role = adminRoleForCode(body && body.code);
    if (!role) {
      const after = recordAdminAuthFailure(ip);
      sendApiJson(res,403,{ok:false,error:'invalid-admin-code',remaining:Math.max(0,ADMIN_MAX_FAILURES-after.failures)});
      return true;
    }
    clearAdminAuthFailures(ip);
    const session = issueAdminSession(role,ip);
    log(`Admin ${role} session authenticated from ${ip}.`);
    sendApiJson(res,200,{ok:true,role:session.role,token:session.token,expiresAt:session.expiresAt});
    return true;
  }
  if (urlPath === '/api/admin/bans' && req.method === 'GET') {
    const session = adminSessionForRequest(req); if (!session) { sendApiJson(res,401,{ok:false,error:'admin-auth'}); return true; }
    pruneExpiredBans(true);
    sendApiJson(res,200,{ok:true,bans:bans.map(publicBan)}); return true;
  }
  if (urlPath === '/api/admin/donations' && req.method === 'GET') {
    const session = adminSessionForRequest(req);
    if (!session) { sendApiJson(res,401,{ok:false,error:'admin-auth'}); return true; }
    sendApiJson(res,200,Object.assign({ok:true},publicDonationBoard()));
    return true;
  }
  if (urlPath === '/api/admin/donations' && req.method === 'POST') {
    const session = adminSessionForRequest(req);
    if (!session) { sendApiJson(res,401,{ok:false,error:'admin-auth'}); return true; }
    let body;
    try { body = await readJsonBody(req,8192); }
    catch { sendApiJson(res,400,{ok:false,error:'bad-request'}); return true; }
    const action = String(body && body.action || 'add');
    if (action === 'remove') {
      const id = String(body && body.id || '');
      const before = donations.length;
      donations = donations.filter(d => d && d.id !== id);
      if (donations.length === before) { sendApiJson(res,404,{ok:false,error:'donation-not-found'}); return true; }
      saveDonations();
      sendApiJson(res,200,{ok:true});
      return true;
    }
    const amount = Math.round(Number(body && body.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > 1000) {
      sendApiJson(res,400,{ok:false,error:'invalid-amount'});
      return true;
    }
    const entry = {id:'DON-'+crypto.randomBytes(6).toString('hex').toUpperCase(),name:normalizeName(body && body.name || 'Anonymous'),amount,createdAt:Date.now(),verified:true};
    donations.push(entry);
    donations = donations.slice(-5000);
    saveDonations();
    log('Admin '+session.role+' verified donation '+entry.id+': '+entry.name+' $'+entry.amount);
    sendApiJson(res,200,{ok:true,donation:entry});
    return true;
  }

  if (urlPath === '/api/admin/moderate' && req.method === 'POST') {
    const session = adminSessionForRequest(req); if (!session) { sendApiJson(res,401,{ok:false,error:'admin-auth'}); return true; }
    let body; try { body = await readJsonBody(req,8192); } catch { sendApiJson(res,400,{ok:false,error:'bad-request'}); return true; }
    const action = String(body && body.action || '');
    if (action === 'unban') {
      const id = String(body.banId || ''); const before=bans.length; bans=bans.filter(b=>b.id!==id);
      if (bans.length===before) { sendApiJson(res,404,{ok:false,error:'ban-not-found'}); return true; }
      saveBans(); log(`Admin ${session.role} removed ban ${id}.`); sendApiJson(res,200,{ok:true}); return true;
    }
    if (action !== 'kick' && action !== 'ban') { sendApiJson(res,400,{ok:false,error:'unknown-action'}); return true; }
    const requestedConnectionId = String(body.targetConnectionId || '');
    const requestedName = normalizeName(body.targetName || '');
    let target = requestedConnectionId ? findClientGlobal(requestedConnectionId) : null;
    const reason = sanitizeReason(body.reason, action==='kick'?'Kicked by an administrator.':'Banned by an administrator.');
    if (action === 'kick') {
      if (!target || target.closed) { sendApiJson(res,404,{ok:false,error:'player-not-found'}); return true; }
      sendJson(target,{t:'kicked',reason});
      log(`Admin ${session.role} kicked ${target.name} (${target.connectionId}): ${reason}`);
      setTimeout(()=>closeClient(target,1008,'kicked'),180).unref?.();
      sendApiJson(res,200,{ok:true,name:target.name}); return true;
    }

    // Build 23.6: bans can be created by username even when the player is not
    // visible in the admin's current room. Search every room (including private
    // rooms) for an exact name match, then fall back to the recent-player ledger.
    const targetName = target && !target.closed ? target.name : requestedName;
    if (!targetName || targetName === 'Player' && !String(body.targetName || '').trim()) {
      sendApiJson(res,400,{ok:false,error:'player-name-required'}); return true;
    }
    const nameKey = normalizeName(targetName).toLowerCase();
    const connectedMatches = findClientsGlobalByName(targetName);
    if ((!target || target.closed) && connectedMatches.length) target = connectedMatches[0];
    const known = knownPlayerForName(targetName);

    const permanent = !!body.permanent;
    const maxDuration = 100 * 365 * 24 * 60 * 60 * 1000;
    const durationMs = Math.max(1000,Math.min(maxDuration,Number(body.durationMs)||0));
    if (!permanent && !(Number(body.durationMs)>0)) { sendApiJson(res,400,{ok:false,error:'invalid-duration'}); return true; }
    const createdAt=Date.now(), expiresAt=permanent?0:createdAt+durationMs;
    const ban={
      id:'BAN-'+crypto.randomBytes(8).toString('hex').toUpperCase(),
      name:normalizeName(targetName),
      nameKey,
      clientIdHash:(target&&target.clientId)?hashIdentity(target.clientId):(known&&known.clientIdHash||''),
      ipHash:(target&&target.ip)?hashIdentity(target.ip):(known&&known.ipHash||''),
      createdAt,expiresAt,permanent,reason,byRole:session.role
    };
    // Replace an older ban for the same exact username so one later unban fully clears it.
    bans = bans.filter(b => !(b && b.nameKey === nameKey));
    bans.push(ban); saveBans();

    // Any matching player hidden in another/private room is banned immediately.
    const ejected = [];
    for (const live of connectedMatches) {
      if (!live || live.closed) continue;
      sendJson(live,Object.assign({t:'banned',serverNow:Date.now()},publicBan(ban)));
      ejected.push(live.connectionId);
      setTimeout(()=>closeClient(live,1008,'banned'),220).unref?.();
    }
    log(`Admin ${session.role} banned ${ban.name}${permanent?' permanently':' until '+new Date(expiresAt).toISOString()}${ejected.length?' and ejected '+ejected.length+' live connection(s)':' as an offline/prospective ban'}: ${reason}`);
    sendApiJson(res,200,{ok:true,ban:publicBan(ban),offline:ejected.length===0,ejectedConnections:ejected.length}); return true;
  }
  return false;
}

let itchClientZip = null;
function buildItchClientZip() {
  if (itchClientZip) return itchClientZip;
  if (!gameHtml) throw new Error('game html unavailable');

  let itchHtml = gameHtml.toString('utf8');
  const localAssets = [
    'tiles.png','bknd.png','levelup.ogg',
    'music_theme.ogg','music_theme2.ogg','music_theme3.ogg','music_theme4.ogg',
    'balloon_pop.ogg','swap.ogg','build239-client.js'
  ];
  for (const asset of localAssets) {
    itchHtml = itchHtml.split("'/" + asset + "'").join("'" + asset + "'");
    itchHtml = itchHtml.split('"/' + asset + '"').join('"' + asset + '"');
  }

  const readme = Buffer.from(
    'Diggerz.io Reblasted Build 23.9 - itch.io client\\n' +
    'Upload this ZIP to itch.io as an HTML project.\\n' +
    'Multiplayer and admin services remain hosted on Railway.\\n',
    'utf8'
  );

  itchClientZip = buildStoredZip([
    { name: 'index.html', data: Buffer.from(itchHtml, 'utf8') },
    { name: 'tiles.png', data: tilesPng },
    { name: 'bknd.png', data: bkndPng },
    { name: 'levelup.ogg', data: levelupOgg },
    { name: 'music_theme.ogg', data: musicOgg[0] },
    { name: 'music_theme2.ogg', data: musicOgg[1] },
    { name: 'music_theme3.ogg', data: musicOgg[2] },
    { name: 'music_theme4.ogg', data: musicOgg[3] },
    { name: 'balloon_pop.ogg', data: balloonPopOgg },
    { name: 'swap.ogg', data: swapOgg },
    { name: 'build239-client.js', data: build239ClientJs },
    { name: 'README.txt', data: readme }
  ]);
  return itchClientZip;
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(req,res);
  const urlPath = String(req.url || '/').split('?')[0];
  if (urlPath.startsWith('/api/admin/')) {
    if (!applyAdminCors(req,res)) { sendApiJson(res,403,{ok:false,error:'forbidden'}); return; }
    if (req.method === 'OPTIONS') { res.writeHead(204,{'Cache-Control':'no-store'}); res.end(); return; }
    if (await handleAdminApi(req,res,urlPath)) return;
  }
  if (urlPath === '/api/donations') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'no-store'});
      res.end();
      return;
    }
    if (req.method !== 'GET') { sendApiJson(res,405,{ok:false,error:'method-not-allowed'}); return; }
    res.setHeader('Access-Control-Allow-Origin','*');
    sendApiJson(res,200,Object.assign({ok:true},publicDonationBoard()));
    return;
  }

  if (urlPath === '/itch-build-23.9.zip') {
    try {
      const body = buildItchClientZip();
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="Diggerz-Reblasted-Build-23.9-itch.zip"',
        'Content-Length': body.length,
        'Cache-Control': 'no-store'
      });
      res.end(body);
    } catch (error) {
      console.error('[Diggerz] itch build ZIP failed:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Unable to build the itch.io client ZIP.\\n');
    }
    return;
  }
  if (urlPath === '/banned') { const body=Buffer.from(banPageHtml(),'utf8'); res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store'}); res.end(body); return; }
  if (urlPath === '/') {
    if (!gameHtml) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Diggerz game file is missing on the server.\n');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': gameHtml.length,
      'Cache-Control': 'no-store'
    });
    res.end(gameHtml);
    return;
  }
  if (urlPath === '/build239-client.js') { serveBuffer(res,build239ClientJs,'application/javascript; charset=utf-8'); return; }
  if (urlPath === '/map-editor' || urlPath === '/map-editor.html') { serveBuffer(res,mapEditorHtml,'text/html; charset=utf-8'); return; }
  if (urlPath === '/tiles.png') { serveBuffer(res,tilesPng,'image/png'); return; }
  if (urlPath === '/bknd.png') { serveBuffer(res,bkndPng,'image/png'); return; }
  if (urlPath === '/levelup.ogg') { serveBuffer(res,levelupOgg,'audio/ogg'); return; }
  if (urlPath === '/music_theme.ogg') { serveBuffer(res,musicOgg[0],'audio/ogg'); return; }
  if (urlPath === '/music_theme2.ogg') { serveBuffer(res,musicOgg[1],'audio/ogg'); return; }
  if (urlPath === '/music_theme3.ogg') { serveBuffer(res,musicOgg[2],'audio/ogg'); return; }
  if (urlPath === '/music_theme4.ogg') { serveBuffer(res,musicOgg[3],'audio/ogg'); return; }
  if (urlPath === '/balloon_pop.ogg') { serveBuffer(res,balloonPopOgg,'audio/ogg'); return; }
  if (urlPath === '/swap.ogg') { serveBuffer(res,swapOgg,'audio/ogg'); return; }
  if (urlPath === '/health') {
    const body = JSON.stringify({
      ok: true,
      service: 'diggerz-build23.9-server',
      build: BUILD,
      rooms: rooms.size,
      players: [...rooms.values()].reduce((sum, room) => sum + room.clients.size, 0),
      maxPlayersPerRoom: MAX_ROOM_PLAYERS,
      activeBans: bans.filter(b=>b.permanent||b.expiresAt>Date.now()).length,
      transientPacketsDropped: [...rooms.values()].reduce((sum,room)=>sum+[...room.clients].reduce((n,c)=>n+(c.droppedTransient||0),0),0),
      battleMaps: ['Default Map',...customBattleMaps.map(m=>m.name)],
      time: nowIso()
    }, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(body);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Diggerz server: not found\n');
});

server.on('upgrade', (req, socket) => {
  const upgrade = String(req.headers.upgrade || '').toLowerCase();
  const key = req.headers['sec-websocket-key'];
  const version = req.headers['sec-websocket-version'];

  if (upgrade !== 'websocket' || !key || version !== '13') {
    socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '\r\n'
  ].join('\r\n'));

  const client = {
    socket,
    ip: getRemoteIp(req),
    clientId: '',
    lastNativeMovementRelayAt: 0,
    droppedTransient: 0,
    connectionId: `C${String(nextConnectionNumber++).padStart(4, '0')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    buffer: Buffer.alloc(0),
    room: null,
    roomCode: null,
    mode: null,
    name: 'Player',
    closed: false,
    lastPong: Date.now(),
    rateWindow: Date.now(),
    rateCount: 0,
    binaryRateWindow: Date.now(),
    binaryRateCount: 0,
    trade: null,
    pvpHealth: 3, alive: true, eliminated: false, kills: 0, shots: 0, hits: 0,
    position: {x:12,y:2}, aim: {x:12,y:16}, lastAttackerConnectionId: '', lastDamagedAt: 0
  };

  socket.setNoDelay(true);
  socket.setKeepAlive(true, 30000);
  socket.on('data', chunk => parseFrames(client, chunk));
  socket.on('close', () => closeClient(client, 1000, 'socket closed'));
  socket.on('end', () => closeClient(client, 1000, 'socket ended'));
  socket.on('error', error => {
    log(`${client.connectionId} socket error:`, error.message);
    closeClient(client, 1011, 'socket error');
  });

  sendJson(client, {
    t: 'server-hello',
    server: 'Diggerz Build 23.9 Reblasted Multiplayer + Battle Royale Server',
    protocol: 1,
    maxPlayersPerRoom: MAX_ROOM_PLAYERS
  });
  log(`${client.connectionId} WebSocket connected from ${socket.remoteAddress || 'unknown'}.`);
});

const battleClock = setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) { battleTick(room, now); specialWorldTick(room, now); }
}, 200);
battleClock.unref();

const rosterClock = setInterval(() => {
  // Presence snapshots let clients reconcile a missed peer-left message and
  // remove ghost avatars without waiting for another player to join.
  for (const room of rooms.values()) broadcastRoster(room);
}, ROSTER_INTERVAL_MS);
rosterClock.unref();

const heartbeat = setInterval(() => {
  const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;
  for (const room of rooms.values()) {
    for (const client of room.clients) {
      if (client.lastPong < cutoff) {
        closeClient(client, 1001, 'heartbeat timeout');
        continue;
      }
      try { client.socket.write(encodeFrame(Buffer.from(String(Date.now())), 0x9)); } catch {}
    }
  }
}, HEARTBEAT_INTERVAL_MS);
heartbeat.unref();

server.listen(PORT, HOST, () => {
  log(`Diggerz multiplayer server listening on ${HOST}:${PORT}`);
  log(`Local client URL: ws://127.0.0.1:${PORT}`);

  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const info of entries || []) {
      if (info.family === 'IPv4' && !info.internal) {
        log(`LAN client URL:   ws://${info.address}:${PORT}`);
      }
    }
  }
  log(`Health check: http://127.0.0.1:${PORT}/health`);
  log(`Battle map pool (random per new room): Default Map${customBattleMaps.length ? ' + ' + customBattleMaps.map(m=>m.name).join(' + ') : ''}`);
});

function shutdown(signal) {
  log(`${signal}: shutting down.`);
  for (const room of rooms.values()) {
    for (const client of room.clients) closeClient(client, 1001, 'server shutdown');
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
